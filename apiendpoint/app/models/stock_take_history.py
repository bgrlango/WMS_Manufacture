from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, DECIMAL, ForeignKey, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from app.database.base import Base

class StockTakeHistory(Base):
    __tablename__ = "stock_take_history"
    id = Column(Integer, primary_key=True, index=True)
    take_date = Column(TIMESTAMP)
    stock_type = Column(SQLAlchemyEnum('fg', 'wip', name='stock_type_enum'), nullable=False)
    part_number = Column(String(100), ForeignKey("master_prod.part_number"))
    system_quantity = Column(DECIMAL(10, 2), nullable=False)
    physical_quantity = Column(DECIMAL(10, 2), nullable=False)
    discrepancy = Column(DECIMAL(10, 2), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"))
    notes = Column(Text)

    user = relationship("User")
    
