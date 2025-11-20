from sqlalchemy import Column, Integer, String, TIMESTAMP, DECIMAL, ForeignKey, Enum as SQLAlchemyEnum
from app.database.base import Base

class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"
    id = Column(Integer, primary_key=True)
    part_number = Column(String(100), ForeignKey("master_prod.part_number"), nullable=False)
    stock_type = Column(SQLAlchemyEnum('fg', 'wip', name='adj_stock_type_enum'), nullable=False)
    adjustment_quantity = Column(DECIMAL(10, 2), nullable=False)
    new_quantity = Column(DECIMAL(10, 2), nullable=False)
    reason = Column(String(255))
    user_id = Column(Integer, ForeignKey("users.id"))
    adjustment_date = Column(TIMESTAMP)
    stock_take_history_id = Column(Integer, ForeignKey("stock_take_history.id"))
