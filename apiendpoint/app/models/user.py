from sqlalchemy import (Column, Integer, String, TIMESTAMP, Enum as SQLAlchemyEnum)
from app.database.base import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(SQLAlchemyEnum('production', 'quality', 'warehouse', name='user_roles_enum'), nullable=False)
    created_at = Column(TIMESTAMP)
