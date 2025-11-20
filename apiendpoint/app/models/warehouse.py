"""
Warehouse SQLAlchemy Models for FastAPI
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base

class InventoryBalance(Base):
    __tablename__ = "inventory_balances"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    part_number = Column(String(100), nullable=False)
    location_id = Column(Integer, ForeignKey('inventory_locations.id'), nullable=False)
    available_quantity = Column(Float, default=0, nullable=False)
    reserved_quantity = Column(Float, default=0, nullable=False)
    quarantine_quantity = Column(Float, default=0, nullable=False)
    average_cost = Column(Float, default=0, nullable=False)
    reorder_point = Column(Float, nullable=True)
    max_stock_level = Column(Float, nullable=True)
    last_movement_date = Column(Date, nullable=True)
    last_count_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    location = relationship("InventoryLocation", back_populates="balances")
    movements_from = relationship("InventoryMovement", foreign_keys="InventoryMovement.from_location_id", back_populates="from_location_ref")
    movements_to = relationship("InventoryMovement", foreign_keys="InventoryMovement.to_location_id", back_populates="to_location_ref")
    reservations = relationship("StockReservation", back_populates="balance_location")
    
    # Indexes
    __table_args__ = (
        Index('idx_inv_balance_part_location', 'part_number', 'location_id'),
        Index('idx_inv_balance_part', 'part_number'),
        Index('idx_inv_balance_location', 'location_id'),
        Index('idx_inv_balance_available_qty', 'available_quantity'),
        Index('idx_inv_balance_last_movement', 'last_movement_date'),
    )

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    movement_number = Column(String(50), nullable=False, unique=True)
    part_number = Column(String(100), nullable=False)
    movement_type = Column(String(20), nullable=False)  # in, out, transfer, adjustment
    from_location_id = Column(Integer, ForeignKey('inventory_locations.id'), nullable=True)
    to_location_id = Column(Integer, ForeignKey('inventory_locations.id'), nullable=True)
    quantity = Column(Float, nullable=False)
    unit_cost = Column(Float, nullable=True)
    reference_type = Column(String(50), nullable=False)  # production_order, transfer_request, adjustment, etc.
    reference_id = Column(String(100), nullable=True)
    reason_code = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    user_id = Column(Integer, nullable=False)  # Foreign key to users table
    movement_date = Column(Date, server_default=func.curdate(), nullable=False)
    batch_number = Column(String(50), nullable=True)
    expiry_date = Column(Date, nullable=True)
    serial_numbers = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    from_location_ref = relationship("InventoryLocation", foreign_keys=[from_location_id], back_populates="movements_from")
    to_location_ref = relationship("InventoryLocation", foreign_keys=[to_location_id], back_populates="movements_to")
    
    # Indexes
    __table_args__ = (
        Index('idx_inv_movement_part', 'part_number'),
        Index('idx_inv_movement_type', 'movement_type'),
        Index('idx_inv_movement_date', 'movement_date'),
        Index('idx_inv_movement_reference', 'reference_type', 'reference_id'),
        Index('idx_inv_movement_user', 'user_id'),
        Index('idx_inv_movement_from_location', 'from_location_id'),
        Index('idx_inv_movement_to_location', 'to_location_id'),
        Index('idx_inv_movement_number', 'movement_number'),
    )

class InventoryLocation(Base):
    __tablename__ = "inventory_locations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    location_code = Column(String(50), nullable=False, unique=True)
    location_name = Column(String(255), nullable=False)
    location_type = Column(String(50), nullable=False)  # warehouse, staging, quarantine, shipping, receiving
    warehouse_zone = Column(String(50), nullable=True)
    aisle = Column(String(20), nullable=True)
    rack = Column(String(20), nullable=True)
    shelf = Column(String(20), nullable=True)
    bin = Column(String(20), nullable=True)
    capacity = Column(Float, nullable=True)
    temperature_controlled = Column(Boolean, default=False, nullable=False)
    hazardous_materials = Column(Boolean, default=False, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    balances = relationship("InventoryBalance", back_populates="location")
    movements_from = relationship("InventoryMovement", foreign_keys="InventoryMovement.from_location_id", back_populates="from_location_ref")
    movements_to = relationship("InventoryMovement", foreign_keys="InventoryMovement.to_location_id", back_populates="to_location_ref")
    reservations = relationship("StockReservation", back_populates="location")
    cycle_counts = relationship("CycleCount", back_populates="location")
    
    # Indexes
    __table_args__ = (
        Index('idx_inv_location_code', 'location_code'),
        Index('idx_inv_location_type', 'location_type'),
        Index('idx_inv_location_zone', 'warehouse_zone'),
        Index('idx_inv_location_active', 'active'),
        Index('idx_inv_location_zone_aisle_rack', 'warehouse_zone', 'aisle', 'rack'),
    )

class StockReservation(Base):
    __tablename__ = "stock_reservations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    reservation_number = Column(String(50), nullable=False, unique=True)
    part_number = Column(String(100), nullable=False)
    location_id = Column(Integer, ForeignKey('inventory_locations.id'), nullable=False)
    reserved_quantity = Column(Float, nullable=False)
    reservation_type = Column(String(50), nullable=False)  # production, sales_order, transfer, etc.
    reference_id = Column(String(100), nullable=True)
    reserved_by = Column(Integer, nullable=False)  # Foreign key to users table
    expiry_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(20), default='active', nullable=False)  # active, consumed, cancelled, expired
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    location = relationship("InventoryLocation", back_populates="reservations")
    balance_location = relationship("InventoryBalance", foreign_keys="InventoryBalance.location_id", viewonly=True)
    
    # Indexes
    __table_args__ = (
        Index('idx_stock_res_part', 'part_number'),
        Index('idx_stock_res_location', 'location_id'),
        Index('idx_stock_res_type', 'reservation_type'),
        Index('idx_stock_res_status', 'status'),
        Index('idx_stock_res_reserved_by', 'reserved_by'),
        Index('idx_stock_res_reference', 'reference_id'),
        Index('idx_stock_res_expiry', 'expiry_date'),
        Index('idx_stock_res_number', 'reservation_number'),
    )

class CycleCount(Base):
    __tablename__ = "cycle_counts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    count_number = Column(String(50), nullable=False, unique=True)
    location_id = Column(Integer, ForeignKey('inventory_locations.id'), nullable=False)
    count_date = Column(Date, nullable=False)
    count_type = Column(String(20), nullable=False)  # full, partial, spot
    assigned_to = Column(Integer, nullable=True)  # Foreign key to users table
    created_by = Column(Integer, nullable=False)  # Foreign key to users table
    approved_by = Column(Integer, nullable=True)  # Foreign key to users table
    status = Column(String(20), default='pending', nullable=False)  # pending, in_progress, completed, cancelled
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    location = relationship("InventoryLocation", back_populates="cycle_counts")
    details = relationship("CycleCountDetail", back_populates="cycle_count", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_cycle_count_location', 'location_id'),
        Index('idx_cycle_count_date', 'count_date'),
        Index('idx_cycle_count_type', 'count_type'),
        Index('idx_cycle_count_status', 'status'),
        Index('idx_cycle_count_assigned', 'assigned_to'),
        Index('idx_cycle_count_created_by', 'created_by'),
        Index('idx_cycle_count_number', 'count_number'),
    )

class CycleCountDetail(Base):
    __tablename__ = "cycle_count_details"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    cycle_count_id = Column(Integer, ForeignKey('cycle_counts.id'), nullable=False)
    part_number = Column(String(100), nullable=False)
    system_quantity = Column(Float, nullable=False)
    counted_quantity = Column(Float, nullable=True)
    variance_quantity = Column(Float, nullable=True)
    variance_value = Column(Float, nullable=True)
    reason_code = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    counted_by = Column(Integer, nullable=True)  # Foreign key to users table
    counted_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    cycle_count = relationship("CycleCount", back_populates="details")
    
    # Indexes
    __table_args__ = (
        Index('idx_cycle_count_detail_count_id', 'cycle_count_id'),
        Index('idx_cycle_count_detail_part', 'part_number'),
        Index('idx_cycle_count_detail_variance', 'variance_quantity'),
        Index('idx_cycle_count_detail_counted_by', 'counted_by'),
    )
