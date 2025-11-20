from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from .user import UserSchema

class ProductionOrderSchema(BaseModel):
    id: int
    lot_number: str
    part_number: str
    quantity_to_produce: Decimal
    status: str
    creator: Optional[UserSchema] = None
    created_at: datetime
    class Config: from_attributes = True
