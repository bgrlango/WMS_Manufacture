from sqlalchemy.orm import Session
from app.models.stock_wip import StockWip

def get_all_stock_wip(db: Session, skip: int = 0, limit: int = 100):
    return db.query(StockWip).offset(skip).limit(limit).all()
