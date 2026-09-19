import { ProjectFile } from './types';

export const projectFiles: ProjectFile[] = [
  {
    path: 'backend/main.py',
    name: 'main.py',
    language: 'python',
    category: 'backend',
    description: 'FastAPI приложение, эндпоинты задач, ролей, сообщений, тегов, Supabase config и раздача статики',
    content: `from contextlib import asynccontextmanager
from datetime import datetime
import logging
import os
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from aiogram.types import Update

from backend.config import settings
from backend.database import get_db, init_db
from backend.models import User, Task, Message, ProgressBar
from backend.schemas import (
    UserOut, UserUpdateTags, TaskCreate, TaskUpdateStatus, TaskOut,
    MessageCreate, MessageOut, ProgressBarCreate, ProgressBarOut,
    VerifyRoleRequest, VerifyRoleResponse, SupabaseConfigOut,
)
from backend.auth import get_current_user_from_headers
from backend.bot import bot, dp, send_task_notification

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Инициализация БД и установка webhook для aiogram"""
    await init_db()
    if bot and settings.WEBHOOK_URL:
        webhook_url = f"{settings.WEBHOOK_URL.rstrip('/')}/webhook"
        try:
            await bot.set_webhook(
                url=webhook_url,
                drop_pending_updates=True,
                allowed_updates=dp.resolve_used_update_types(),
            )
            logger.info("Telegram Webhook установлен")
        except Exception as e:
            logger.error(f"Ошибка установки webhook: {e}")
    yield
    if bot:
        try:
            await bot.delete_webhook()
            await bot.session.close()
        except Exception as e:
            logger.error(f"Ошибка закрытия сессии бота: {e}")

app = FastAPI(title="Festival Task Manager", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/webhook")
async def telegram_webhook(update_data: dict):
    if not bot:
        raise HTTPException(status_code=503, detail="Бот не настроен")
    update_obj = Update.model_validate(update_data, context={"bot": bot})
    await dp.feed_update(bot, update_obj)
    return {"ok": True}

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.get("/api/config/supabase", response_model=SupabaseConfigOut)
async def get_supabase_config():
    return SupabaseConfigOut(
        supabase_url=settings.SUPABASE_URL,
        supabase_anon_key=settings.SUPABASE_ANON_KEY,
        supabase_bucket=settings.SUPABASE_BUCKET,
    )

@app.post("/api/auth/verify-role", response_model=VerifyRoleResponse)
async def verify_role(payload: VerifyRoleRequest):
    if payload.password == settings.ADMIN_PASSWORD:
        return VerifyRoleResponse(success=True, role="admin", message="Доступ главного администратора")
    elif payload.password == settings.ORGANIZER_PASSWORD:
        return VerifyRoleResponse(success=True, role="organizer", message="Доступ организатора")
    return VerifyRoleResponse(success=False, role=None, message="Неверный пароль")

@app.get("/api/users", response_model=List[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.username))
    return result.scalars().all()

@app.post("/api/users/{user_id}/tags", response_model=UserOut)
async def update_user_tags(user_id: int, payload: UserUpdateTags, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        user = User(id=user_id, username=f"user_{user_id}", role="volunteer", tags=payload.tags)
        db.add(user)
    else:
        user.tags = payload.tags
    await db.commit()
    await db.refresh(user)
    return user

@app.get("/api/tasks", response_model=List[TaskOut])
async def get_tasks(role: str = "volunteer", user_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    query = select(Task).where(Task.status != "completed").order_by(Task.created_at.desc())
    result = await db.execute(query)
    all_tasks = result.scalars().all()
    if role in ["admin", "organizer"] or not user_id:
        return all_tasks
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    user_tags = set(user.tags) if user and user.tags else set()
    return [t for t in all_tasks if user_id in (t.assigned_to or []) or bool(set(t.tags or []) & user_tags) or (not t.assigned_to and not t.tags)]

@app.post("/api/tasks", response_model=TaskOut)
async def create_task(payload: TaskCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user_from_headers)):
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
    target_users = set(payload.assigned_to or [])
    if payload.tags:
        all_u = (await db.execute(select(User))).scalars().all()
        for u in all_u:
            if set(u.tags or []) & set(payload.tags):
                target_users.add(u.id)
    if target_users:
        await send_task_notification(list(target_users), task.id, task.title, task.urgency_color, task.description, task.tags)
    return task

@app.patch("/api/tasks/{task_id}/status", response_model=TaskOut)
async def update_task_status(task_id: int, payload: TaskUpdateStatus, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    task.status = payload.status
    task.completed_at = datetime.utcnow() if payload.status == "completed" else None
    await db.commit()
    await db.refresh(task)
    return task

@app.get("/api/archive", response_model=List[TaskOut])
async def get_archive(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).where(Task.status == "completed").order_by(Task.completed_at.desc()))
    return result.scalars().all()

@app.get("/api/tasks/{task_id}/messages", response_model=List[MessageOut])
async def get_task_messages(task_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Message).where(Message.task_id == task_id).order_by(Message.created_at.asc()))
    return result.scalars().all()

@app.post("/api/tasks/{task_id}/messages", response_model=MessageOut)
async def post_task_message(task_id: int, payload: MessageCreate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user_from_headers)):
    msg = Message(task_id=task_id, user_id=current_user.get("id", 0), username=current_user.get("username") or current_user.get("first_name", "Участник"), text=payload.text)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg

@app.get("/api/progress-bars", response_model=List[ProgressBarOut])
async def get_progress_bars(db: AsyncSession = Depends(get_db)):
    pbs = (await db.execute(select(ProgressBar).order_by(ProgressBar.id.asc()))).scalars().all()
    completed = (await db.execute(select(Task).where(Task.status == "completed"))).scalars().all()
    res = []
    for pb in pbs:
        c_count = sum(1 for t in completed if set(t.tags or []) & set(pb.tags or []))
        pct = min(100, int((c_count / max(pb.target_count, 1)) * 100))
        res.append(ProgressBarOut(id=pb.id, title=pb.title, tags=pb.tags or [], target_count=pb.target_count, completed_count=c_count, percent=pct))
    return res

@app.post("/api/progress-bars", response_model=ProgressBarOut)
async def create_progress_bar(payload: ProgressBarCreate, db: AsyncSession = Depends(get_db)):
    pb = ProgressBar(title=payload.title, tags=payload.tags, target_count=payload.target_count)
    db.add(pb)
    await db.commit()
    await db.refresh(pb)
    return ProgressBarOut(id=pb.id, title=pb.title, tags=pb.tags or [], target_count=pb.target_count, completed_count=0, percent=0)
`,
  },
  {
    path: 'backend/bot.py',
    name: 'bot.py',
    language: 'python',
    category: 'backend',
    description: 'aiogram 3 бот: обработчик команды /start, кнопка WebApp и уведомления волонтёров',
    content: `import logging
from typing import List, Optional
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from sqlalchemy import select
from backend.config import settings
from backend.database import AsyncSessionLocal
from backend.models import User

logger = logging.getLogger(__name__)

bot: Optional[Bot] = Bot(token=settings.BOT_TOKEN) if settings.BOT_TOKEN else None
dp = Dispatcher()

@dp.message(CommandStart())
async def handle_start(message: types.Message):
    tg_user = message.from_user
    if not tg_user:
        return

    # Сохраняем/обновляем пользователя в PostgreSQL
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.id == tg_user.id))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                id=tg_user.id,
                username=tg_user.username,
                first_name=tg_user.first_name,
                role="volunteer",
                tags=["общий"],
            )
            session.add(user)
        else:
            user.username = tg_user.username
            user.first_name = tg_user.first_name
        await session.commit()

    base_url = settings.WEBHOOK_URL.rstrip("/") if settings.WEBHOOK_URL else "https://localhost:8000"
    webapp_url = f"{base_url}/"

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🎪 Открыть задачи фестиваля",
                    web_app=WebAppInfo(url=webapp_url),
                )
            ]
        ]
    )

    welcome_text = (
        f"Привет, {tg_user.first_name or tg_user.username or 'друг'}! 👋\\n\\n"
        f"Добро пожаловать в систему координации фестиваля.\\n\\n"
        f"Нажми кнопку ниже, чтобы открыть интерактивное мини-приложение, "
        f"просматривать назначенные задачи, отмечать статусы и задавать вопросы координаторам."
    )

    await message.answer(welcome_text, reply_markup=keyboard)

async def send_task_notification(user_ids: List[int], task_id: int, title: str, urgency_color: str, description: str = "", tags: List[str] = None):
    if not bot:
        return

    urgency_emoji = {"red": "🔴 Срочно", "yellow": "🟡 Внимание", "green": "🟢 Обычная"}.get(urgency_color, "⚪")
    tags_str = ", ".join([f"#{t}" for t in (tags or [])])
    base_url = settings.WEBHOOK_URL.rstrip("/") if settings.WEBHOOK_URL else "https://localhost:8000"

    text = f"⚡ <b>Вам назначено новое фестивальное задание!</b>\\n\\n📌 <b>{title}</b>\\nСрочность: {urgency_emoji}\\n"
    if tags_str:
        text += f"Теги: {tags_str}\\n"
    if description:
        text += f"\\n<i>{description[:200]}</i>\\n"

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="👀 Открыть задание", web_app=WebAppInfo(url=f"{base_url}/"))]]
    )

    for uid in user_ids:
        try:
            await bot.send_message(chat_id=uid, text=text, parse_mode="HTML", reply_markup=keyboard)
        except Exception as e:
            logger.error(f"Ошибка отправки уведомления {uid}: {e}")
`,
  },
  {
    path: 'backend/models.py',
    name: 'models.py',
    language: 'python',
    category: 'backend',
    description: 'Модели базы данных PostgreSQL: User, Task, Message, ProgressBar',
    content: `from datetime import datetime
from sqlalchemy import Column, Integer, BigInteger, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(BigInteger, primary_key=True, index=True) # Telegram ID
    username = Column(String, nullable=True, index=True)
    first_name = Column(String, nullable=True)
    role = Column(String, default="volunteer") # volunteer, organizer, admin
    tags = Column(JSON, default=list) # ["звук", "одежда", "журнал"]
    created_at = Column(DateTime, default=datetime.utcnow)

class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    urgency_color = Column(String, default="green") # red, yellow, green
    links = Column(JSON, default=list)
    image_url = Column(String, nullable=True) # Ссылка на файл в Supabase Storage
    status = Column(String, default="new") # new, in_progress, completed
    assigned_to = Column(JSON, default=list) # [Telegram ID...]
    tags = Column(JSON, default=list) # ["звук", "сцена"]
    created_by = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    messages = relationship("Message", back_populates="task", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(BigInteger, nullable=False)
    username = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    task = relationship("Task", back_populates="messages")

class ProgressBar(Base):
    __tablename__ = "progress_bars"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String, nullable=False)
    tags = Column(JSON, default=list)
    target_count = Column(Integer, default=5)
    created_at = Column(DateTime, default=datetime.utcnow)
`,
  },
  {
    path: 'backend/auth.py',
    name: 'auth.py',
    language: 'python',
    category: 'backend',
    description: 'Валидация Telegram.WebApp.initData с использованием HMAC-SHA256 по спецификации Telegram',
    content: `import hashlib
import hmac
import json
import urllib.parse
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from backend.config import settings

def parse_and_validate_telegram_init_data(init_data_str: str) -> Optional[Dict[str, Any]]:
    """Валидация initData по спецификации Telegram с секретным ключом BOT_TOKEN"""
    if not init_data_str:
        return None
    try:
        parsed_data = dict(urllib.parse.parse_qsl(init_data_str, keep_blank_values=True))
    except Exception:
        return None

    received_hash = parsed_data.pop("hash", None)
    if not received_hash:
        return None

    data_check_string = "\\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))
    if settings.BOT_TOKEN:
        secret_key = hmac.new(b"WebAppData", settings.BOT_TOKEN.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(calculated_hash, received_hash):
            return None

    user_raw = parsed_data.get("user")
    if user_raw:
        try:
            parsed_data["user"] = json.loads(user_raw)
        except Exception:
            pass
    return parsed_data

def get_current_user_from_headers(x_telegram_init_data: Optional[str] = Header(None, alias="X-Telegram-Init-Data")):
    if not x_telegram_init_data:
        return {"id": 999999999, "username": "guest_tester", "first_name": "Тестовый волонтёр"}
    validated = parse_and_validate_telegram_init_data(x_telegram_init_data)
    if not validated or "user" not in validated:
        if settings.BOT_TOKEN:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверная сессия Telegram initData")
        return {"id": 999999999, "username": "local_dev", "first_name": "Dev"}
    return validated["user"]
`,
  },
  {
    path: 'frontend/app.js',
    name: 'app.js',
    language: 'javascript',
    category: 'frontend',
    description: 'Фронтенд логика: Telegram SDK, Supabase JS Storage загрузка, роли, задачи, чат, теги',
    content: `// Инициализация Telegram WebApp
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// Загрузка фото в Supabase Storage
async function uploadToSupabase(file) {
  const cfg = await (await fetch('/api/config/supabase')).json();
  const supabase = window.supabase.createClient(cfg.supabase_url, cfg.supabase_anon_key);
  const fileName = \`\${Date.now()}_\${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}\`;
  
  const { data, error } = await supabase.storage
    .from(cfg.supabase_bucket || 'festival-tasks')
    .upload(\`tasks/\${fileName}\`, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });
  if (error) throw error;
  
  const { data: urlData } = supabase.storage
    .from(cfg.supabase_bucket || 'festival-tasks')
    .getPublicUrl(\`tasks/\${fileName}\`);
  return urlData.publicUrl;
}

// Смена пароля (1965 -> Организатор, 19907 -> Админ)
async function verifyRolePassword(password) {
  const res = await fetch('/api/auth/verify-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  return await res.json();
}
`,
  },
  {
    path: 'render.yaml',
    name: 'render.yaml',
    language: 'yaml',
    category: 'deploy',
    description: 'Render Blueprint для развертывания веб-сервиса и базы данных PostgreSQL',
    content: `services:
  - type: web
    name: festival-task-manager
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
    plan: free
    healthCheckPath: /api/health
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.8
      - key: BOT_TOKEN
        sync: false
      - key: WEBHOOK_URL
        sync: false
      - key: ORGANIZER_PASSWORD
        value: "1965"
      - key: ADMIN_PASSWORD
        value: "19907"
      - key: DATABASE_URL
        fromDatabase:
          name: festival-db
          property: connectionString
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: SUPABASE_BUCKET
        value: "festival-tasks"

databases:
  - name: festival-db
    plan: free
    databaseName: festival
    user: festival_user
`,
  },
  {
    path: 'Dockerfile',
    name: 'Dockerfile',
    language: 'dockerfile',
    category: 'deploy',
    description: 'Оптимизированный контейнер Python 3.11-slim для Render и Cloud Run',
    content: `FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential curl && \\
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \\
    pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY frontend/ ./frontend/

ENV PYTHONUNBUFFERED=1
ENV PORT=8000
EXPOSE 8000

CMD uvicorn backend.main:app --host 0.0.0.0 --port \${PORT:-8000}
`,
  },
  {
    path: 'requirements.txt',
    name: 'requirements.txt',
    language: 'text',
    category: 'deploy',
    description: 'Python зависимости проекта',
    content: `fastapi>=0.110.0
uvicorn[standard]>=0.28.0
aiogram>=3.4.1
sqlalchemy>=2.0.28
asyncpg>=0.29.0
pydantic>=2.6.4
pydantic-settings>=2.2.1
python-dotenv>=1.0.1
aiohttp>=3.9.3
`,
  },
  {
    path: '.env.example',
    name: '.env.example',
    language: 'bash',
    category: 'deploy',
    description: 'Шаблон переменных окружения со всеми секретами и ключами',
    content: `# Telegram Bot
BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
WEBHOOK_URL=https://your-festival-app.onrender.com

# Пароли доступа
ORGANIZER_PASSWORD=1965
ADMIN_PASSWORD=19907

# PostgreSQL
DATABASE_URL=postgresql+asyncpg://postgres:password@db.supabase.co:5432/postgres

# Supabase Storage
SUPABASE_URL=https://xyzcompany.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_BUCKET=festival-tasks

PORT=8000
HOST=0.0.0.0
`,
  },
  {
    path: 'README.md',
    name: 'README.md',
    language: 'markdown',
    category: 'docs',
    description: 'Полное руководство по архитектуре, настройке Supabase RLS и деплою на Render',
    content: `# Настройка Supabase Storage (RLS SQL):
CREATE POLICY "Public Read Access" ON storage.objects
FOR SELECT USING (bucket_id = 'festival-tasks');

CREATE POLICY "Allow Uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'festival-tasks');

# Деплой на Render:
1. Создать бота в @BotFather, получить BOT_TOKEN
2. Создать БД PostgreSQL на Render
3. Подключить репозиторий через Blueprint (render.yaml) или создать Web Service
4. Указать переменные окружения BOT_TOKEN, WEBHOOK_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_BUCKET
`,
  },
];
