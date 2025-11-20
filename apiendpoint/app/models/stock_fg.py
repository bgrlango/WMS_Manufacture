from sqlalchemy import Column, Integer, String, TIMESTAMP, DECIMAL, ForeignKey
from app.database.base import Base

class StockFg(Base):
    __tablename__ = "stock_fg"
    id = Column(Integer, primary_key=True, index=True)
    part_number = Column(String(100), ForeignKey("master_prod.part_number"))
    quantity = Column(DECIMAL(10, 2), nullable=False, default=0.00)  # Sesuai database asli
    location = Column(String(100))  # Sesuai database asli
    last_updated = Column(TIMESTAMP)  # Sesuai database asli
