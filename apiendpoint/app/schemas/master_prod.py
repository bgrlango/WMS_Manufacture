from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

class MasterProdSchema(BaseModel):
    id: int
    customer: Optional[str] = None
    part_number: str
    model: Optional[str] = None
    description: Optional[str] = None
    class Config: from_attributes = True
