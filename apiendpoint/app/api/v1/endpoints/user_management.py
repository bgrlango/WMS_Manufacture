from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.core.security import get_current_user
from app.models import User, UserLog
from app.schemas import UserSchema, UserLogSchema

router = APIRouter()

@router.get("/users", response_model=List[UserSchema])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(User).all()

@router.get("/logs", response_model=List[UserLogSchema])
def get_user_logs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(UserLog).all()
