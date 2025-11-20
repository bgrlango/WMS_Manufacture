from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserLogSchema(BaseModel):
    id: int  # Sesuai database: ada field id
    id_user: int  # Sesuai database
    email: str  # Ubah dari EmailStr ke str untuk kompatibilitas
    created_at: Optional[datetime] = None
    logs_status: Optional[str] = None
    ip_address: Optional[str] = None  # Sesuai database
    user_agent: Optional[str] = None  # Sesuai database
    
    class Config:
        from_attributes = True
