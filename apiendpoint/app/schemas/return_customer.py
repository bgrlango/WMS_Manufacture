from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class ReturnCustomerSchema(BaseModel):
    id: int
    part_number: str  # Sesuai database
    model: Optional[str] = None  # Sesuai database
    description: Optional[str] = None  # Sesuai database
    qty: Decimal  # Sesuai database: qty bukan quantity
    status_ng: Optional[str] = None  # Sesuai database: status_ng bukan status
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
