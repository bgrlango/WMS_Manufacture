"""
Mobile API Endpoints for Query Service (FastAPI)
Simplified mobile endpoints for read operations
"""
from fastapi import APIRouter, Depends, Request, HTTPException
from typing import Dict, Any, List
from datetime import datetime

router = APIRouter()

@router.get("/health")
async def mobile_health_check(request: Request):
    """Mobile API health check endpoint"""
    return {
        "status": "healthy",
        "service": "Mobile API Query Service",
        "timestamp": datetime.now().isoformat(),
        "device": "mobile" if getattr(request.state, 'is_mobile', False) else "desktop",
        "device_id": getattr(request.state, 'device_id', 'unknown'),
        "app_version": getattr(request.state, 'app_version', '1.0.0')
    }

@router.get("/info")
async def mobile_service_info(request: Request):
    """Mobile API service information"""
    return {
        "service": "Mobile API Query Service",
        "version": "1.0.0",
        "description": "Mobile-optimized read operations for Manufacturing ERP",
        "capabilities": [
            "Mobile dashboard",
            "Production orders lookup",
            "Inventory quick check",
            "Mobile-optimized responses"
        ],
        "supported_devices": ["Android", "iOS", "PWA"],
        "optimization": {
            "compression": True,
            "response_optimization": getattr(request.state, 'is_mobile', False),
            "rate_limit": "100 requests per minute"
        }
    }

@router.get("/dashboard")
async def mobile_dashboard(request: Request):
    """Mobile-optimized dashboard endpoint"""
    try:
        # Mock dashboard data (integrate with actual DB later)
        dashboard_data = {
            "summary": {
                "total_production_orders": 25,
                "completed_today": 8,
                "pending_qc": 3,
                "inventory_alerts": 2
            },
            "recent_activities": [
                {
                    "id": 1,
                    "type": "production",
                    "message": "Production order PO-001 completed",
                    "timestamp": "2025-01-28T10:30:00Z"
                },
                {
                    "id": 2,
                    "type": "qc",
                    "message": "QC inspection passed for batch B-123",
                    "timestamp": "2025-01-28T09:15:00Z"
                }
            ],
            "kpi": {
                "efficiency": 85.5,
                "quality_rate": 98.2,
                "on_time_delivery": 92.1
            },
            "device_info": {
                "is_mobile": getattr(request.state, 'is_mobile', False),
                "device_id": getattr(request.state, 'device_id', 'unknown'),
                "optimized": True
            }
        }
        
        return dashboard_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/production/orders")
async def mobile_production_orders(request: Request, limit: int = 10):
    """Mobile-optimized production orders list"""
    try:
        # Mock production orders data
        orders = []
        for i in range(1, min(limit + 1, 11)):
            orders.append({
                "id": f"PO-{i:03d}",
                "product_name": f"Product {i}",
                "quantity": 100 + (i * 50),
                "status": "in_progress" if i % 3 == 0 else "pending",
                "priority": "high" if i % 4 == 0 else "normal",
                "due_date": f"2025-01-{28 + i}T23:59:59Z"
            })
        
        return {
            "production_orders": orders,
            "total_count": len(orders),
            "mobile_optimized": True,
            "device_info": {
                "is_mobile": getattr(request.state, 'is_mobile', False),
                "device_id": getattr(request.state, 'device_id', 'unknown')
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/inventory/quick-check")
async def mobile_inventory_quick_check(request: Request, barcode: str = None, product_id: str = None):
    """Mobile inventory quick check for barcode scanning"""
    try:
        if not barcode and not product_id:
            raise HTTPException(status_code=400, detail="Either barcode or product_id is required")
        
        # Mock inventory data
        inventory_data = {
            "product_id": product_id or f"PRD-{barcode}",
            "product_name": f"Product {barcode or product_id}",
            "barcode": barcode or f"BC-{product_id}",
            "current_stock": 150,
            "location": "Warehouse A-01",
            "last_movement": "2025-01-28T08:30:00Z",
            "status": "available",
            "mobile_scan": True,
            "device_info": {
                "is_mobile": getattr(request.state, 'is_mobile', False),
                "device_id": getattr(request.state, 'device_id', 'unknown')
            }
        }
        
        return inventory_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
