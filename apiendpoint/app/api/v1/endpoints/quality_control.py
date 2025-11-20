from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.core.security import get_current_user
from app.models import User, OQC, TransferQc, StockWip, StockFg
from app.schemas import OQCSchema, TransferQcSchema, StockWipSchema, StockFgSchema

router = APIRouter()

@router.get("/oqc-records", response_model=List[OQCSchema])
def get_oqc_records(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), skip: int = 0, limit: int = 100):
    return db.query(OQC).offset(skip).limit(limit).all()

@router.get("/transfers", response_model=List[TransferQcSchema])
def get_qc_transfers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user), skip: int = 0, limit: int = 100):
    return db.query(TransferQc).offset(skip).limit(limit).all()

@router.get("/stock-wip", response_model=List[StockWipSchema])
def get_wip_stock(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(StockWip).all()

@router.get("/stock-fg", response_model=List[StockFgSchema])
def get_fg_stock(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(StockFg).all()
