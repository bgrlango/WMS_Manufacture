from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from .user import UserSchema

class StockTakeHistorySchema(BaseModel):
    id: int
    take_date: Optional[datetime] = None
    stock_type: str
    part_number: str
    system_quantity: Decimal
    physical_quantity: Decimal
    discrepancy: Decimal
    user: Optional[UserSchema] = None
    class Config: from_attributes = True
