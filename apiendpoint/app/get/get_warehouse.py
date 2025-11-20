"""
Warehouse Query Service - FastAPI Endpoints
CQRS Query operations for Warehouse Management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc, text
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal

from app.database.session import get_db
from app.core.security import get_current_user
from app.models.warehouse import (
    InventoryBalance, InventoryMovement, InventoryLocation,
    StockReservation, CycleCount, CycleCountDetail
)
from app.schemas.warehouse import (
    InventoryBalanceResponse, InventoryMovementResponse, InventoryLocationResponse,
    StockReservationResponse, CycleCountResponse, CycleCountDetailResponse,
    InventoryDashboard, InventoryAnalytics, LocationUtilization,
    ABCAnalysis, StockAlert, MovementSummary
)

router = APIRouter()

# ====================================================================
# INVENTORY BALANCE QUERIES
# ====================================================================

@router.get("/inventory/balances", response_model=List[InventoryBalanceResponse])
async def get_inventory_balances(
    part_number: Optional[str] = None,
    location_id: Optional[int] = None,
    location_code: Optional[str] = None,
    warehouse_zone: Optional[str] = None,
    min_quantity: Optional[float] = None,
    max_quantity: Optional[float] = None,
    zero_stock: Optional[bool] = None,
    negative_stock: Optional[bool] = None,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get inventory balances with filters
    """
    query = db.query(InventoryBalance).join(InventoryLocation)
    
    # Apply filters
    if part_number:
        query = query.filter(InventoryBalance.part_number.ilike(f"%{part_number}%"))
    
    if location_id:
        query = query.filter(InventoryBalance.location_id == location_id)
    
    if location_code:
        query = query.filter(InventoryLocation.location_code.ilike(f"%{location_code}%"))
    
    if warehouse_zone:
        query = query.filter(InventoryLocation.warehouse_zone == warehouse_zone)
    
    if min_quantity is not None:
        query = query.filter(InventoryBalance.available_quantity >= min_quantity)
    
    if max_quantity is not None:
        query = query.filter(InventoryBalance.available_quantity <= max_quantity)
    
    if zero_stock:
        query = query.filter(InventoryBalance.available_quantity == 0)
    
    if negative_stock:
        query = query.filter(InventoryBalance.available_quantity < 0)
    
    # Get total count before pagination
    total = query.count()
    
    # Apply pagination
    balances = query.offset(offset).limit(limit).all()
    
    return {
        "items": balances,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/inventory/balances/summary")
async def get_inventory_summary(
    warehouse_zone: Optional[str] = None,
    location_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get inventory summary statistics
    """
    query = db.query(
        func.count(InventoryBalance.part_number).label('total_parts'),
        func.sum(InventoryBalance.available_quantity).label('total_available'),
        func.sum(InventoryBalance.reserved_quantity).label('total_reserved'),
        func.sum(InventoryBalance.quarantine_quantity).label('total_quarantine'),
        func.sum(InventoryBalance.available_quantity * InventoryBalance.average_cost).label('total_value'),
        func.count(func.nullif(InventoryBalance.available_quantity, 0)).label('active_parts'),
        func.count(func.case([(InventoryBalance.available_quantity == 0, 1)])).label('zero_stock_parts'),
        func.count(func.case([(InventoryBalance.available_quantity < 0, 1)])).label('negative_stock_parts')
    ).join(InventoryLocation)
    
    if warehouse_zone:
        query = query.filter(InventoryLocation.warehouse_zone == warehouse_zone)
    
    if location_type:
        query = query.filter(InventoryLocation.location_type == location_type)
    
    result = query.first()
    
    return {
        "total_parts": result.total_parts or 0,
        "total_available_quantity": float(result.total_available or 0),
        "total_reserved_quantity": float(result.total_reserved or 0),
        "total_quarantine_quantity": float(result.total_quarantine or 0),
        "total_inventory_value": float(result.total_value or 0),
        "active_parts": result.active_parts or 0,
        "zero_stock_parts": result.zero_stock_parts or 0,
        "negative_stock_parts": result.negative_stock_parts or 0
    }

@router.get("/inventory/balances/by-zone")
async def get_inventory_by_zone(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get inventory distribution by warehouse zone
    """
    result = db.query(
        InventoryLocation.warehouse_zone,
        func.count(InventoryBalance.part_number).label('total_parts'),
        func.sum(InventoryBalance.available_quantity).label('total_quantity'),
        func.sum(InventoryBalance.available_quantity * InventoryBalance.average_cost).label('total_value')
    ).join(InventoryLocation).group_by(
        InventoryLocation.warehouse_zone
    ).all()
    
    return [
        {
            "warehouse_zone": row.warehouse_zone,
            "total_parts": row.total_parts,
            "total_quantity": float(row.total_quantity or 0),
            "total_value": float(row.total_value or 0)
        }
        for row in result
    ]

# ====================================================================
# INVENTORY MOVEMENT QUERIES
# ====================================================================

@router.get("/inventory/movements", response_model=List[InventoryMovementResponse])
async def get_inventory_movements(
    part_number: Optional[str] = None,
    movement_type: Optional[str] = None,
    location_id: Optional[int] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[str] = None,
    user_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    sort_by: str = Query("created_at", regex="^(created_at|movement_date|part_number|movement_type)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get inventory movements with filters and sorting
    """
    query = db.query(InventoryMovement)
    
    # Apply filters
    if part_number:
        query = query.filter(InventoryMovement.part_number.ilike(f"%{part_number}%"))
    
    if movement_type:
        query = query.filter(InventoryMovement.movement_type == movement_type)
    
    if location_id:
        query = query.filter(
            (InventoryMovement.from_location_id == location_id) |
            (InventoryMovement.to_location_id == location_id)
        )
    
    if reference_type:
        query = query.filter(InventoryMovement.reference_type == reference_type)
    
    if reference_id:
        query = query.filter(InventoryMovement.reference_id == reference_id)
    
    if user_id:
        query = query.filter(InventoryMovement.user_id == user_id)
    
    if start_date:
        query = query.filter(InventoryMovement.movement_date >= start_date)
    
    if end_date:
        query = query.filter(InventoryMovement.movement_date <= end_date)
    
    # Apply sorting
    sort_column = getattr(InventoryMovement, sort_by)
    if sort_order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    movements = query.offset(offset).limit(limit).all()
    
    return {
        "items": movements,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/inventory/movements/summary")
async def get_movement_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    warehouse_zone: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get movement summary by type and date range
    """
    query = db.query(
        InventoryMovement.movement_type,
        func.count(InventoryMovement.id).label('count'),
        func.sum(InventoryMovement.quantity).label('total_quantity'),
        func.avg(InventoryMovement.quantity).label('avg_quantity'),
        func.sum(InventoryMovement.quantity * InventoryMovement.unit_cost).label('total_value')
    )
    
    if start_date:
        query = query.filter(InventoryMovement.movement_date >= start_date)
    
    if end_date:
        query = query.filter(InventoryMovement.movement_date <= end_date)
    
    if warehouse_zone:
        query = query.join(InventoryLocation, 
            (InventoryMovement.from_location_id == InventoryLocation.id) |
            (InventoryMovement.to_location_id == InventoryLocation.id)
        ).filter(InventoryLocation.warehouse_zone == warehouse_zone)
    
    result = query.group_by(InventoryMovement.movement_type).all()
    
    return [
        {
            "movement_type": row.movement_type,
            "count": row.count,
            "total_quantity": float(row.total_quantity or 0),
            "average_quantity": float(row.avg_quantity or 0),
            "total_value": float(row.total_value or 0)
        }
        for row in result
    ]

@router.get("/inventory/movements/daily")
async def get_daily_movements(
    days: int = Query(30, ge=1, le=365),
    movement_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get daily movement trends
    """
    query = db.query(
        func.date(InventoryMovement.movement_date).label('date'),
        func.count(InventoryMovement.id).label('count'),
        func.sum(InventoryMovement.quantity).label('total_quantity')
    ).filter(
        InventoryMovement.movement_date >= func.date_sub(func.now(), text(f"INTERVAL {days} DAY"))
    )
    
    if movement_type:
        query = query.filter(InventoryMovement.movement_type == movement_type)
    
    result = query.group_by(func.date(InventoryMovement.movement_date)).order_by('date').all()
    
    return [
        {
            "date": row.date.isoformat(),
            "count": row.count,
            "total_quantity": float(row.total_quantity or 0)
        }
        for row in result
    ]

# ====================================================================
# STOCK RESERVATION QUERIES
# ====================================================================

@router.get("/inventory/reservations", response_model=List[StockReservationResponse])
async def get_stock_reservations(
    part_number: Optional[str] = None,
    location_id: Optional[int] = None,
    reservation_type: Optional[str] = None,
    status: Optional[str] = None,
    reserved_by: Optional[int] = None,
    reference_id: Optional[str] = None,
    expiring_soon: Optional[bool] = None,
    days_until_expiry: int = Query(7, ge=1),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get stock reservations with filters
    """
    query = db.query(StockReservation)
    
    # Apply filters
    if part_number:
        query = query.filter(StockReservation.part_number.ilike(f"%{part_number}%"))
    
    if location_id:
        query = query.filter(StockReservation.location_id == location_id)
    
    if reservation_type:
        query = query.filter(StockReservation.reservation_type == reservation_type)
    
    if status:
        query = query.filter(StockReservation.status == status)
    
    if reserved_by:
        query = query.filter(StockReservation.reserved_by == reserved_by)
    
    if reference_id:
        query = query.filter(StockReservation.reference_id == reference_id)
    
    if expiring_soon:
        expiry_date = datetime.now().date() + timedelta(days=days_until_expiry)
        query = query.filter(
            StockReservation.expiry_date.isnot(None),
            StockReservation.expiry_date <= expiry_date,
            StockReservation.status == 'active'
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    reservations = query.order_by(desc(StockReservation.created_at)).offset(offset).limit(limit).all()
    
    return {
        "items": reservations,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/inventory/reservations/summary")
async def get_reservations_summary(
    warehouse_zone: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get reservations summary statistics
    """
    query = db.query(
        StockReservation.status,
        StockReservation.reservation_type,
        func.count(StockReservation.id).label('count'),
        func.sum(StockReservation.reserved_quantity).label('total_quantity')
    )
    
    if warehouse_zone:
        query = query.join(InventoryLocation).filter(
            InventoryLocation.warehouse_zone == warehouse_zone
        )
    
    result = query.group_by(
        StockReservation.status, 
        StockReservation.reservation_type
    ).all()
    
    return [
        {
            "status": row.status,
            "reservation_type": row.reservation_type,
            "count": row.count,
            "total_quantity": float(row.total_quantity or 0)
        }
        for row in result
    ]

# ====================================================================
# CYCLE COUNT QUERIES
# ====================================================================

@router.get("/inventory/cycle-counts", response_model=List[CycleCountResponse])
async def get_cycle_counts(
    location_id: Optional[int] = None,
    count_type: Optional[str] = None,
    status: Optional[str] = None,
    assigned_to: Optional[int] = None,
    created_by: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get cycle counts with filters
    """
    query = db.query(CycleCount)
    
    # Apply filters
    if location_id:
        query = query.filter(CycleCount.location_id == location_id)
    
    if count_type:
        query = query.filter(CycleCount.count_type == count_type)
    
    if status:
        query = query.filter(CycleCount.status == status)
    
    if assigned_to:
        query = query.filter(CycleCount.assigned_to == assigned_to)
    
    if created_by:
        query = query.filter(CycleCount.created_by == created_by)
    
    if start_date:
        query = query.filter(CycleCount.count_date >= start_date)
    
    if end_date:
        query = query.filter(CycleCount.count_date <= end_date)
    
    # Get total count
    total = query.count()
    
    # Apply pagination and ordering
    counts = query.order_by(desc(CycleCount.created_at)).offset(offset).limit(limit).all()
    
    return {
        "items": counts,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/inventory/cycle-counts/{count_id}/details", response_model=List[CycleCountDetailResponse])
async def get_cycle_count_details(
    count_id: int,
    variance_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get cycle count details for a specific count
    """
    query = db.query(CycleCountDetail).filter(CycleCountDetail.cycle_count_id == count_id)
    
    if variance_only:
        query = query.filter(CycleCountDetail.variance_quantity != 0)
    
    details = query.all()
    
    if not details:
        raise HTTPException(status_code=404, detail="Cycle count tidak ditemukan")
    
    return details

@router.get("/inventory/cycle-counts/variance-summary")
async def get_variance_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    location_id: Optional[int] = None,
    significant_variance_threshold: float = Query(10.0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get variance summary from cycle counts
    """
    query = db.query(
        func.count(CycleCountDetail.id).label('total_items_counted'),
        func.count(func.case([(CycleCountDetail.variance_quantity != 0, 1)])).label('items_with_variance'),
        func.sum(func.abs(CycleCountDetail.variance_quantity)).label('total_abs_variance'),
        func.sum(func.abs(CycleCountDetail.variance_value)).label('total_abs_variance_value'),
        func.count(func.case([(func.abs(CycleCountDetail.variance_quantity) >= significant_variance_threshold, 1)])).label('significant_variances')
    ).join(CycleCount)
    
    if start_date:
        query = query.filter(CycleCount.count_date >= start_date)
    
    if end_date:
        query = query.filter(CycleCount.count_date <= end_date)
    
    if location_id:
        query = query.filter(CycleCount.location_id == location_id)
    
    result = query.first()
    
    return {
        "total_items_counted": result.total_items_counted or 0,
        "items_with_variance": result.items_with_variance or 0,
        "variance_percentage": round((result.items_with_variance or 0) / max(result.total_items_counted or 1, 1) * 100, 2),
        "total_absolute_variance": float(result.total_abs_variance or 0),
        "total_absolute_variance_value": float(result.total_abs_variance_value or 0),
        "significant_variances": result.significant_variances or 0,
        "significant_variance_threshold": significant_variance_threshold
    }

# ====================================================================
# LOCATION QUERIES
# ====================================================================

@router.get("/inventory/locations", response_model=List[InventoryLocationResponse])
async def get_inventory_locations(
    location_code: Optional[str] = None,
    location_type: Optional[str] = None,
    warehouse_zone: Optional[str] = None,
    aisle: Optional[str] = None,
    rack: Optional[str] = None,
    active_only: bool = Query(True),
    with_inventory: Optional[bool] = None,
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get inventory locations with filters
    """
    query = db.query(InventoryLocation)
    
    # Apply filters
    if location_code:
        query = query.filter(InventoryLocation.location_code.ilike(f"%{location_code}%"))
    
    if location_type:
        query = query.filter(InventoryLocation.location_type == location_type)
    
    if warehouse_zone:
        query = query.filter(InventoryLocation.warehouse_zone == warehouse_zone)
    
    if aisle:
        query = query.filter(InventoryLocation.aisle == aisle)
    
    if rack:
        query = query.filter(InventoryLocation.rack == rack)
    
    if active_only:
        query = query.filter(InventoryLocation.active == True)
    
    if with_inventory is not None:
        if with_inventory:
            query = query.join(InventoryBalance).filter(InventoryBalance.available_quantity > 0)
        else:
            query = query.outerjoin(InventoryBalance).filter(
                (InventoryBalance.id.is_(None)) | (InventoryBalance.available_quantity == 0)
            )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    locations = query.offset(offset).limit(limit).all()
    
    return {
        "items": locations,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/inventory/locations/{location_id}/utilization")
async def get_location_utilization(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get utilization statistics for a specific location
    """
    location = db.query(InventoryLocation).filter(InventoryLocation.id == location_id).first()
    
    if not location:
        raise HTTPException(status_code=404, detail="Location tidak ditemukan")
    
    # Get inventory in location
    inventory_stats = db.query(
        func.count(InventoryBalance.part_number).label('total_parts'),
        func.sum(InventoryBalance.available_quantity).label('total_quantity'),
        func.sum(InventoryBalance.available_quantity * InventoryBalance.average_cost).label('total_value')
    ).filter(InventoryBalance.location_id == location_id).first()
    
    # Calculate utilization percentage
    utilization_percentage = 0
    if location.capacity and inventory_stats.total_quantity:
        utilization_percentage = (float(inventory_stats.total_quantity) / location.capacity) * 100
    
    return {
        "location": location,
        "total_parts": inventory_stats.total_parts or 0,
        "total_quantity": float(inventory_stats.total_quantity or 0),
        "total_value": float(inventory_stats.total_value or 0),
        "capacity": location.capacity,
        "utilization_percentage": round(utilization_percentage, 2)
    }

# ====================================================================
# ANALYTICS AND REPORTING
# ====================================================================

@router.get("/inventory/analytics/abc-analysis")
async def get_abc_analysis(
    analysis_type: str = Query("value", regex="^(value|movement|quantity)$"),
    period_days: int = Query(90, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Perform ABC analysis on inventory
    """
    # This is a complex query that would require raw SQL for proper ABC analysis
    # For now, return a simplified version
    
    if analysis_type == "value":
        # Analyze by inventory value
        query = db.query(
            InventoryBalance.part_number,
            (InventoryBalance.available_quantity * InventoryBalance.average_cost).label('value')
        ).filter(InventoryBalance.available_quantity > 0)
        
    elif analysis_type == "movement":
        # Analyze by movement frequency
        start_date = datetime.now().date() - timedelta(days=period_days)
        query = db.query(
            InventoryMovement.part_number,
            func.count(InventoryMovement.id).label('movement_count'),
            func.sum(InventoryMovement.quantity).label('total_moved')
        ).filter(
            InventoryMovement.movement_date >= start_date
        ).group_by(InventoryMovement.part_number)
        
    result = query.order_by(desc('value' if analysis_type == 'value' else 'movement_count')).limit(100).all()
    
    return {
        "analysis_type": analysis_type,
        "period_days": period_days,
        "items": [
            {
                "part_number": row.part_number,
                "value": float(getattr(row, 'value', 0)),
                "movement_count": getattr(row, 'movement_count', 0),
                "total_moved": float(getattr(row, 'total_moved', 0))
            }
            for row in result
        ]
    }

@router.get("/inventory/analytics/slow-moving")
async def get_slow_moving_inventory(
    days_threshold: int = Query(90, ge=30, le=365),
    min_value_threshold: float = Query(100.0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get slow-moving inventory items
    """
    threshold_date = datetime.now().date() - timedelta(days=days_threshold)
    
    # Find items with no recent movements
    slow_moving = db.query(
        InventoryBalance.part_number,
        InventoryBalance.available_quantity,
        InventoryBalance.average_cost,
        (InventoryBalance.available_quantity * InventoryBalance.average_cost).label('total_value'),
        InventoryBalance.last_movement_date,
        InventoryLocation.location_code
    ).join(InventoryLocation).outerjoin(
        InventoryMovement,
        (InventoryMovement.part_number == InventoryBalance.part_number) &
        (InventoryMovement.movement_date >= threshold_date)
    ).filter(
        InventoryBalance.available_quantity > 0,
        (InventoryBalance.available_quantity * InventoryBalance.average_cost) >= min_value_threshold,
        InventoryMovement.id.is_(None)  # No recent movements
    ).all()
    
    return [
        {
            "part_number": item.part_number,
            "available_quantity": float(item.available_quantity),
            "average_cost": float(item.average_cost),
            "total_value": float(item.total_value),
            "last_movement_date": item.last_movement_date.isoformat() if item.last_movement_date else None,
            "location_code": item.location_code,
            "days_since_movement": (datetime.now().date() - item.last_movement_date).days if item.last_movement_date else None
        }
        for item in slow_moving
    ]

@router.get("/inventory/analytics/stock-alerts")
async def get_stock_alerts(
    alert_type: str = Query("all", regex="^(all|low_stock|zero_stock|negative_stock|overstock)$"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get stock alert notifications
    """
    alerts = []
    
    if alert_type in ["all", "zero_stock"]:
        zero_stock = db.query(InventoryBalance).filter(
            InventoryBalance.available_quantity == 0
        ).all()
        alerts.extend([
            {
                "type": "zero_stock",
                "part_number": item.part_number,
                "location_id": item.location_id,
                "available_quantity": float(item.available_quantity),
                "message": f"Zero stock for {item.part_number}"
            }
            for item in zero_stock
        ])
    
    if alert_type in ["all", "negative_stock"]:
        negative_stock = db.query(InventoryBalance).filter(
            InventoryBalance.available_quantity < 0
        ).all()
        alerts.extend([
            {
                "type": "negative_stock",
                "part_number": item.part_number,
                "location_id": item.location_id,
                "available_quantity": float(item.available_quantity),
                "message": f"Negative stock for {item.part_number}: {item.available_quantity}"
            }
            for item in negative_stock
        ])
    
    return {
        "alerts": alerts,
        "total_alerts": len(alerts)
    }

# ====================================================================
# DASHBOARD ENDPOINT
# ====================================================================

@router.get("/inventory/dashboard")
async def get_inventory_dashboard(
    warehouse_zone: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get comprehensive inventory dashboard data
    """
    base_query = db.query(InventoryBalance).join(InventoryLocation)
    
    if warehouse_zone:
        base_query = base_query.filter(InventoryLocation.warehouse_zone == warehouse_zone)
    
    # Overall statistics
    overall_stats = base_query.with_entities(
        func.count(InventoryBalance.part_number).label('total_parts'),
        func.sum(InventoryBalance.available_quantity).label('total_available'),
        func.sum(InventoryBalance.reserved_quantity).label('total_reserved'),
        func.sum(InventoryBalance.available_quantity * InventoryBalance.average_cost).label('total_value')
    ).first()
    
    # Recent movements (last 7 days)
    recent_movements = db.query(
        func.count(InventoryMovement.id).label('total_movements'),
        func.sum(InventoryMovement.quantity).label('total_quantity_moved')
    ).filter(
        InventoryMovement.movement_date >= datetime.now().date() - timedelta(days=7)
    ).first()
    
    # Active reservations
    active_reservations = db.query(
        func.count(StockReservation.id).label('total_reservations'),
        func.sum(StockReservation.reserved_quantity).label('total_reserved_qty')
    ).filter(StockReservation.status == 'active').first()
    
    # Pending cycle counts
    pending_counts = db.query(func.count(CycleCount.id)).filter(
        CycleCount.status == 'pending'
    ).scalar()
    
    return {
        "summary": {
            "total_parts": overall_stats.total_parts or 0,
            "total_available_quantity": float(overall_stats.total_available or 0),
            "total_reserved_quantity": float(overall_stats.total_reserved or 0),
            "total_inventory_value": float(overall_stats.total_value or 0)
        },
        "recent_activity": {
            "movements_last_7_days": recent_movements.total_movements or 0,
            "quantity_moved_last_7_days": float(recent_movements.total_quantity_moved or 0)
        },
        "reservations": {
            "active_reservations": active_reservations.total_reservations or 0,
            "total_reserved_quantity": float(active_reservations.total_reserved_qty or 0)
        },
        "cycle_counts": {
            "pending_counts": pending_counts or 0
        },
        "warehouse_zone": warehouse_zone
    }
