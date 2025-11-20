from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

# Sesuaikan path import jika perlu
from app.database.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.master_prod import MasterProd
from app.schemas.master_prod import MasterProdSchema # <-- BARIS INI DITAMBAHKAN

router = APIRouter()

@router.get("/", response_model=List[MasterProdSchema], summary="Dapatkan semua data master produk")
def get_all_master_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """
    Mengambil daftar semua produk dari tabel master.
    """
    return db.query(MasterProd).offset(skip).limit(limit).all()
