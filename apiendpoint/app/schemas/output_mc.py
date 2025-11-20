from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from .user import UserSchema
class OutputMcSchema(BaseModel):
    id: int
    machine_id: str
    part_number: str
    quantity_good: int
    quantity_ng: int
    shift: str
    production_date: date
    operator: Optional[UserSchema] = None
    class Config: from_attributes = True
