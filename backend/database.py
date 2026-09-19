from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from backend.config import settings

# Асинхронный движок SQLAlchemy
engine = create_async_engine(
    settings.async_database_url,
    echo=False,
    pool_pre_ping=True,
)

# Фабрика асинхронных сессий
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """Dependency для получения сессии БД в эндпоинтах FastAPI"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Инициализация таблиц при старте приложения"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
