from sqlalchemy.orm import Session
from app.models.master_prod import MasterProd

def get_all_master_prod(db: Session, skip: int = 0, limit: int = 100):
    return db.query(MasterProd).offset(skip).limit(limit).all()
