from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class StockWipSchema(BaseModel):
    part_number: str
    description: str
    quantity: Decimal
    current_station: Optional[str] = None
    last_updated: datetime
    
    class Config:
        from_attributes = True
