from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# --- Схемы Пользователей ---
class UserOut(BaseModel):
    id: int
    username: Optional[str] = None
    first_name: Optional[str] = None
    role: str
    tags: List[str] = []

    class Config:
        from_attributes = True


class UserUpdateTags(BaseModel):
    tags: List[str]


# --- Схемы Задач ---
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    urgency_color: str = Field(default="green", description="red, yellow, green")
    links: List[str] = []
    image_url: Optional[str] = None
    assigned_to: List[int] = []  # ID пользователей
    tags: List[str] = []  # Теги задания


class TaskUpdateStatus(BaseModel):
    status: str = Field(..., description="new, in_progress, completed")


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = ""
    urgency_color: str
    links: List[str] = []
    image_url: Optional[str] = None
    status: str
    assigned_to: List[int] = []
    tags: List[str] = []
    created_by: Optional[int] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Схемы Сообщений обсуждения ---
class MessageCreate(BaseModel):
    text: str


class MessageOut(BaseModel):
    id: int
    task_id: int
    user_id: int
    username: Optional[str] = None
    text: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Схемы Прогресс-баров ---
class ProgressBarCreate(BaseModel):
    title: str
    tags: List[str] = []
    target_count: int = 5


class ProgressBarOut(BaseModel):
    id: int
    title: str
    tags: List[str] = []
    target_count: int
    completed_count: int = 0
    percent: int = 0

    class Config:
        from_attributes = True


# --- Аутентификация и Роли ---
class VerifyRoleRequest(BaseModel):
    password: str


class VerifyRoleResponse(BaseModel):
    success: bool
    role: Optional[str] = None
    message: str


# --- Конфигурация Supabase ---
class SupabaseConfigOut(BaseModel):
    supabase_url: str
    supabase_anon_key: str
    supabase_bucket: str
