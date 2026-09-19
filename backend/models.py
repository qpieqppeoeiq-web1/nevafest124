from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Text,
    DateTime,
    JSON,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from backend.database import Base


class User(Base):
    """Модель пользователя (волонтёр или организатор/админ)"""
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True)  # Telegram User ID
    username = Column(String, nullable=True, index=True)
    first_name = Column(String, nullable=True)
    role = Column(String, default="volunteer")  # volunteer, organizer, admin
    tags = Column(JSON, default=list)  # Список тегов: ["звук", "одежда", "журнал"]
    created_at = Column(DateTime, default=datetime.utcnow)


class Task(Base):
    """Модель карточки задания на фестивале"""
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    urgency_color = Column(String, default="green")  # red, yellow, green
    links = Column(JSON, default=list)  # Список внешних ссылок
    image_url = Column(String, nullable=True)  # Публичная ссылка на фото из Supabase Storage
    status = Column(String, default="new")  # new, in_progress, completed
    assigned_to = Column(JSON, default=list)  # Список Telegram ID назначенных пользователей
    tags = Column(JSON, default=list)  # Список тегов задания
    created_by = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Связь с сообщениями ветки обсуждения
    messages = relationship("Message", back_populates="task", cascade="all, delete-orphan")


class Message(Base):
    """Сообщение в ветке обсуждения под карточкой задания"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(BigInteger, nullable=False)
    username = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="messages")


class ProgressBar(Base):
    """Прогресс-бар глобальной цели / зоны фестиваля"""
    __tablename__ = "progress_bars"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String, nullable=False)
    tags = Column(JSON, default=list)  # Теги, привязанные к этому прогресс-бару
    target_count = Column(Integer, default=5)  # Целевое количество выполненных заданий
    created_at = Column(DateTime, default=datetime.utcnow)
