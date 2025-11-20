from sqlalchemy.orm import Session
from app.models.output_mc import OutputMc

def get_all_machine_outputs(db: Session, skip: int = 0, limit: int = 100):
    return db.query(OutputMc).order_by(OutputMc.created_at.desc()).offset(skip).limit(limit).all()
