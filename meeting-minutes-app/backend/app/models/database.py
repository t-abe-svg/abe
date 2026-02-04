from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SQLEnum
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from datetime import datetime
import enum

from app.config import settings

# Convert sqlite URL to async version
database_url = settings.database_url
if database_url.startswith("sqlite:///"):
    database_url = database_url.replace("sqlite:///", "sqlite+aiosqlite:///")

engine = create_async_engine(database_url, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()


class ProcessingStatusEnum(enum.Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    TRANSCRIBING = "transcribing"
    GENERATING = "generating"
    COMPLETED = "completed"
    ERROR = "error"


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)

    # File info
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)

    # Meeting metadata
    title = Column(String(255), nullable=True)
    meeting_date = Column(DateTime, nullable=True)
    location = Column(String(255), nullable=True)
    participants = Column(Text, nullable=True)  # JSON string
    purpose = Column(Text, nullable=True)

    # Processing results
    status = Column(SQLEnum(ProcessingStatusEnum), default=ProcessingStatusEnum.PENDING)
    transcription = Column(Text, nullable=True)
    minutes = Column(Text, nullable=True)

    # Progress tracking
    progress = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
