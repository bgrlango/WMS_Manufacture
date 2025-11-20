from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserSchema(BaseModel):
    id: int
    email: Optional[str] = None  # Buat optional untuk handle data yang tidak valid
    full_name: Optional[str] = None
    role: str
    
    class Config:
        from_attributes = True
