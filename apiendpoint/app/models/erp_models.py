"""
ERP Database Models for Query Operations
Mapped to the same database tables used by Node.js Command Service
Read-only access for reporting and analytics
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Date, Time, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, date

Base = declarative_base()

# Core ERP Tables
class InventoryLocation(Base):
    __tablename__ = "inventory_locations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    location_code = Column(String(50), unique=True, nullable=False, index=True)  # Database has varchar(50)
    location_name = Column(String(100), nullable=False)
    location_type = Column(String(20), nullable=False)  # enum in database
    warehouse_zone = Column(String(50))  # Database has 'warehouse_zone', not 'warehouse_section'
    capacity = Column(Numeric(12, 2))  # New field in database
    current_utilization = Column(Numeric(12, 2), default=0.00)  # New field in database
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class InventoryBalance(Base):
    __tablename__ = "inventory_balances"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    part_number = Column(String(100), nullable=False, index=True)  # Database has varchar(100)
    location_id = Column(Integer, ForeignKey("inventory_locations.id"), nullable=False)
    available_quantity = Column(Numeric(12, 3), default=0.000)  # Match database precision
    reserved_quantity = Column(Numeric(12, 3), default=0.000)
    quarantine_quantity = Column(Numeric(12, 3), default=0.000)  # New field in database
    average_cost = Column(Numeric(12, 2), default=0.00)  # Match database precision
    last_movement_date = Column(DateTime)
    last_count_date = Column(DateTime)  # New field in database
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    location = relationship("InventoryLocation", backref="balances")

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    movement_number = Column(String(50), unique=True, nullable=False, index=True)  # Database has varchar(50)
    part_number = Column(String(100), nullable=False, index=True)  # Database has varchar(100)
    movement_type = Column(String(20), nullable=False)  # ENUM: in, out, transfer, adjustment, scrap
    from_location_id = Column(Integer, ForeignKey("inventory_locations.id"))
    to_location_id = Column(Integer, ForeignKey("inventory_locations.id"))
    quantity = Column(Numeric(12, 3), nullable=False)  # Database has decimal(12,3)
    unit_cost = Column(Numeric(12, 2))  # Database has decimal(12,2)
    reference_type = Column(String(20))  # ENUM: production, delivery, receipt, adjustment, transfer, scrap
    reference_id = Column(Integer)
    reason_code = Column(String(50))  # Database has varchar(50)
    notes = Column(Text)
    user_id = Column(Integer)
    movement_date = Column(DateTime)  # Database has timestamp, no default needed
    # created_at = Column(DateTime, default=datetime.utcnow)  # Column doesn't exist in database
    
    # Relationships
    from_location = relationship("InventoryLocation", foreign_keys=[from_location_id])
    to_location = relationship("InventoryLocation", foreign_keys=[to_location_id])

class Machine(Base):
    __tablename__ = "machines"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_code = Column(String(50), nullable=False, index=True)
    machine_name = Column(String(100), nullable=False)
    machine_type = Column(String(50))
    location_id = Column(Integer)  # Database has 'location_id', not 'location'
    capacity_per_hour = Column(Numeric(8, 2))
    status = Column(String(20), default='active')  # Database has ENUM
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_code = Column(String(20), unique=True, nullable=False, index=True)
    supplier_name = Column(String(100), nullable=False)
    contact_person = Column(String(100))
    phone = Column(String(20))
    email = Column(String(100))
    address = Column(Text)
    payment_terms = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    po_number = Column(String(30), unique=True, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    order_date = Column(Date, nullable=False)
    expected_delivery = Column(Date)
    status = Column(String(20), default='draft')  # draft, sent, confirmed, received, closed
    total_amount = Column(Numeric(15, 2))
    notes = Column(Text)
    created_by = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    supplier = relationship("Supplier", backref="purchase_orders")

class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    po_id = Column(Integer, ForeignKey("purchase_orders.id"), nullable=False)
    part_number = Column(String(50), nullable=False)
    description = Column(String(200))
    quantity_ordered = Column(Numeric(15, 3), nullable=False)
    quantity_received = Column(Numeric(15, 3), default=0)
    unit_price = Column(Numeric(15, 4), nullable=False)
    total_price = Column(Numeric(15, 2))
    expected_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    purchase_order = relationship("PurchaseOrder", backref="items")

class BillOfMaterials(Base):
    __tablename__ = "bill_of_materials"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    parent_part_number = Column(String(50), nullable=False, index=True)
    child_part_number = Column(String(50), nullable=False, index=True)
    quantity_required = Column(Numeric(15, 6), nullable=False)
    unit_of_measure = Column(String(10), nullable=False)
    scrap_factor = Column(Numeric(5, 4), default=0)
    operation_sequence = Column(Integer, default=1)
    effective_date = Column(Date, nullable=False)
    expiry_date = Column(Date)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ProductionSchedule(Base):
    __tablename__ = "production_schedules"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_number = Column(String(30), unique=True, nullable=False, index=True)
    production_order_id = Column(Integer, nullable=False, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    operator_id = Column(Integer)
    scheduled_start = Column(DateTime, nullable=False)
    scheduled_end = Column(DateTime, nullable=False)
    actual_start = Column(DateTime)
    actual_end = Column(DateTime)
    status = Column(String(20), default='scheduled')  # scheduled, started, completed, cancelled
    priority = Column(Integer, default=5)
    estimated_runtime_minutes = Column(Integer)
    actual_runtime_minutes = Column(Integer)
    # efficiency_percentage = Column(Numeric(5, 2))  # Column doesn't exist in database
    notes = Column(Text)
    created_by = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    machine = relationship("Machine", backref="schedules")

class WorkflowState(Base):
    __tablename__ = "workflow_states"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String(50), nullable=False, index=True)  # production_order, quality_check, etc
    entity_id = Column(Integer, nullable=False, index=True)
    current_state = Column(String(50), nullable=False)
    previous_state = Column(String(50))
    state_data = Column(Text)  # JSON data for additional state information
    changed_by = Column(Integer)
    changed_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ProductionOrder(Base):
    __tablename__ = "production_orders"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_order = Column(String(50), nullable=False, index=True)  # Database has varchar(50)
    part_number = Column(String(100), nullable=False, index=True)  # Database has varchar(100)
    plan_quantity = Column(Numeric(12, 2), nullable=False)  # Database has decimal(12,2)
    machine_name = Column(String(100))  # This field exists in database
    start_date = Column(Date, nullable=False)
    status = Column(String(20), default='running')  # Database has ENUM with 'running' as default
    workflow_status = Column(String(20), default='planning')  # Database has this field
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class OutputMc(Base):
    __tablename__ = "output_mc"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_order = Column(String(30), nullable=False, index=True)
    operation_date = Column(Date, nullable=False)
    shift = Column(String(10), nullable=False)
    part_number = Column(String(50), nullable=False)
    part_name = Column(String(200))
    machine_name = Column(String(100))
    actual_quantity = Column(Numeric(10, 2), nullable=False)
    ng_quantity = Column(Numeric(10, 2), default=0)
    operator_name = Column(String(100))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MasterProd(Base):
    __tablename__ = "master_prod"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    part_number = Column(String(100), unique=True, nullable=False, index=True)  # Database has varchar(100)
    description = Column(Text)  # Database has 'description', not 'part_name'
    unit_of_measure = Column(String(20), default='PCS')  # Database has varchar(20)
    standard_cost = Column(Numeric(12, 2), default=0.00)  # Database has decimal(12,2)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
