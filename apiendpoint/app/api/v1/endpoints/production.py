"""
FastAPI Production Query Endpoints - CQRS Query Side
Read-only operations for production data
Handles: GET requests only (commands go to Node.js service)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from app.database.session import get_db
from app.models import ProductionOrder, OutputMc, StockWip
from app.schemas import ProductionOrderSchema, OutputMcSchema, StockWipSchema

router = APIRouter()

# ====================================================================
# PRODUCTION ORDERS QUERIES
# ====================================================================

@router.get("/orders", response_model=List[Dict[str, Any]])
def get_production_orders(
    db: Session = Depends(get_db), 
    skip: int = 0, 
    limit: int = 100,
    status: Optional[str] = None,
    job_order: Optional[str] = None
):
    """Get production orders with optional filtering"""
    query = """
    SELECT 
        po.id, po.job_order, po.part_number, po.plan_quantity,
        po.start_date, po.status, po.workflow_status, po.machine_name,
        po.created_at, po.updated_at,
        COALESCE(SUM(om.actual_quantity), 0) as total_produced,
        COALESCE(SUM(om.ng_quantity), 0) as total_ng,
        CASE 
            WHEN po.plan_quantity > 0 THEN 
                ROUND((COALESCE(SUM(om.actual_quantity), 0) / po.plan_quantity) * 100, 2)
            ELSE 0 
        END as completion_percentage
    FROM production_orders po
    LEFT JOIN output_mc om ON po.job_order = om.job_order
    WHERE 1=1
    """
    params = {}
    
    if status:
        query += " AND po.status = :status"
        params["status"] = status
    
    if job_order:
        query += " AND po.job_order LIKE :job_order"
        params["job_order"] = f"%{job_order}%"
    
    query += " GROUP BY po.id ORDER BY po.created_at DESC LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    result = db.execute(text(query), params)
    return [dict(row) for row in result]

@router.get("/orders/{job_order}")
def get_production_order_detail(job_order: str, db: Session = Depends(get_db)):
    """Get detailed production order information"""
    query = """
    SELECT 
        po.*,
        COALESCE(SUM(om.actual_quantity), 0) as total_produced,
        COALESCE(SUM(om.ng_quantity), 0) as total_ng,
        COUNT(om.id) as output_count
    FROM production_orders po
    LEFT JOIN output_mc om ON po.job_order = om.job_order
    WHERE po.job_order = :job_order
    GROUP BY po.id
    """
    result = db.execute(text(query), {"job_order": job_order}).first()
    if not result:
        raise HTTPException(status_code=404, detail="Production order not found")
    return dict(result)

@router.get("/orders/status/summary")
def get_production_status_summary(db: Session = Depends(get_db)):
    """Get production orders grouped by status"""
    query = """
    SELECT 
        status,
        COUNT(*) as count,
        SUM(plan_quantity) as total_planned,
        AVG(CASE 
            WHEN plan_quantity > 0 THEN 
                (SELECT COALESCE(SUM(actual_quantity), 0) FROM output_mc WHERE job_order = production_orders.job_order) / plan_quantity * 100
            ELSE 0 
        END) as avg_completion
    FROM production_orders 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY status
    ORDER BY count DESC
    """
    result = db.execute(text(query))
    return [dict(row) for row in result]

# ====================================================================
# MACHINE OUTPUT QUERIES
# ====================================================================

@router.get("/outputs", response_model=List[Dict[str, Any]])
def get_machine_outputs(
    db: Session = Depends(get_db), 
    skip: int = 0, 
    limit: int = 100,
    job_order: Optional[str] = None,
    shift: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None
):
    """Get machine outputs with filtering"""
    query = """
    SELECT 
        om.*,
        po.part_number,
        po.plan_quantity,
        po.machine_name
    FROM output_mc om
    JOIN production_orders po ON om.job_order = po.job_order
    WHERE 1=1
    """
    params = {}
    
    if job_order:
        query += " AND om.job_order LIKE :job_order"
        params["job_order"] = f"%{job_order}%"
    
    if shift:
        query += " AND om.shift = :shift"
        params["shift"] = shift
    
    if date_from:
        query += " AND om.operation_date >= :date_from"
        params["date_from"] = date_from
        
    if date_to:
        query += " AND om.operation_date <= :date_to"
        params["date_to"] = date_to
    
    query += " ORDER BY om.operation_date DESC, om.created_at DESC LIMIT :limit OFFSET :skip"
    params["limit"] = limit
    params["skip"] = skip
    
    result = db.execute(text(query), params)
    return [dict(row) for row in result]

@router.get("/outputs/summary/daily")
def get_daily_output_summary(
    db: Session = Depends(get_db),
    days: int = Query(7, description="Number of days to include")
):
    """Get daily production output summary"""
    query = """
    SELECT 
        DATE(om.operation_date) as production_date,
        om.shift,
        COUNT(DISTINCT om.job_order) as orders_count,
        SUM(om.actual_quantity) as total_produced,
        SUM(om.ng_quantity) as total_ng,
        ROUND(
            CASE 
                WHEN SUM(om.actual_quantity + om.ng_quantity) > 0 THEN
                    (SUM(om.actual_quantity) / SUM(om.actual_quantity + om.ng_quantity)) * 100
                ELSE 0 
            END, 2
        ) as yield_percentage
    FROM output_mc om
    WHERE om.operation_date >= DATE_SUB(NOW(), INTERVAL :days DAY)
    GROUP BY DATE(om.operation_date), om.shift
    ORDER BY production_date DESC, om.shift
    """
    result = db.execute(text(query), {"days": days})
    return [dict(row) for row in result]

# ====================================================================
# WIP STOCK QUERIES
# ====================================================================

@router.get("/stock-wip")
def get_wip_stock(
    db: Session = Depends(get_db),
    part_number: Optional[str] = None,
    location: Optional[str] = None
):
    """Get WIP stock levels"""
    query = """
    SELECT 
        sw.*,
        po.job_order,
        po.plan_quantity,
        po.status as order_status
    FROM stock_wip sw
    LEFT JOIN production_orders po ON sw.part_number = po.part_number 
        AND po.status IN ('running', 'completed')
    WHERE sw.quantity > 0
    """
    params = {}
    
    if part_number:
        query += " AND sw.part_number LIKE :part_number"
        params["part_number"] = f"%{part_number}%"
    
    if location:
        query += " AND sw.location LIKE :location"
        params["location"] = f"%{location}%"
    
    query += " ORDER BY sw.part_number, sw.location"
    
    result = db.execute(text(query), params)
    return [dict(row) for row in result]

# ====================================================================
# DASHBOARD & ANALYTICS QUERIES
# ====================================================================

@router.get("/dashboard/overview")
def get_production_dashboard(db: Session = Depends(get_db)):
    """Get production dashboard overview"""
    # Active orders
    active_orders = db.execute(text("""
        SELECT COUNT(*) as count FROM production_orders 
        WHERE status = 'running'
    """)).scalar()
    
    # Today's production
    today_production = db.execute(text("""
        SELECT 
            COALESCE(SUM(actual_quantity), 0) as produced,
            COALESCE(SUM(ng_quantity), 0) as ng
        FROM output_mc 
        WHERE DATE(operation_date) = CURDATE()
    """)).first()
    
    # Efficiency calculation
    efficiency = db.execute(text("""
        SELECT 
            ROUND(
                CASE 
                    WHEN SUM(actual_quantity + ng_quantity) > 0 THEN
                        (SUM(actual_quantity) / SUM(actual_quantity + ng_quantity)) * 100
                    ELSE 0 
                END, 2
            ) as efficiency
        FROM output_mc 
        WHERE operation_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    """)).scalar()
    
    # WIP levels
    wip_count = db.execute(text("""
        SELECT COUNT(*) as count FROM stock_wip WHERE quantity > 0
    """)).scalar()
    
    return {
        "active_orders": active_orders or 0,
        "today_produced": today_production.produced if today_production else 0,
        "today_ng": today_production.ng if today_production else 0,
        "week_efficiency": efficiency or 0,
        "wip_items": wip_count or 0,
        "last_updated": datetime.now().isoformat()
    }

@router.get("/machines/utilization")
def get_machine_utilization(db: Session = Depends(get_db)):
    """Get machine utilization data"""
    query = """
    SELECT 
        machine_name,
        COUNT(DISTINCT job_order) as orders_handled,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as active_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        AVG(DATEDIFF(COALESCE(updated_at, NOW()), created_at)) as avg_cycle_days
    FROM production_orders 
    WHERE machine_name IS NOT NULL 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    GROUP BY machine_name
    ORDER BY orders_handled DESC
    """
    result = db.execute(text(query))
    return [dict(row) for row in result]

# ====================================================================
# SEARCH & FILTER ENDPOINTS
# ====================================================================

@router.get("/search")
def search_production_data(
    q: str = Query(..., description="Search term"),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Search across production orders and outputs"""
    query = """
    (SELECT 
        'order' as type,
        job_order as identifier,
        part_number,
        status,
        created_at,
        NULL as shift
    FROM production_orders 
    WHERE job_order LIKE :search_term 
        OR part_number LIKE :search_term
    )
    UNION ALL
    (SELECT 
        'output' as type,
        job_order as identifier,
        (SELECT part_number FROM production_orders WHERE job_order = output_mc.job_order) as part_number,
        'output' as status,
        created_at,
        shift
    FROM output_mc 
    WHERE job_order LIKE :search_term
    )
    ORDER BY created_at DESC
    LIMIT :limit
    """
    
    search_pattern = f"%{q}%"
    result = db.execute(text(query), {
        "search_term": search_pattern,
        "limit": limit
    })
    return [dict(row) for row in result]

