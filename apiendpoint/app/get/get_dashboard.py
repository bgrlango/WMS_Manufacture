from sqlalchemy.orm import Session, joinedload
from app.models import production_order, stock_wip, output_mc

def get_dashboard_data(db: Session):
    active_orders = db.query(production_order.ProductionOrder)\
        .options(joinedload(production_order.ProductionOrder.master_prod))\
        .filter(production_order.ProductionOrder.status.in_(['running', 'pending']))\
        .order_by(production_order.ProductionOrder.created_at.desc())\
        .limit(10).all()

    wip_stock = db.query(stock_wip.StockWip)\
        .order_by(stock_wip.StockWip.last_updated.desc())\
        .limit(20).all()

    recent_outputs = db.query(output_mc.OutputMc)\
        .order_by(output_mc.OutputMc.created_at.desc())\
        .limit(10).all()

    return {
        "active_production_orders": active_orders,
        "current_wip_stock": wip_stock,
        "recent_machine_outputs": recent_outputs
    }
