from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class OQCSchema(BaseModel):
    id: int
    part_number: str
    lot_number: str
    quantity_good: Decimal  # Sesuai database: quantity_good bukan quantity_passed
    quantity_ng: Optional[Decimal] = None
    inspection_date: Optional[datetime] = None
    inspector_id: Optional[int] = None  # Sesuai database: inspector_id bukan inspector
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
