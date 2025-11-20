from sqlalchemy import Column, Integer, String, TIMESTAMP, DECIMAL, ForeignKey
from app.database.base import Base

class StockWip(Base):
    __tablename__ = "stock_wip"
    id = Column(Integer, primary_key=True, index=True)
    part_number = Column(String(100), ForeignKey("master_prod.part_number"))
    description = Column(String(100), nullable=False)  # Sesuai database asli
    quantity = Column(DECIMAL(10, 2), nullable=False, default=0.00)  # Sesuai database asli
    current_station = Column(String(100))  # Sesuai database asli
    last_updated = Column(TIMESTAMP)  # Sesuai database asli
