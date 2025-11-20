from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, DECIMAL, Boolean
from app.database.base import Base

class MasterProd(Base):
    __tablename__ = "master_prod"
    
    id = Column(Integer, primary_key=True, index=True)
    part_number = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text)  # Database has 'description', not 'part_name'
    unit_of_measure = Column(String(20), default='PCS')
    standard_cost = Column(DECIMAL(12, 2), default=0.00)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)
