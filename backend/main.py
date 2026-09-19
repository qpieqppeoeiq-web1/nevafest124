from contextlib import asynccontextmanager
from datetime import datetime
import logging
import os
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import select, or_, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from aiogram.types import Update

from backend.config import settings
from backend.database import get_db, init_db
from backend.models import User, Task, Message, ProgressBar
from backend.schemas import (
    UserOut,
    UserUpdateTags,
    TaskCreate,
    TaskUpdateStatus,
    TaskOut,
    MessageCreate,
    MessageOut,
    ProgressBarCreate,
    ProgressBarOut,
    VerifyRoleRequest,
    VerifyRoleResponse,
    SupabaseConfigOut,
)
from backend.auth import get_current_user_from_headers
from backend.bot import bot, dp, send_task_notification

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Жизненный цикл FastAPI: инициализация базы данных и webhook aiogram"""
    logger.info("Запуск приложения Festival Task Manager...")
    await init_db()

    # Настройка Telegram Webhook
    if bot and settings.WEBHOOK_URL:
        webhook_path = "/webhook"
        full_webhook_url = f"{settings.WEBHOOK_URL.rstrip('/')}{webhook_path}"
        try:
            logger.info(f"Установка Telegram webhook: {full_webhook_url}")
            await bot.set_webhook(
                url=full_webhook_url,
                drop_pending_updates=True,
                allowed_updates=dp.resolve_used_update_types(),
            )
            logger.info("Telegram Webhook успешно установлен.")
        except Exception as e:
            logger.error(f"Ошибка при установке Telegram webhook: {e}")
    else:
        logger.info("BOT_TOKEN или WEBHOOK_URL не заданы. Webhook отключен.")

    yield

    # Корректное завершение работы бота
    if bot:
        logger.info("Удаление Telegram webhook и закрытие сессии бота...")
        try:
            await bot.delete_webhook()
            await bot.session.close()
        except Exception as e:
            logger.error(f"Ошибка при закрытии сессии бота: {e}")


app = FastAPI(
    title="Festival Task Manager WebApp API",
    description="Бэкенд и Telegram Web App для координации фестиваля",
    lifespan=lifespan,
)

# CORS для локальной разработки и работы Web App внутри Telegram
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Эндпоинт Webhook для Telegram Bot ---
@app.post("/webhook")
async def telegram_webhook(update_data: dict):
    """Принимает входящие обновления от Telegram через webhook (экономия ресурсов на Render)"""
    if not bot:
        raise HTTPException(status_code=503, detail="Бот не инициализирован")

    update_obj = Update.model_validate(update_data, context={"bot": bot})
    await dp.feed_update(bot, update_obj)
    return {"ok": True}


# --- Health Check ---
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "festival-task-manager", "timestamp": datetime.utcnow().isoformat()}


# --- Supabase Storage Config (для фронтенда) ---
@app.get("/api/config/supabase", response_model=SupabaseConfigOut)
async def get_supabase_config():
    """Передаёт безопасные публичные параметры Supabase Storage клиенту Web App"""
    return SupabaseConfigOut(
        supabase_url=settings.SUPABASE_URL,
        supabase_anon_key=settings.SUPABASE_ANON_KEY,
        supabase_bucket=settings.SUPABASE_BUCKET,
    )


# --- Проверка роли по паролю ---
@app.post("/api/auth/verify-role", response_model=VerifyRoleResponse)
async def verify_role(payload: VerifyRoleRequest):
    """
    Проверяет пароли:
    1965 -> Организатор
    19907 -> Главный администратор
    """
    if payload.password == settings.ADMIN_PASSWORD:
        return VerifyRoleResponse(
            success=True,
            role="admin",
            message="Доступ главного администратора подтверждён",
        )
    elif payload.password == settings.ORGANIZER_PASSWORD:
        return VerifyRoleResponse(
            success=True,
            role="organizer",
            message="Доступ организатора подтверждён",
        )
    return VerifyRoleResponse(
        success=False,
        role=None,
        message="Неверный пароль доступа",
    )


# --- Пользователи и теги ---
@app.get("/api/users", response_model=List[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)):
    """Возвращает список всех зарегистрированных пользователей для назначения задач и тегов"""
    result = await db.execute(select(User).order_by(User.username))
    return result.scalars().all()


@app.post("/api/users/{user_id}/tags", response_model=UserOut)
async def update_user_tags(
    user_id: int,
    payload: UserUpdateTags,
    db: AsyncSession = Depends(get_db),
):
    """Присваивает теги (например, 'звук', 'одежда', 'журнал') пользователю"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        # Если пользователь ещё не писал боту, создаём запись
        user = User(id=user_id, username=f"user_{user_id}", role="volunteer", tags=payload.tags)
        db.add(user)
    else:
        user.tags = payload.tags

    await db.commit()
    await db.refresh(user)
    return user


