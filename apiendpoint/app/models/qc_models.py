"""
Quality Control (QC) Models for FastAPI
Enhanced QC system with comprehensive tracking
"""
from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, DECIMAL, Boolean, DateTime, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.base import Base

class QCInspectionPlan(Base):
    __tablename__ = "qc_inspection_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    plan_code = Column(String(50), unique=True, nullable=False, comment="QC Plan reference code")
    part_number = Column(String(100), ForeignKey("master_prod.part_number"), nullable=False)
    plan_name = Column(String(255), nullable=False)
    inspection_type = Column(Enum('incoming', 'in_process', 'final', 'customer_return', name='inspection_type_enum'), nullable=False)
    sampling_method = Column(Enum('100_percent', 'statistical', 'mil_std', 'custom', name='sampling_method_enum'), default='statistical')
    sample_size = Column(Integer, default=1)
    acceptance_criteria = Column(JSON, comment="Criteria for pass/fail decisions")
    inspection_points = Column(JSON, comment="List of measurement points and tolerances")
    required_tools = Column(String(500), comment="Required inspection tools/equipment")
    estimated_time_minutes = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP, default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, default=func.current_timestamp(), onupdate=func.current_timestamp())

class QCInspectionResult(Base):
    __tablename__ = "qc_inspection_results"
    
    id = Column(Integer, primary_key=True, index=True)
    inspection_number = Column(String(50), unique=True, nullable=False, comment="QC inspection reference")
    qc_plan_id = Column(Integer, ForeignKey("qc_inspection_plans.id"), nullable=False)
    source_type = Column(Enum('production', 'receiving', 'return', 'audit', name='source_type_enum'), nullable=False)
    source_reference_id = Column(Integer, comment="Reference to production order, delivery, etc")
    lot_number = Column(String(255), nullable=False)
    part_number = Column(String(100), ForeignKey("master_prod.part_number"), nullable=False)
    quantity_inspected = Column(DECIMAL(12,3), nullable=False)
    quantity_passed = Column(DECIMAL(12,3), default=0.00)
    quantity_failed = Column(DECIMAL(12,3), default=0.00)
    quantity_rework = Column(DECIMAL(12,3), default=0.00)
    inspector_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    inspection_start_time = Column(DateTime)
    inspection_end_time = Column(DateTime)
    inspection_location = Column(String(100))
    measurement_data = Column(JSON, comment="Actual measurements and values")
    defect_codes = Column(JSON, comment="List of defect codes found")
    corrective_actions = Column(Text, comment="Actions taken to address issues")
    inspector_notes = Column(Text)
    inspection_status = Column(Enum('pending', 'in_progress', 'completed', 'cancelled', name='inspection_status_enum'), default='pending')
    overall_result = Column(Enum('pass', 'fail', 'conditional', name='result_enum'))
    created_at = Column(TIMESTAMP, default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, default=func.current_timestamp(), onupdate=func.current_timestamp())

class QCDefectCode(Base):
    __tablename__ = "qc_defect_codes"
    
    id = Column(Integer, primary_key=True, index=True)
    defect_code = Column(String(20), unique=True, nullable=False)
    defect_category = Column(String(50), nullable=False)
    defect_description = Column(String(255), nullable=False)
    severity_level = Column(Enum('critical', 'major', 'minor', 'cosmetic', name='severity_enum'), default='minor')
    standard_action = Column(Text, comment="Standard corrective action")
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, default=func.current_timestamp(), onupdate=func.current_timestamp())

class QCNonConformance(Base):
    __tablename__ = "qc_non_conformance"
    
    id = Column(Integer, primary_key=True, index=True)
    ncr_number = Column(String(50), unique=True, nullable=False, comment="Non-conformance report number")
    inspection_result_id = Column(Integer, ForeignKey("qc_inspection_results.id"), nullable=False)
    ncr_type = Column(Enum('material', 'process', 'equipment', 'documentation', 'customer_complaint', name='ncr_type_enum'), nullable=False)
    part_number = Column(String(100), ForeignKey("master_prod.part_number"), nullable=False)
    lot_number = Column(String(255), nullable=False)
    quantity_affected = Column(DECIMAL(12,3), nullable=False)
    problem_description = Column(Text, nullable=False)
    immediate_action = Column(Text, nullable=False)
    priority = Column(Enum('low', 'medium', 'high', 'critical', name='priority_enum'), default='medium')
    status = Column(Enum('open', 'investigating', 'action_required', 'closed', 'cancelled', name='ncr_status_enum'), default='open')
    reported_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_to = Column(Integer, ForeignKey("users.id"))
    target_close_date = Column(DateTime)
    actual_close_date = Column(DateTime)
    created_at = Column(TIMESTAMP, default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, default=func.current_timestamp(), onupdate=func.current_timestamp())

class QCCalibrationRecord(Base):
    __tablename__ = "qc_calibration_records"
    
    id = Column(Integer, primary_key=True, index=True)
    equipment_id = Column(String(50), nullable=False, comment="Equipment identification")
    equipment_name = Column(String(255), nullable=False)
    calibration_date = Column(DateTime, nullable=False)
    next_calibration_date = Column(DateTime, nullable=False)
    calibration_standard = Column(String(100), comment="Standard used for calibration")
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    calibration_certificate = Column(String(255), comment="Certificate reference")
    calibration_status = Column(Enum('in_service', 'out_of_service', 'limited_use', name='calibration_status_enum'), default='in_service')
    notes = Column(Text)
    created_at = Column(TIMESTAMP, default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, default=func.current_timestamp(), onupdate=func.current_timestamp())
