"""
QC Query Operations for FastAPI (CQRS)
Handles all read operations for Quality Control
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, func, desc, asc
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import json

from app.database.session import get_db
from app.core.security import get_current_user
from app.models.user import User  # Fixed import
from app.models.oqc import OQC
from app.models.transfer_qc import TransferQc
from app.models.master_prod import MasterProd
from app.models.qc_models import (  # New QC models
    QCInspectionPlan,
    QCInspectionResult, 
    QCDefectCode,
    QCNonConformance,
    QCCalibrationRecord
)

router = APIRouter(prefix="/qc", tags=["Quality Control - Query"])

# ====================================================================
# OQC QUERY OPERATIONS
# ====================================================================

@router.get("/oqc")
async def get_oqc_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    part_number: Optional[str] = Query(None, description="Filter by part number"),
    lot_number: Optional[str] = Query(None, description="Filter by lot number"),
    inspection_status: Optional[str] = Query(None, description="Filter by inspection status"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    limit: int = Query(100, le=1000, description="Limit results"),
    offset: int = Query(0, description="Offset for pagination")
):
    """Get OQC inspection records with filtering"""
    try:
        query = db.query(OQC)
        
        # Apply filters
        if part_number:
            query = query.filter(OQC.part_number.ilike(f"%{part_number}%"))
        if lot_number:
            query = query.filter(OQC.lot_number.ilike(f"%{lot_number}%"))
        if inspection_status:
            query = query.filter(OQC.inspection_status == inspection_status)
        if start_date:
            query = query.filter(OQC.created_at >= start_date)
        if end_date:
            query = query.filter(OQC.created_at <= end_date)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        oqc_records = query.order_by(desc(OQC.created_at)).offset(offset).limit(limit).all()
        
        return {
            "data": [
                {
                    "id": record.id,
                    "inspection_number": record.inspection_number,
                    "part_number": record.part_number,
                    "lot_number": record.lot_number,
                    "production_order_id": record.production_order_id,
                    "quantity_received": record.quantity_received,
                    "quantity_inspected": record.quantity_inspected,
                    "quantity_good": record.quantity_good,
                    "quantity_ng": record.quantity_ng,
                    "quantity_rework": record.quantity_rework,
                    "inspection_type": record.inspection_type,
                    "inspection_location": record.inspection_location,
                    "inspector_id": record.inspector_id,
                    "measurement_data": json.loads(record.measurement_data) if record.measurement_data else None,
                    "defect_details": json.loads(record.defect_details) if record.defect_details else None,
                    "inspector_notes": record.inspector_notes,
                    "disposition": record.disposition,
                    "inspection_status": record.inspection_status,
                    "overall_result": record.overall_result,
                    "approved_by": record.approved_by,
                    "approved_at": record.approved_at,
                    "approval_notes": record.approval_notes,
                    "created_at": record.created_at,
                    "updated_at": record.updated_at
                } for record in oqc_records
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving OQC records: {str(e)}")

@router.get("/oqc/{oqc_id}")
async def get_oqc_record(
    oqc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific OQC record by ID"""
    try:
        oqc_record = db.query(OQC).filter(OQC.id == oqc_id).first()
        
        if not oqc_record:
            raise HTTPException(status_code=404, detail="OQC record not found")
        
        return {
            "data": {
                "id": oqc_record.id,
                "inspection_number": oqc_record.inspection_number,
                "part_number": oqc_record.part_number,
                "lot_number": oqc_record.lot_number,
                "production_order_id": oqc_record.production_order_id,
                "quantity_received": oqc_record.quantity_received,
                "quantity_inspected": oqc_record.quantity_inspected,
                "quantity_good": oqc_record.quantity_good,
                "quantity_ng": oqc_record.quantity_ng,
                "quantity_rework": oqc_record.quantity_rework,
                "inspection_type": oqc_record.inspection_type,
                "inspection_location": oqc_record.inspection_location,
                "inspector_id": oqc_record.inspector_id,
                "measurement_data": json.loads(oqc_record.measurement_data) if oqc_record.measurement_data else None,
                "defect_details": json.loads(oqc_record.defect_details) if oqc_record.defect_details else None,
                "inspector_notes": oqc_record.inspector_notes,
                "disposition": oqc_record.disposition,
                "inspection_status": oqc_record.inspection_status,
                "overall_result": oqc_record.overall_result,
                "approved_by": oqc_record.approved_by,
                "approved_at": oqc_record.approved_at,
                "approval_notes": oqc_record.approval_notes,
                "created_at": oqc_record.created_at,
                "updated_at": oqc_record.updated_at
            },
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving OQC record: {str(e)}")

# ====================================================================
# QC INSPECTION PLAN QUERY OPERATIONS  
# ====================================================================

@router.get("/inspection-plans")
async def get_inspection_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    part_number: Optional[str] = Query(None, description="Filter by part number"),
    inspection_type: Optional[str] = Query(None, description="Filter by inspection type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    limit: int = Query(100, le=1000, description="Limit results"),
    offset: int = Query(0, description="Offset for pagination")
):
    """Get QC inspection plans with filtering"""
    try:
        query = db.query(QCInspectionPlan)
        
        # Apply filters
        if part_number:
            query = query.filter(QCInspectionPlan.part_number.ilike(f"%{part_number}%"))
        if inspection_type:
            query = query.filter(QCInspectionPlan.inspection_type == inspection_type)
        if is_active is not None:
            query = query.filter(QCInspectionPlan.is_active == is_active)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        plans = query.order_by(desc(QCInspectionPlan.created_at)).offset(offset).limit(limit).all()
        
        return {
            "data": [
                {
                    "id": plan.id,
                    "plan_code": plan.plan_code,
                    "part_number": plan.part_number,
                    "plan_name": plan.plan_name,
                    "inspection_type": plan.inspection_type,
                    "sampling_method": plan.sampling_method,
                    "sample_size": plan.sample_size,
                    "acceptance_criteria": json.loads(plan.acceptance_criteria) if plan.acceptance_criteria else None,
                    "inspection_points": json.loads(plan.inspection_points) if plan.inspection_points else None,
                    "required_tools": json.loads(plan.required_tools) if plan.required_tools else None,
                    "estimated_time_minutes": plan.estimated_time_minutes,
                    "is_active": plan.is_active,
                    "created_by": plan.created_by,
                    "created_at": plan.created_at,
                    "updated_at": plan.updated_at
                } for plan in plans
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving inspection plans: {str(e)}")

@router.get("/inspection-plans/{plan_id}")
async def get_inspection_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific inspection plan by ID"""
    try:
        plan = db.query(QCInspectionPlan).filter(QCInspectionPlan.id == plan_id).first()
        
        if not plan:
            raise HTTPException(status_code=404, detail="Inspection plan not found")
        
        return {
            "data": {
                "id": plan.id,
                "plan_code": plan.plan_code,
                "part_number": plan.part_number,
                "plan_name": plan.plan_name,
                "inspection_type": plan.inspection_type,
                "sampling_method": plan.sampling_method,
                "sample_size": plan.sample_size,
                "acceptance_criteria": json.loads(plan.acceptance_criteria) if plan.acceptance_criteria else None,
                "inspection_points": json.loads(plan.inspection_points) if plan.inspection_points else None,
                "required_tools": json.loads(plan.required_tools) if plan.required_tools else None,
                "estimated_time_minutes": plan.estimated_time_minutes,
                "is_active": plan.is_active,
                "created_by": plan.created_by,
                "created_at": plan.created_at,
                "updated_at": plan.updated_at
            },
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving inspection plan: {str(e)}")

# ====================================================================
# QC INSPECTION RESULT QUERY OPERATIONS
# ====================================================================

@router.get("/inspection-results")
async def get_inspection_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    part_number: Optional[str] = Query(None, description="Filter by part number"),
    lot_number: Optional[str] = Query(None, description="Filter by lot number"),
    overall_result: Optional[str] = Query(None, description="Filter by overall result"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    limit: int = Query(100, le=1000, description="Limit results"),
    offset: int = Query(0, description="Offset for pagination")
):
    """Get QC inspection results with filtering"""
    try:
        query = db.query(QCInspectionResult)
        
        # Apply filters
        if part_number:
            query = query.filter(QCInspectionResult.part_number.ilike(f"%{part_number}%"))
        if lot_number:
            query = query.filter(QCInspectionResult.lot_number.ilike(f"%{lot_number}%"))
        if overall_result:
            query = query.filter(QCInspectionResult.overall_result == overall_result)
        if start_date:
            query = query.filter(QCInspectionResult.inspection_start_time >= start_date)
        if end_date:
            query = query.filter(QCInspectionResult.inspection_start_time <= end_date)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        results = query.order_by(desc(QCInspectionResult.inspection_start_time)).offset(offset).limit(limit).all()
        
        return {
            "data": [
                {
                    "id": result.id,
                    "inspection_number": result.inspection_number,
                    "qc_plan_id": result.qc_plan_id,
                    "source_type": result.source_type,
                    "source_reference_id": result.source_reference_id,
                    "lot_number": result.lot_number,
                    "part_number": result.part_number,
                    "quantity_inspected": result.quantity_inspected,
                    "quantity_passed": result.quantity_passed,
                    "quantity_failed": result.quantity_failed,
                    "quantity_rework": result.quantity_rework,
                    "inspector_id": result.inspector_id,
                    "inspection_start_time": result.inspection_start_time,
                    "inspection_end_time": result.inspection_end_time,
                    "inspection_location": result.inspection_location,
                    "measurement_data": json.loads(result.measurement_data) if result.measurement_data else None,
                    "defect_codes": json.loads(result.defect_codes) if result.defect_codes else None,
                    "corrective_actions": result.corrective_actions,
                    "inspector_notes": result.inspector_notes,
                    "inspection_status": result.inspection_status,
                    "overall_result": result.overall_result,
                    "created_at": result.created_at,
                    "updated_at": result.updated_at
                } for result in results
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving inspection results: {str(e)}")

# ====================================================================
# NON-CONFORMANCE REPORT QUERY OPERATIONS
# ====================================================================

@router.get("/non-conformance")
async def get_non_conformance_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ncr_type: Optional[str] = Query(None, description="Filter by NCR type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    part_number: Optional[str] = Query(None, description="Filter by part number"),
    limit: int = Query(100, le=1000, description="Limit results"),
    offset: int = Query(0, description="Offset for pagination")
):
    """Get Non-Conformance Reports with filtering"""
    try:
        query = db.query(QCNonConformance)
        
        # Apply filters
        if ncr_type:
            query = query.filter(QCNonConformance.ncr_type == ncr_type)
        if status:
            query = query.filter(QCNonConformance.status == status)
        if priority:
            query = query.filter(QCNonConformance.priority == priority)
        if part_number:
            query = query.filter(QCNonConformance.part_number.ilike(f"%{part_number}%"))
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        ncrs = query.order_by(desc(QCNonConformance.created_at)).offset(offset).limit(limit).all()
        
        return {
            "data": [
                {
                    "id": ncr.id,
                    "ncr_number": ncr.ncr_number,
                    "inspection_result_id": ncr.inspection_result_id,
                    "ncr_type": ncr.ncr_type,
                    "part_number": ncr.part_number,
                    "lot_number": ncr.lot_number,
                    "quantity_affected": ncr.quantity_affected,
                    "problem_description": ncr.problem_description,
                    "immediate_action": ncr.immediate_action,
                    "priority": ncr.priority,
                    "status": ncr.status,
                    "reported_by": ncr.reported_by,
                    "assigned_to": ncr.assigned_to,
                    "target_close_date": ncr.target_close_date,
                    "actual_close_date": ncr.actual_close_date,
                    "created_at": ncr.created_at,
                    "updated_at": ncr.updated_at
                } for ncr in ncrs
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving NCR reports: {str(e)}")

# ====================================================================
# QC DASHBOARD & ANALYTICS
# ====================================================================

@router.get("/dashboard/summary")
async def get_qc_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    start_date: Optional[date] = Query(None, description="Start date for summary"),
    end_date: Optional[date] = Query(None, description="End date for summary")
):
    """Get QC dashboard summary with key metrics"""
    try:
        # Default to last 30 days if no date range provided
        if not start_date or not end_date:
            from datetime import timedelta
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=30)
        
        # OQC Summary
        oqc_query = db.query(OQC).filter(
            OQC.created_at >= start_date,
            OQC.created_at <= end_date
        )
        
        total_oqc_inspections = oqc_query.count()
        passed_oqc = oqc_query.filter(OQC.overall_result == 'pass').count()
        failed_oqc = oqc_query.filter(OQC.overall_result == 'fail').count()
        
        # Inspection Results Summary
        results_query = db.query(QCInspectionResult).filter(
            QCInspectionResult.inspection_start_time >= start_date,
            QCInspectionResult.inspection_start_time <= end_date
        )
        
        total_inspections = results_query.count()
        passed_inspections = results_query.filter(QCInspectionResult.overall_result == 'pass').count()
        failed_inspections = results_query.filter(QCInspectionResult.overall_result == 'fail').count()
        
        # NCR Summary
        ncr_query = db.query(QCNonConformance).filter(
            QCNonConformance.created_at >= start_date,
            QCNonConformance.created_at <= end_date
        )
        
        total_ncrs = ncr_query.count()
        open_ncrs = ncr_query.filter(QCNonConformance.status == 'open').count()
        closed_ncrs = ncr_query.filter(QCNonConformance.status == 'closed').count()
        
        # Calculate pass rates
        oqc_pass_rate = (passed_oqc / total_oqc_inspections * 100) if total_oqc_inspections > 0 else 0
        inspection_pass_rate = (passed_inspections / total_inspections * 100) if total_inspections > 0 else 0
        
        return {
            "data": {
                "period": {
                    "start_date": start_date,
                    "end_date": end_date
                },
                "oqc_summary": {
                    "total_inspections": total_oqc_inspections,
                    "passed": passed_oqc,
                    "failed": failed_oqc,
                    "pass_rate": round(oqc_pass_rate, 2)
                },
                "inspection_summary": {
                    "total_inspections": total_inspections,
                    "passed": passed_inspections,
                    "failed": failed_inspections,
                    "pass_rate": round(inspection_pass_rate, 2)
                },
                "ncr_summary": {
                    "total_ncrs": total_ncrs,
                    "open": open_ncrs,
                    "closed": closed_ncrs,
                    "closure_rate": round((closed_ncrs / total_ncrs * 100) if total_ncrs > 0 else 0, 2)
                }
            },
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving dashboard summary: {str(e)}")

# ====================================================================
# LEGACY TRANSFER QC QUERY OPERATIONS (Keep for backward compatibility)
# ====================================================================

@router.get("/transfer-qc")
async def get_transfer_qc_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    machine_id: Optional[str] = Query(None, description="Filter by machine ID"),
    part_number: Optional[str] = Query(None, description="Filter by part number"),
    start_date: Optional[date] = Query(None, description="Filter by start date"),
    end_date: Optional[date] = Query(None, description="Filter by end date"),
    limit: int = Query(100, le=1000, description="Limit results"),
    offset: int = Query(0, description="Offset for pagination")
):
    """Get Transfer QC records with filtering"""
    try:
        query = db.query(TransferQc)
        
        # Apply filters
        if machine_id:
            query = query.filter(TransferQc.machine_id == machine_id)
        if part_number:
            query = query.filter(TransferQc.part_number.ilike(f"%{part_number}%"))
        if start_date:
            query = query.filter(TransferQc.operation_date >= start_date)
        if end_date:
            query = query.filter(TransferQc.operation_date <= end_date)
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        records = query.order_by(desc(TransferQc.operation_date)).offset(offset).limit(limit).all()
        
        return {
            "data": [
                {
                    "id": record.id,
                    "machine_id": record.machine_id,
                    "part_number": record.part_number,
                    "quantity_good": record.quantity_good,
                    "quantity_ng": record.quantity_ng,
                    "operator_id": record.operator_id,
                    "operation_date": record.operation_date,
                    "shift": record.shift,
                    "notes": record.notes,
                    "created_at": record.created_at,
                    "updated_at": record.updated_at
                } for record in records
            ],
            "total": total,
            "limit": limit,
            "offset": offset,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving Transfer QC records: {str(e)}")
