from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from .user import UserSchema

class StockAdjustmentSchema(BaseModel):
    id: int
    part_number: str
    stock_type: str
    adjustment_quantity: Decimal
    new_quantity: Decimal
    reason: Optional[str] = None
    user: Optional[UserSchema] = None
    adjustment_date: Optional[datetime] = None
    class Config: from_attributes = True
