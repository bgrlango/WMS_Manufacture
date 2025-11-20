from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from .user import UserSchema

class TransferQcSchema(BaseModel):
    id: int
    part_number: str
    quantity: Decimal
    transfer_date: Optional[datetime] = None
    user: Optional[UserSchema] = None
    class Config: from_attributes = True
