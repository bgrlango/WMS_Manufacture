"""
Warehouse Pydantic Schemas for FastAPI Responses
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from decimal import Decimal

# ====================================================================
# BASE SCHEMAS
# ====================================================================

class InventoryBalanceBase(BaseModel):
    part_number: str
    location_id: int
    available_quantity: float
    reserved_quantity: Optional[float] = 0
    quarantine_quantity: Optional[float] = 0
    average_cost: Optional[float] = 0
    reorder_point: Optional[float] = None
    max_stock_level: Optional[float] = None
    last_movement_date: Optional[date] = None
    last_count_date: Optional[date] = None

class InventoryBalanceResponse(InventoryBalanceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class InventoryMovementBase(BaseModel):
    movement_number: str
    part_number: str
    movement_type: str
    from_location_id: Optional[int] = None
    to_location_id: Optional[int] = None
    quantity: float
    unit_cost: Optional[float] = None
    reference_type: str
    reference_id: Optional[str] = None
    reason_code: Optional[str] = None
    notes: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    serial_numbers: Optional[str] = None

class InventoryMovementResponse(InventoryMovementBase):
    id: int
    user_id: int
    movement_date: date
    created_at: datetime
    
    class Config:
        from_attributes = True

class InventoryLocationBase(BaseModel):
    location_code: str
    location_name: str
    location_type: str
    warehouse_zone: Optional[str] = None
    aisle: Optional[str] = None
    rack: Optional[str] = None
    shelf: Optional[str] = None
    bin: Optional[str] = None
    capacity: Optional[float] = None
    temperature_controlled: Optional[bool] = False
    hazardous_materials: Optional[bool] = False
    active: Optional[bool] = True

class InventoryLocationResponse(InventoryLocationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class StockReservationBase(BaseModel):
    reservation_number: str
    part_number: str
    location_id: int
    reserved_quantity: float
    reservation_type: str
    reference_id: Optional[str] = None
    reserved_by: int
    expiry_date: Optional[date] = None
    notes: Optional[str] = None
    status: str = "active"

class StockReservationResponse(StockReservationBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CycleCountBase(BaseModel):
    count_number: str
    location_id: int
    count_date: date
    count_type: str
    assigned_to: Optional[int] = None
    created_by: int
    approved_by: Optional[int] = None
    status: str = "pending"
    notes: Optional[str] = None

class CycleCountResponse(CycleCountBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CycleCountDetailBase(BaseModel):
    cycle_count_id: int
    part_number: str
    system_quantity: float
    counted_quantity: Optional[float] = None
    variance_quantity: Optional[float] = None
    variance_value: Optional[float] = None
    reason_code: Optional[str] = None
    notes: Optional[str] = None
    counted_by: Optional[int] = None
    counted_date: Optional[datetime] = None

class CycleCountDetailResponse(CycleCountDetailBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ====================================================================
# COMPLEX RESPONSE SCHEMAS
# ====================================================================

class InventoryBalanceWithLocation(InventoryBalanceResponse):
    location: InventoryLocationResponse

class InventoryMovementWithLocations(InventoryMovementResponse):
    from_location: Optional[InventoryLocationResponse] = None
    to_location: Optional[InventoryLocationResponse] = None

class StockReservationWithDetails(StockReservationResponse):
    location: InventoryLocationResponse
    part_details: Optional[Dict[str, Any]] = None

class CycleCountWithDetails(CycleCountResponse):
    location: InventoryLocationResponse
    details: List[CycleCountDetailResponse] = []
    variance_summary: Optional[Dict[str, float]] = None

# ====================================================================
# SUMMARY AND ANALYTICS SCHEMAS
# ====================================================================

class InventorySummary(BaseModel):
    total_parts: int
    total_available_quantity: float
    total_reserved_quantity: float
    total_quarantine_quantity: float
    total_inventory_value: float
    active_parts: int
    zero_stock_parts: int
    negative_stock_parts: int

class InventoryByZone(BaseModel):
    warehouse_zone: str
    total_parts: int
    total_quantity: float
    total_value: float

class MovementSummary(BaseModel):
    movement_type: str
    count: int
    total_quantity: float
    average_quantity: float
    total_value: float

class DailyMovement(BaseModel):
    date: str
    count: int
    total_quantity: float

class ReservationSummary(BaseModel):
    status: str
    reservation_type: str
    count: int
    total_quantity: float

class VarianceSummary(BaseModel):
    total_items_counted: int
    items_with_variance: int
    variance_percentage: float
    total_absolute_variance: float
    total_absolute_variance_value: float
    significant_variances: int
    significant_variance_threshold: float

class LocationUtilization(BaseModel):
    location: InventoryLocationResponse
    total_parts: int
    total_quantity: float
    total_value: float
    capacity: Optional[float]
    utilization_percentage: float

class ABCAnalysisItem(BaseModel):
    part_number: str
    value: float
    movement_count: Optional[int] = None
    total_moved: Optional[float] = None
    abc_category: Optional[str] = None

class ABCAnalysis(BaseModel):
    analysis_type: str
    period_days: int
    items: List[ABCAnalysisItem]

class SlowMovingItem(BaseModel):
    part_number: str
    available_quantity: float
    average_cost: float
    total_value: float
    last_movement_date: Optional[str]
    location_code: str
    days_since_movement: Optional[int]

class StockAlert(BaseModel):
    type: str  # zero_stock, negative_stock, low_stock, overstock
    part_number: str
    location_id: int
    available_quantity: float
    message: str
    severity: Optional[str] = "medium"

class StockAlerts(BaseModel):
    alerts: List[StockAlert]
    total_alerts: int

# ====================================================================
# DASHBOARD SCHEMAS
# ====================================================================

class DashboardSummary(BaseModel):
    total_parts: int
    total_available_quantity: float
    total_reserved_quantity: float
    total_inventory_value: float

class RecentActivity(BaseModel):
    movements_last_7_days: int
    quantity_moved_last_7_days: float

class ReservationActivity(BaseModel):
    active_reservations: int
    total_reserved_quantity: float

class CycleCountActivity(BaseModel):
    pending_counts: int

class InventoryDashboard(BaseModel):
    summary: DashboardSummary
    recent_activity: RecentActivity
    reservations: ReservationActivity
    cycle_counts: CycleCountActivity
    warehouse_zone: Optional[str] = None

# ====================================================================
# REQUEST SCHEMAS (for validation)
# ====================================================================

class InventoryMovementCreate(BaseModel):
    part_number: str = Field(..., description="Part number")
    movement_type: str = Field(..., pattern="^(in|out|transfer|adjustment)$")
    from_location_id: Optional[int] = None
    to_location_id: Optional[int] = None
    quantity: float = Field(..., gt=0)
    unit_cost: Optional[float] = Field(None, ge=0)
    reference_type: str = Field(..., description="Reference type (e.g., 'production_order', 'transfer_request')")
    reference_id: Optional[str] = None
    reason_code: Optional[str] = None
    notes: Optional[str] = None
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    serial_numbers: Optional[str] = None

class StockReservationCreate(BaseModel):
    part_number: str
    location_id: int
    reserved_quantity: float = Field(..., gt=0)
    reservation_type: str = Field(..., description="Type of reservation")
    reference_id: Optional[str] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None

class StockReservationCancel(BaseModel):
    reason: Optional[str] = None

class CycleCountCreate(BaseModel):
    location_id: int
    count_date: date
    count_type: str = Field(..., pattern="^(full|partial|spot)$")
    assigned_to: Optional[int] = None
    notes: Optional[str] = None

class CycleCountDetailUpdate(BaseModel):
    counted_quantity: float = Field(..., ge=0)
    reason_code: Optional[str] = None
    notes: Optional[str] = None

class CycleCountComplete(BaseModel):
    apply_adjustments: bool = True

class InventoryLocationCreate(BaseModel):
    location_code: str
    location_name: str
    location_type: str
    warehouse_zone: Optional[str] = None
    aisle: Optional[str] = None
    rack: Optional[str] = None
    shelf: Optional[str] = None
    bin: Optional[str] = None
    capacity: Optional[float] = Field(None, gt=0)
    temperature_controlled: Optional[bool] = False
    hazardous_materials: Optional[bool] = False

class InventoryLocationUpdate(BaseModel):
    location_name: Optional[str] = None
    location_type: Optional[str] = None
    warehouse_zone: Optional[str] = None
    aisle: Optional[str] = None
    rack: Optional[str] = None
    shelf: Optional[str] = None
    bin: Optional[str] = None
    capacity: Optional[float] = Field(None, gt=0)
    temperature_controlled: Optional[bool] = None
    hazardous_materials: Optional[bool] = None
    active: Optional[bool] = None

# ====================================================================
# PAGINATED RESPONSE SCHEMAS
# ====================================================================

class PaginatedInventoryBalance(BaseModel):
    items: List[InventoryBalanceResponse]
    total: int
    limit: int
    offset: int

class PaginatedInventoryMovement(BaseModel):
    items: List[InventoryMovementResponse]
    total: int
    limit: int
    offset: int

class PaginatedStockReservation(BaseModel):
    items: List[StockReservationResponse]
    total: int
    limit: int
    offset: int

class PaginatedCycleCount(BaseModel):
    items: List[CycleCountResponse]
    total: int
    limit: int
    offset: int

class PaginatedInventoryLocation(BaseModel):
    items: List[InventoryLocationResponse]
    total: int
    limit: int
    offset: int

# ====================================================================
# ANALYTICS RESPONSE SCHEMAS
# ====================================================================

class InventoryAnalytics(BaseModel):
    abc_analysis: Optional[ABCAnalysis] = None
    slow_moving_items: Optional[List[SlowMovingItem]] = None
    stock_alerts: Optional[StockAlerts] = None
    movement_trends: Optional[List[DailyMovement]] = None
    location_utilization: Optional[List[LocationUtilization]] = None

# ====================================================================
# ERROR RESPONSE SCHEMAS
# ====================================================================

class ErrorResponse(BaseModel):
    message: str
    status: str = "error"
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class ValidationErrorResponse(BaseModel):
    message: str
    status: str = "validation_error"
    errors: List[Dict[str, Any]]

# ====================================================================
# SUCCESS RESPONSE SCHEMAS
# ====================================================================

class SuccessResponse(BaseModel):
    message: str
    status: str = "success"
    data: Optional[Dict[str, Any]] = None

class CreatedResponse(BaseModel):
    message: str
    status: str = "success"
    data: Dict[str, Any]
    id: Optional[int] = None
