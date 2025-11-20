from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.core.security import get_current_user
from app.models import User, StockTakeHistory, StockAdjustment
from app.schemas import StockTakeHistorySchema, StockAdjustmentSchema

router = APIRouter()

@router.get("/stock-takes", response_model=List[StockTakeHistorySchema])
def get_stock_takes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(StockTakeHistory).all()

@router.get("/adjustments", response_model=List[StockAdjustmentSchema])
def get_stock_adjustments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(StockAdjustment).all()
