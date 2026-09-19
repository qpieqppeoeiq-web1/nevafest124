import logging
from typing import List, Optional
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from sqlalchemy import select
from backend.config import settings
from backend.database import AsyncSessionLocal
from backend.models import User

logger = logging.getLogger(__name__)

# Инициализируем aiogram Bot и Dispatcher
bot: Optional[Bot] = None
dp = Dispatcher()

if settings.BOT_TOKEN:
    bot = Bot(token=settings.BOT_TOKEN)


@dp.message(CommandStart())
async def handle_start(message: types.Message):
    """
    Обработка команды /start:
    1. Регистрирует или обновляет пользователя в БД PostgreSQL.
    2. Отправляет приветствие с кнопкой для запуска Telegram Web App.
    """
    tg_user = message.from_user
    if not tg_user:
        return

    # Сохраняем пользователя в базу данных
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

    # Ссылка на веб-приложение
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
        f"Привет, {tg_user.first_name or tg_user.username or 'друг'}! 👋\n\n"
        f"Добро пожаловать в систему управления задачами фестиваля.\n\n"
        f"Нажми кнопку ниже, чтобы открыть интерактивное мини-приложение, "
        f"просматривать назначенные задания, изменять их статусы и общаться с координаторами."
    )

    await message.answer(welcome_text, reply_markup=keyboard)


async def send_task_notification(
    user_ids: List[int],
    task_id: int,
    title: str,
    urgency_color: str,
    description: Optional[str] = "",
    tags: Optional[List[str]] = None,
):
    """
    Отправляет персональное уведомление в Telegram назначенным пользователям при создании нового задания.
    """
    if not bot:
        logger.warning("Бот не инициализирован (отсутствует BOT_TOKEN). Уведомление пропущено.")
        return

    urgency_emoji = {
        "red": "🔴 Срочно",
        "yellow": "🟡 Средняя срочность",
        "green": "🟢 Обычная срочность",
    }.get(urgency_color, "⚪")

    tags_str = ", ".join([f"#{t}" for t in (tags or [])])
    base_url = settings.WEBHOOK_URL.rstrip("/") if settings.WEBHOOK_URL else "https://localhost:8000"
    webapp_url = f"{base_url}/"

    text = (
        f"⚡ <b>Вам назначено новое задание!</b>\n\n"
        f"📌 <b>{title}</b>\n"
        f"Срочность: {urgency_emoji}\n"
    )
    if tags_str:
        text += f"Теги: {tags_str}\n"
    if description:
        text += f"\n<i>{description[:200]}</i>\n"

    text += "\nПерейдите в Web App для подробностей и смены статуса."

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="👀 Открыть задание",
                    web_app=WebAppInfo(url=webapp_url),
                )
            ]
        ]
    )

    for uid in user_ids:
        try:
            await bot.send_message(
                chat_id=uid,
                text=text,
                parse_mode="HTML",
                reply_markup=keyboard,
            )
        except Exception as e:
            logger.error(f"Не удалось отправить уведомление пользователю {uid}: {e}")
