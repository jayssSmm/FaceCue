from app.models.base import Base
from sqlalchemy import create_engine, Column, String, Boolean, DateTime
from datetime import datetime, timezone
from sqlalchemy.dialects.postgresql import UUID
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)  # null for Google-only accounts
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    auth_provider = Column(String, default="local")  # "local" | "google"
    google_sub = Column(String, unique=True, nullable=True, index=True)  # Google's stable user id
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))