from sqlalchemy import Column, Integer, String, TIMESTAMP, Text, ForeignKey
from app.database.base import Base

class UserLog(Base):
    __tablename__ = "user_log"
    id = Column(Integer, primary_key=True, index=True)  # Tambah field id
    id_user = Column(Integer, ForeignKey("users.id"))
    email = Column(String(50), nullable=False)
    created_at = Column(TIMESTAMP, nullable=False)
    logs_status = Column(Text)
    ip_address = Column(String(45))  # Sesuai database
    user_agent = Column(Text)  # Sesuai database
