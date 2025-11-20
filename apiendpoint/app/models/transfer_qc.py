from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class TransferQc(Base):
    __tablename__ = "transfer_qc"
    id = Column(Integer, primary_key=True, index=True)
    part_number = Column(String(100), ForeignKey("master_prod.part_number"))
    quantity = Column(DECIMAL(10, 2), nullable=False)
    transfer_date = Column(TIMESTAMP)
    production_order_id = Column(Integer, ForeignKey("production_orders.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    notes = Column(Text)
    
    user = relationship("User")
    production_order = relationship("ProductionOrder")
