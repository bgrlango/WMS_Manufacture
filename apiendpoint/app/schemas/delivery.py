from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from .user import UserSchema

class DeliverySchema(BaseModel):
    id: int
    delivery_order_number: str
    part_number: str
    quantity_shipped: Decimal
    customer: Optional[str] = None
    delivery_date: Optional[datetime] = None
    user: Optional[UserSchema] = None
    class Config: from_attributes = True
