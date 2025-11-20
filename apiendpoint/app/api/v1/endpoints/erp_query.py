"""
ERP Query Router
Production-ready endpoints for querying ERP data
Read-only operations for analytics and reporting
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, asc
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
import logging

from app.database.session import get_db
from app.models.erp_models import (
    InventoryLocation, InventoryBalance, InventoryMovement,
    Machine, Supplier, PurchaseOrder, PurchaseOrderItem,
    BillOfMaterials, ProductionSchedule, WorkflowState,
    User, ProductionOrder, OutputMc, MasterProd
)

logger = logging.getLogger(__name__)
router = APIRouter()

# ===============================================
# INVENTORY QUERIES
# ===============================================

@router.get("/inventory/locations", tags=["Inventory"])
async def get_inventory_locations(
    location_type: Optional[str] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db)
):
    """Get all inventory locations with optional filtering"""
    try:
        query = db.query(InventoryLocation)
        
        if location_type:
            query = query.filter(InventoryLocation.location_type == location_type)
        if is_active is not None:
            query = query.filter(InventoryLocation.is_active == is_active)
            
        locations = query.order_by(InventoryLocation.location_code).all()
        return {
            "success": True,
            "count": len(locations),
            "data": locations
        }
    except Exception as e:
        logger.error(f"Error getting inventory locations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/inventory/balances", tags=["Inventory"])
async def get_inventory_balances(
    part_number: Optional[str] = None,
    location_code: Optional[str] = None,
    min_quantity: Optional[float] = None,
    include_zero: bool = False,
    db: Session = Depends(get_db)
):
    """Get inventory balances with comprehensive filtering"""
    try:
        query = db.query(
            InventoryBalance,
            InventoryLocation.location_code,
            InventoryLocation.location_name,
            InventoryLocation.location_type
        ).join(InventoryLocation)
        
        if part_number:
            query = query.filter(InventoryBalance.part_number.like(f"%{part_number}%"))
        if location_code:
            query = query.filter(InventoryLocation.location_code == location_code)
        if min_quantity is not None:
            query = query.filter(InventoryBalance.available_quantity >= min_quantity)
        if not include_zero:
            query = query.filter(InventoryBalance.available_quantity > 0)
            
        results = query.order_by(
            InventoryBalance.part_number,
            InventoryLocation.location_code
        ).all()
        
        # Format response
        balances = []
        total_value = 0
        for balance, loc_code, loc_name, loc_type in results:
            item_value = float(balance.available_quantity * balance.average_cost)
            total_value += item_value
            
            balances.append({
                "part_number": balance.part_number,
                "location_code": loc_code,
                "location_name": loc_name,
                "location_type": loc_type,
                "available_quantity": float(balance.available_quantity),
                "reserved_quantity": float(balance.reserved_quantity),
                "allocated_quantity": float(balance.allocated_quantity),
                "average_cost": float(balance.average_cost),
                "total_value": item_value,
                "last_movement_date": balance.last_movement_date
            })
        
        return {
            "success": True,
            "count": len(balances),
            "total_value": total_value,
            "data": balances
        }
    except Exception as e:
        logger.error(f"Error getting inventory balances: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/inventory/movements", tags=["Inventory"])
async def get_inventory_movements(
    part_number: Optional[str] = None,
    movement_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get inventory movements with date filtering and pagination"""
    try:
        query = db.query(InventoryMovement)
        
        if part_number:
            query = query.filter(InventoryMovement.part_number.like(f"%{part_number}%"))
        if movement_type:
            query = query.filter(InventoryMovement.movement_type == movement_type)
        if date_from:
            query = query.filter(InventoryMovement.movement_date >= date_from)
        if date_to:
            query = query.filter(InventoryMovement.movement_date <= date_to)
            
        total_count = query.count()
        movements = query.order_by(desc(InventoryMovement.movement_date)).offset(offset).limit(limit).all()
        
        return {
            "success": True,
            "count": len(movements),
            "total_count": total_count,
            "offset": offset,
            "limit": limit,
            "data": movements
        }
    except Exception as e:
        logger.error(f"Error getting inventory movements: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===============================================
# PRODUCTION QUERIES
# ===============================================

@router.get("/production/orders", tags=["Production"])
async def get_production_orders(
    status: Optional[str] = None,
    part_number: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get production orders with comprehensive filtering"""
    try:
        query = db.query(ProductionOrder)
        
        if status:
            query = query.filter(ProductionOrder.status == status)
        if part_number:
            query = query.filter(ProductionOrder.part_number.like(f"%{part_number}%"))
        if date_from:
            query = query.filter(ProductionOrder.start_date >= date_from)
        if date_to:
            query = query.filter(ProductionOrder.start_date <= date_to)
            
        total_count = query.count()
        orders = query.order_by(desc(ProductionOrder.created_at)).offset(offset).limit(limit).all()
        
        return {
            "success": True,
            "count": len(orders),
            "total_count": total_count,
            "offset": offset,
            "limit": limit,
            "data": orders
        }
    except Exception as e:
        logger.error(f"Error getting production orders: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/production/schedules", tags=["Production"])
async def get_production_schedules(
    machine_id: Optional[int] = None,
    status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get production schedules with machine and date filtering"""
    try:
        query = db.query(
            ProductionSchedule,
            Machine.machine_code,
            Machine.machine_name
        ).join(Machine)
        
        if machine_id:
            query = query.filter(ProductionSchedule.machine_id == machine_id)
        if status:
            query = query.filter(ProductionSchedule.status == status)
        if date_from:
            query = query.filter(ProductionSchedule.scheduled_start >= date_from)
        if date_to:
            query = query.filter(ProductionSchedule.scheduled_start <= date_to)
            
        results = query.order_by(ProductionSchedule.scheduled_start).all()
        
        schedules = []
        for schedule, machine_code, machine_name in results:
            schedules.append({
                "id": schedule.id,
                "schedule_number": schedule.schedule_number,
                "production_order_id": schedule.production_order_id,
                "machine_code": machine_code,
                "machine_name": machine_name,
                "scheduled_start": schedule.scheduled_start,
                "scheduled_end": schedule.scheduled_end,
                "actual_start": schedule.actual_start,
                "actual_end": schedule.actual_end,
                "status": schedule.status,
                "priority": schedule.priority,
                "estimated_runtime_minutes": schedule.estimated_runtime_minutes,
                "actual_runtime_minutes": schedule.actual_runtime_minutes,
                "efficiency_percentage": float(schedule.efficiency_percentage) if schedule.efficiency_percentage else None,
                "notes": schedule.notes
            })
        
        return {
            "success": True,
            "count": len(schedules),
            "data": schedules
        }
    except Exception as e:
        logger.error(f"Error getting production schedules: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/production/output", tags=["Production"])
async def get_production_output(
    job_order: Optional[str] = None,
    part_number: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    shift: Optional[str] = None,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get production output records"""
    try:
        query = db.query(OutputMc)
        
        if job_order:
            query = query.filter(OutputMc.job_order.like(f"%{job_order}%"))
        if part_number:
            query = query.filter(OutputMc.part_number.like(f"%{part_number}%"))
        if date_from:
            query = query.filter(OutputMc.operation_date >= date_from)
        if date_to:
            query = query.filter(OutputMc.operation_date <= date_to)
        if shift:
            query = query.filter(OutputMc.shift == shift)
            
        total_count = query.count()
        outputs = query.order_by(desc(OutputMc.operation_date)).offset(offset).limit(limit).all()
        
        return {
            "success": True,
            "count": len(outputs),
            "total_count": total_count,
            "offset": offset,
            "limit": limit,
            "data": outputs
        }
    except Exception as e:
        logger.error(f"Error getting production output: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===============================================
# BOM & MATERIAL QUERIES
# ===============================================

@router.get("/bom/{parent_part_number}", tags=["BOM"])
async def get_bom_by_part(
    parent_part_number: str,
    include_inactive: bool = False,
    db: Session = Depends(get_db)
):
    """Get Bill of Materials for a specific part number"""
    try:
        query = db.query(BillOfMaterials).filter(
            BillOfMaterials.parent_part_number == parent_part_number
        )
        
        if not include_inactive:
            query = query.filter(BillOfMaterials.is_active == True)
            
        bom_items = query.order_by(BillOfMaterials.operation_sequence).all()
        
        if not bom_items:
            raise HTTPException(status_code=404, detail="BOM not found for this part number")
        
        return {
            "success": True,
            "parent_part_number": parent_part_number,
            "count": len(bom_items),
            "data": bom_items
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting BOM: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bom/calculate-requirements", tags=["BOM"])
async def calculate_material_requirements(
    parent_part_number: str,
    production_quantity: float,
    db: Session = Depends(get_db)
):
    """Calculate material requirements for production quantity"""
    try:
        # Get BOM items
        bom_items = db.query(BillOfMaterials).filter(
            and_(
                BillOfMaterials.parent_part_number == parent_part_number,
                BillOfMaterials.is_active == True
            )
        ).all()
        
        if not bom_items:
            raise HTTPException(status_code=404, detail="BOM not found")
        
        requirements = []
        total_shortage = 0
        
        for item in bom_items:
            # Calculate required quantity with scrap factor
            required_qty = production_quantity * item.quantity_required * (1 + item.scrap_factor)
            
            # Get available inventory
            available = db.query(func.sum(InventoryBalance.available_quantity)).filter(
                InventoryBalance.part_number == item.child_part_number
            ).scalar() or 0
            
            shortage = max(0, required_qty - float(available))
            total_shortage += shortage
            
            requirements.append({
                "child_part_number": item.child_part_number,
                "quantity_required": item.quantity_required,
                "scrap_factor": float(item.scrap_factor),
                "total_required": required_qty,
                "available_quantity": float(available),
                "shortage": shortage,
                "unit_of_measure": item.unit_of_measure,
                "operation_sequence": item.operation_sequence
            })
        
        can_produce = total_shortage == 0
        
        return {
            "success": True,
            "parent_part_number": parent_part_number,
            "production_quantity": production_quantity,
            "can_produce": can_produce,
            "total_shortage": total_shortage,
            "requirements": requirements
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating material requirements: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===============================================
# MACHINE & RESOURCE QUERIES
# ===============================================

@router.get("/machines", tags=["Machines"])
async def get_machines(
    is_active: Optional[bool] = True,
    machine_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all machines with optional filtering"""
    try:
        query = db.query(Machine)
        
        if is_active is not None:
            query = query.filter(Machine.is_active == is_active)
        if machine_type:
            query = query.filter(Machine.machine_type == machine_type)
            
        machines = query.order_by(Machine.machine_code).all()
        
        return {
            "success": True,
            "count": len(machines),
            "data": machines
        }
    except Exception as e:
        logger.error(f"Error getting machines: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===============================================
# DASHBOARD & ANALYTICS
# ===============================================

@router.get("/dashboard/summary", tags=["Dashboard"])
async def get_dashboard_summary(db: Session = Depends(get_db)):
    """Get comprehensive dashboard summary"""
    try:
        # Production statistics
        total_orders = db.query(ProductionOrder).count()
        active_orders = db.query(ProductionOrder).filter(
            ProductionOrder.status.in_(['planning', 'running', 'in_production'])
        ).count()
        
        # Machine statistics
        total_machines = db.query(Machine).filter(Machine.is_active == True).count()
        
        # Try to get active schedules, but handle if table doesn't exist
        try:
            active_schedules = db.query(ProductionSchedule).filter(
                ProductionSchedule.status == 'started'
            ).count()
        except Exception as e:
            logger.warning(f"ProductionSchedule table not available: {e}")
            active_schedules = 0
        
        # Inventory statistics
        total_locations = db.query(InventoryLocation).filter(
            InventoryLocation.is_active == True
        ).count()
        
        total_inventory_value = db.query(
            func.sum(InventoryBalance.available_quantity * InventoryBalance.average_cost)
        ).scalar() or 0
        
        # Recent movements - handle if table doesn't exist
        try:
            recent_movements = db.query(InventoryMovement).order_by(
                desc(InventoryMovement.movement_date)
            ).limit(10).all()
        except Exception as e:
            logger.warning(f"InventoryMovement table not available: {e}")
            recent_movements = []
        
        # WIP inventory
        wip_items = db.query(InventoryBalance, InventoryLocation).join(
            InventoryLocation
        ).filter(
            and_(
                InventoryLocation.location_type == 'wip',
                InventoryBalance.available_quantity > 0
            )
        ).count()
        
        return {
            "success": True,
            "summary": {
                "production": {
                    "total_orders": total_orders,
                    "active_orders": active_orders,
                    "completion_rate": f"{((total_orders - active_orders) / total_orders * 100):.1f}%" if total_orders > 0 else "0%"
                },
                "machines": {
                    "total_machines": total_machines,
                    "active_machines": active_schedules,
                    "utilization_rate": f"{(active_schedules / total_machines * 100):.1f}%" if total_machines > 0 else "0%"
                },
                "inventory": {
                    "total_locations": total_locations,
                    "total_value": float(total_inventory_value),
                    "wip_items": wip_items
                }
            },
            "recent_movements": len(recent_movements)
        }
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===============================================
# MASTER DATA QUERIES
# ===============================================

@router.get("/master/products", tags=["Master Data"])
async def get_master_products(
    part_number: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[bool] = True,
    limit: int = Query(100, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get master product data"""
    try:
        query = db.query(MasterProd)
        
        if part_number:
            query = query.filter(MasterProd.part_number.like(f"%{part_number}%"))
        if category:
            query = query.filter(MasterProd.category == category)
        if is_active is not None:
            query = query.filter(MasterProd.is_active == is_active)
            
        total_count = query.count()
        products = query.order_by(MasterProd.part_number).offset(offset).limit(limit).all()
        
        return {
            "success": True,
            "count": len(products),
            "total_count": total_count,
            "offset": offset,
            "limit": limit,
            "data": products
        }
    except Exception as e:
        logger.error(f"Error getting master products: {e}")
        raise HTTPException(status_code=500, detail=str(e))
