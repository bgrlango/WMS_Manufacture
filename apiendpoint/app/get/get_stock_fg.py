from sqlalchemy.orm import Session
from app.models.stock_fg import StockFg

def get_all_stock_fg(db: Session, skip: int = 0, limit: int = 100):
    return db.query(StockFg).offset(skip).limit(limit).all()
