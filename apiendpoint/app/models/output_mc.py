from sqlalchemy import Column, Integer, String, TIMESTAMP, Enum as SQLAlchemyEnum, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.database.base import Base

class OutputMc(Base):
    __tablename__ = "output_mc"
    id = Column(Integer, primary_key=True, index=True)
    production_order_id = Column(Integer, ForeignKey("production_orders.id"))
    machine_id = Column(String(50), nullable=False)
    part_number = Column(String(100), ForeignKey("master_prod.part_number"))
    quantity_good = Column(Integer, nullable=False, default=0)
    quantity_ng = Column(Integer, nullable=False, default=0)
    operator_id = Column(Integer, ForeignKey("users.id"))
    shift = Column(SQLAlchemyEnum('1', '2', '3', name='shift_enum'), nullable=False)
    production_date = Column(Date, nullable=False)
    created_at = Column(TIMESTAMP)

    operator = relationship("User")
    product = relationship("MasterProd")
    production_order = relationship("ProductionOrder")
