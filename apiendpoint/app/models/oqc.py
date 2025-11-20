from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class OQC(Base):
    __tablename__ = "oqc"
    id = Column(Integer, primary_key=True, index=True)
    part_number = Column(String(100), ForeignKey("master_prod.part_number"))
    lot_number = Column(String(100))
    quantity_good = Column(DECIMAL(10, 2), nullable=False)  # Sesuai database
    quantity_ng = Column(DECIMAL(10, 2), default=0.00)
    inspection_date = Column(TIMESTAMP)
    inspector_id = Column(Integer, ForeignKey("users.id"))  # Sesuai database
    notes = Column(Text)
    created_at = Column(TIMESTAMP)
