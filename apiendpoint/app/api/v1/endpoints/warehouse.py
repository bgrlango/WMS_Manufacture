from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.core.security import get_current_user
from app.models import User, Delivery, ReturnCustomer, StockFg
from app.schemas import DeliverySchema, ReturnCustomerSchema, StockFgSchema

router = APIRouter()

@router.get("/deliveries", response_model=List[DeliverySchema])
def get_deliveries(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), skip: int = 0, limit: int = 100):
    return db.query(Delivery).offset(skip).limit(limit).all()

@router.get("/returns", response_model=List[ReturnCustomerSchema])
def get_returns(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), skip: int = 0, limit: int = 100):
    return db.query(ReturnCustomer).offset(skip).limit(limit).all()

@router.get("/stock-fg", response_model=List[StockFgSchema])
def get_fg_stock(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(StockFg).all()
