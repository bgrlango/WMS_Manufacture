from sqlalchemy import Column, Integer, String, TIMESTAMP, Enum as SQLAlchemyEnum, DECIMAL, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.database.base import Base

class ProductionOrder(Base):
    __tablename__ = "production_orders"
    
    id = Column(Integer, primary_key=True, index=True)
    job_order = Column(String(50), nullable=False)  # Database has 'job_order', not 'lot_number'
    part_number = Column(String(100), ForeignKey("master_prod.part_number"), nullable=False)
    plan_quantity = Column(DECIMAL(12, 2), nullable=False)  # Database has 'plan_quantity'
    machine_name = Column(String(100))  # Database has 'machine_name'
    start_date = Column(Date, nullable=False)
    status = Column(SQLAlchemyEnum('running', 'rework', 'pending', 'cancelled', name='po_status_enum'), default='running')
    workflow_status = Column(SQLAlchemyEnum('planning', 'in_progress', 'completed', 'cancelled', name='workflow_status_enum'), default='planning')
    created_at = Column(TIMESTAMP)
    updated_at = Column(TIMESTAMP)
    
    # Relationships
    product = relationship("MasterProd", foreign_keys=[part_number])
