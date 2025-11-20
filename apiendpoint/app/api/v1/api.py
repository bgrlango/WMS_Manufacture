"""
API Router untuk ERP Query Service
Production-ready routing dengan comprehensive endpoints
"""
from fastapi import APIRouter
from .endpoints import (
    production, 
    quality_control, 
    warehouse, 
    user_management, 
    historical_stock, 
    master_product,
    erp_query,  # New ERP endpoints
    mobile  # Mobile API endpoints
)
from app.get import (
    get_qc,  # Enhanced QC endpoints
    get_warehouse  # Enhanced Warehouse endpoints
)

api_router = APIRouter()

# ERP Query Endpoints (Primary focus for production)
api_router.include_router(
    erp_query.router, 
    prefix="/erp", 
    tags=["ERP Queries"]
)

# Mobile API Endpoints
api_router.include_router(
    mobile.router, 
    prefix="/mobile", 
    tags=["Mobile API"]
)

# Enhanced Warehouse Query Endpoints (New CQRS Implementation)
api_router.include_router(
    get_warehouse.router, 
    prefix="/warehouse", 
    tags=["Warehouse Management - Enhanced"]
)

# Enhanced QC Query Endpoints (CQRS Implementation)
api_router.include_router(
    get_qc.router, 
    prefix="/qc", 
    tags=["Quality Control - Enhanced"]
)

# Legacy endpoints (for backward compatibility)
api_router.include_router(
    production.router, 
    prefix="/production-legacy", 
    tags=["Production (Legacy)"]
)
api_router.include_router(
    quality_control.router, 
    prefix="/quality-legacy", 
    tags=["Quality Control (Legacy)"]
)
api_router.include_router(
    warehouse.router, 
    prefix="/warehouse-legacy", 
    tags=["Warehouse (Legacy)"]
)
api_router.include_router(
    user_management.router, 
    prefix="/users", 
    tags=["User Management"]
)
api_router.include_router(
    historical_stock.router, 
    prefix="/historical-stock", 
    tags=["Historical Stock"]
)
api_router.include_router(
    master_product.router, 
    prefix="/master-product", 
    tags=["Master Product"]
)