# --- Задачи ---
@app.get("/api/tasks", response_model=List[TaskOut])
async def get_tasks(
    role: str = "volunteer",
    user_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Возвращает список активных задач (не в архиве).
    - Для волонтёра: только задания, назначенные ему лично или его тегам.
    - Для организатора / администратора: все активные задания.
    """
    query = select(Task).where(Task.status != "completed").order_by(Task.created_at.desc())
    result = await db.execute(query)
    all_tasks = result.scalars().all()

    if role in ["admin", "organizer"]:
        return all_tasks

    # Если волонтёр — фильтруем по назначению или совпадающим тегам
    if not user_id:
        return all_tasks

    # Получаем теги волонтёра
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    user_tags = set(user.tags) if user and user.tags else set()

    filtered = []
    for task in all_tasks:
        is_assigned_user = user_id in (task.assigned_to or [])
        has_matching_tag = bool(set(task.tags or []) & user_tags)
        # Если задача не привязана ни к кому конкретно, показываем всем волонтёрам
        is_unassigned = not task.assigned_to and not task.tags

        if is_assigned_user or has_matching_tag or is_unassigned:
            filtered.append(task)

    return filtered


@app.post("/api/tasks", response_model=TaskOut)
async def create_task(
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_from_headers),
):
    """
    Создание карточки задания (доступно администратору).
    Изображение предварительно загружено на фронтенде в Supabase Storage,
    сюда передаётся только публичный URL (payload.image_url).
    """
    task = Task(
        title=payload.title,
        description=payload.description,
        urgency_color=payload.urgency_color,
        links=payload.links,
        image_url=payload.image_url,
        status="new",
        assigned_to=payload.assigned_to,
        tags=payload.tags,
        created_by=current_user.get("id"),
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    # Определяем, каким пользователям слать уведомления в Telegram
    target_user_ids = set(payload.assigned_to or [])

    # Если заданы теги, находим пользователей с этими тегами
    if payload.tags:
        users_result = await db.execute(select(User))
        all_users = users_result.scalars().all()
        for u in all_users:
            if set(u.tags or []) & set(payload.tags):
                target_user_ids.add(u.id)

    # Отправляем уведомления через бота
    if target_user_ids:
        await send_task_notification(
            user_ids=list(target_user_ids),
            task_id=task.id,
            title=task.title,
            urgency_color=task.urgency_color,
            description=task.description,
            tags=task.tags,
        )

    return task


@app.patch("/api/tasks/{task_id}/status", response_model=TaskOut)
async def update_task_status(
    task_id: int,
    payload: TaskUpdateStatus,
    db: AsyncSession = Depends(get_db),
):
    """
    Изменение статуса задания: 'new', 'in_progress', 'completed'.
    При переходе в 'completed' фиксируется время завершения.
    """
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Задание не найдено")

    task.status = payload.status
    if payload.status == "completed":
        task.completed_at = datetime.utcnow()
    else:
        task.completed_at = None

    await db.commit()
    await db.refresh(task)
    return task


# --- Архив выполненных заданий (только для админа) ---
@app.get("/api/archive", response_model=List[TaskOut])
async def get_archive(db: AsyncSession = Depends(get_db)):
    """Возвращает архив завершённых заданий"""
    result = await db.execute(
        select(Task).where(Task.status == "completed").order_by(Task.completed_at.desc())
    )
    return result.scalars().all()


# --- Ветка сообщений под заданием ---
@app.get("/api/tasks/{task_id}/messages", response_model=List[MessageOut])
async def get_task_messages(task_id: int, db: AsyncSession = Depends(get_db)):
    """Получить сообщения в обсуждении карточки задания"""
    result = await db.execute(
        select(Message).where(Message.task_id == task_id).order_by(Message.created_at.asc())
    )
    return result.scalars().all()


@app.post("/api/tasks/{task_id}/messages", response_model=MessageOut)
async def post_task_message(
    task_id: int,
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user_from_headers),
):
    """Отправить сообщение администратору / координаторам в обсуждении задания"""
    # Проверяем существование задачи
    t_res = await db.execute(select(Task).where(Task.id == task_id))
    if not t_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Задание не найдено")

    msg = Message(
        task_id=task_id,
        user_id=current_user.get("id", 0),
        username=current_user.get("username") or current_user.get("first_name", "Участник"),
        text=payload.text,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


# --- Прогресс-бары (глобальные задачи) ---
@app.get("/api/progress-bars", response_model=List[ProgressBarOut])
async def get_progress_bars(db: AsyncSession = Depends(get_db)):
    """
    Возвращает список прогресс-баров.
    Степень заполнения вычисляется динамически по количеству завершённых заданий
    с соответствующими тегами.
    """
    pb_res = await db.execute(select(ProgressBar).order_by(ProgressBar.id.asc()))
    progress_bars = pb_res.scalars().all()

    # Получаем все завершённые задачи
    completed_tasks_res = await db.execute(select(Task).where(Task.status == "completed"))
    completed_tasks = completed_tasks_res.scalars().all()

    out = []
    for pb in progress_bars:
        pb_tags = set(pb.tags or [])
        completed_count = 0
        for task in completed_tasks:
            # Если теги задачи пересекаются с тегами прогресс-бара
            if set(task.tags or []) & pb_tags:
                completed_count += 1

        target = max(pb.target_count, 1)
        percent = min(100, int((completed_count / target) * 100))
        out.append(
            ProgressBarOut(
                id=pb.id,
                title=pb.title,
                tags=pb.tags or [],
                target_count=pb.target_count,
                completed_count=completed_count,
                percent=percent,
            )
        )

    return out


@app.post("/api/progress-bars", response_model=ProgressBarOut)
async def create_progress_bar(
    payload: ProgressBarCreate,
    db: AsyncSession = Depends(get_db),
):
    """Создание нового прогресс-бара администратором"""
    pb = ProgressBar(
        title=payload.title,
        tags=payload.tags,
        target_count=payload.target_count,
    )
    db.add(pb)
    await db.commit()
    await db.refresh(pb)

    return ProgressBarOut(
        id=pb.id,
        title=pb.title,
        tags=pb.tags or [],
        target_count=pb.target_count,
        completed_count=0,
        percent=0,
    )


# --- Раздача статики фронтенда ---
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.isdir(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_frontend_files(full_path: str):
        file_path = os.path.join(frontend_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dir, "index.html"))
