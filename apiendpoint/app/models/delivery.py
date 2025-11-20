from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class Delivery(Base):
    __tablename__ = "delivery"
    id = Column(Integer, primary_key=True, index=True)
    delivery_order_number = Column(String(100), unique=True, nullable=False)
    part_number = Column(String(100), ForeignKey("master_prod.part_number"))
    quantity_shipped = Column(DECIMAL(10, 2), nullable=False)
    delivery_date = Column(TIMESTAMP)
    user_id = Column(Integer, ForeignKey("users.id"))
    customer = Column(String(255))
    notes = Column(Text)

    user = relationship("User")
    product = relationship("MasterProd")
