from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class StockFgSchema(BaseModel):
    part_number: str
    quantity: Decimal
    location: Optional[str] = None
    last_updated: datetime
    
    class Config:
        from_attributes = True
