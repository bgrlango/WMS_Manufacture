from sqlalchemy.orm import Session, joinedload
from app.models.production_order import ProductionOrder

def get_all_production_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(ProductionOrder).options(joinedload(ProductionOrder.master_prod)).order_by(ProductionOrder.created_at.desc()).offset(skip).limit(limit).all()
