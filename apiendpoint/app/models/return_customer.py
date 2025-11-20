from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, DECIMAL
from app.database.base import Base

class ReturnCustomer(Base):
    __tablename__ = "return_customer"  # Sesuai database: return_customer bukan returns
    id = Column(Integer, primary_key=True, index=True)
    part_number = Column(String(255), nullable=False)  # Sesuai database
    model = Column(String(255))  # Sesuai database
    description = Column(Text)  # Sesuai database
    qty = Column(DECIMAL(10, 2), nullable=False)  # Sesuai database: qty bukan quantity
    status_ng = Column(String(50))  # Sesuai database: status_ng bukan status
    created_at = Column(TIMESTAMP)
