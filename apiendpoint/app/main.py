"""
ERP Manufacturing System - Unified Query & Mobile API Service
Handles: Query operations + Mobile optimization for all endpoints
Port: 2025 (Query Service)
Database: cloudtle (XAMPP) / topline (Production)
"""
from fastapi import FastAPI, Request, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, Dict, Any, List
import os
import sys
import logging
import re
import json

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configuration and database
try:
    from core.config import settings
    from database.session import SessionLocal
    from api.v1.api import api_router
except ImportError:
    # Fallback configuration for standalone mode
    class Settings:
        API_PORT = 2025
        COMMAND_PORT = 3108
        DEBUG = True
        ENVIRONMENT = "development"
    
    settings = Settings()
    api_router = None
    SessionLocal = None

# Mobile device detection utility
def get_device_info(request: Request) -> dict:
    """Extract device information from request headers"""
    user_agent = request.headers.get("user-agent", "").lower()
    
    # Detect device type
    device_type = "desktop"
    if any(mobile in user_agent for mobile in ["android", "iphone", "ipad", "mobile"]):
        device_type = "mobile"
    elif "tablet" in user_agent:
        device_type = "tablet"
    
    # Extract mobile app specific headers
    mobile_headers = {
        "app_version": request.headers.get("x-app-version", "unknown"),
        "device_id": request.headers.get("x-device-id", "unknown"),
        "platform": request.headers.get("x-platform", "unknown")
    }
    
    # Device capabilities detection
    capabilities = {
        "gps": "geolocation" in user_agent or device_type == "mobile",
        "camera": device_type in ["mobile", "tablet"],
        "biometric": device_type == "mobile",
        "offline": True,  # Assume all devices support offline mode
        "push_notifications": device_type in ["mobile", "tablet"]
    }
    
    # Screen information (estimated)
    screen_info = {
        "density": "high" if device_type == "mobile" else "normal",
        "size": "small" if device_type == "mobile" else "large"
    }
    
    return {
        "type": device_type,
        "user_agent": user_agent,
        "headers": mobile_headers,
        "capabilities": capabilities,
        "screen": screen_info,
        "timestamp": datetime.now().isoformat()
    }

def optimize_for_mobile(data: dict, device_type: str) -> dict:
    """Optimize data structure for mobile devices"""
    if device_type != "mobile":
        return data
    
    # Add mobile-specific metadata
    data["_mobile_optimized"] = True
    data["_compression"] = "enabled"
    data["_cache_duration"] = 300  # 5 minutes
    
    return data

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app with comprehensive configuration
app = FastAPI(
    title="ERP Manufacturing Unified API",
    description="ERP Manufacturing System - Unified Query & Mobile API Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "mobile", "description": "Mobile-optimized endpoints"},
        {"name": "query", "description": "Data query operations"},
        {"name": "dashboard", "description": "Dashboard and analytics"},
        {"name": "production", "description": "Production management"},
        {"name": "inventory", "description": "Inventory management"},
        {"name": "quality", "description": "Quality control"},
        {"name": "warehouse", "description": "Warehouse operations"}
    ]
)
# Middleware for mobile optimization
@app.middleware("http")
async def mobile_optimization_middleware(request: Request, call_next):
    """Mobile optimization middleware"""
    device_info = get_device_info(request)
    
    # Add device info to request state
    request.state.device_info = device_info
    
    # Log mobile requests
    if device_info["type"] in ["mobile", "tablet"]:
        logger.info(f"📱 Mobile request: {request.method} {request.url.path} - Device: {device_info['type']}")
    
    response = await call_next(request)
    
    # Add mobile-specific headers
    if device_info["type"] in ["mobile", "tablet"]:
        response.headers["X-Mobile-Optimized"] = "true"
        response.headers["X-Device-Type"] = device_info["type"]
        response.headers["Cache-Control"] = "max-age=300"  # 5 minutes cache for mobile
    
    return response

# CORS middleware for cross-origin requests (updated for mobile)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*", "X-Mobile-App", "X-Device-ID", "X-App-Version", "X-Platform"],
)

# Block non-GET methods - CQRS enforcement
@app.middleware("http")
async def block_write_operations(request: Request, call_next):
    """CQRS Enforcement - Block all write operations"""
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        command_url = f"http://localhost:{settings.COMMAND_PORT}{request.url.path}"
        logger.warning(f"🚫 BLOCKED: {request.method} {request.url.path} - Redirecting to Command Service")
        
        return JSONResponse(
            status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
            content={
                "error": "CQRS Violation - Method Not Allowed",
                "message": f"{request.method} operations are not permitted on Query Service",
                "details": {
                    "current_service": "Query Service (Read-Only)",
                    "command_service_url": command_url,
                    "allowed_methods": ["GET", "OPTIONS"],
                    "blocked_methods": ["POST", "PUT", "DELETE", "PATCH"]
                },
                "pattern": "CQRS Architecture",
                "solution": f"Use Command Service at http://localhost:{settings.COMMAND_PORT}"
            }
        )
    
    # Log all query requests
    logger.info(f"✅ QUERY: {request.method} {request.url.path} from {request.client.host if request.client else 'unknown'}")
    
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error(f"❌ Query Service Error: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Query Service Error",
                "message": "An error occurred while processing your request",
                "service": "Query Service",
                "pattern": "CQRS"
            }
        )

# Trusted host middleware for production
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=["localhost", "127.0.0.1", "*.tle.co.id"]
    )

# Define direct endpoints before including routers
@app.get("/", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ERP Query Service",
        "pattern": "CQRS - Query Side",
        "operations": ["GET"],
        "version": "2.0.0",
        "environment": settings.ENVIRONMENT,
        "command_service_port": settings.COMMAND_PORT
    }

@app.get("/api/health", tags=["Health"])
async def detailed_health():
    """Detailed health check with database status"""
    # If SessionLocal isn't available (standalone/mobile-only), report gracefully
    try:
        if not SessionLocal:
            db_status = "unconfigured"
        else:
            from sqlalchemy import text
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            db.close()
            db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
    "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "service": "Query Service",
        "environment": settings.ENVIRONMENT,
        "pattern": "CQRS",
        "operations": ["READ"],
        "companion": f"Command Service on port {settings.COMMAND_PORT}"
    }

# Alias for nginx path: ensure /api/query/health returns the same as /api/health
@app.get("/api/query/health", include_in_schema=False)
async def query_health_alias():
    return await detailed_health()

# Alias for nginx rewrite: if nginx strips /api/query prefix, we still serve /health
@app.get("/health", include_in_schema=False)
async def basic_health_alias():
    return await detailed_health()

@app.get("/info", tags=["Information"])
async def service_info():
    """Service information and endpoint mapping"""
    return {
        "service": "ERP Query Service",
        "pattern": "CQRS Architecture",
        "version": "2.0.0",
        "description": "Read-only operations for Manufacturing ERP",
        "operations": ["READ", "SEARCH", "LIST", "GET"],
        "blocked_operations": ["POST", "PUT", "DELETE", "PATCH"],
        "endpoints": {
            "production": {
                "orders": "/production/orders",
                "output": "/production/output", 
                "machines": "/production/machines",
                "bom": "/production/bom"
            },
            "inventory": {
                "locations": "/inventory/locations",
                "balances": "/inventory/balances",
                "transactions": "/inventory/transactions"
            },
            "quality": {
                "records": "/quality/records",
                "checks": "/quality/checks"
            },
            "warehouse": {
                "deliveries": "/warehouse/deliveries",
                "transfers": "/warehouse/transfers"
            },
            "dashboard": {
                "overview": "/dashboard/overview",
                "production": "/dashboard/production",
                "inventory": "/dashboard/inventory"
            },
            "master_data": {
                "products": "/erp/master-prod",
                "machines": "/erp/machines",
                "locations": "/erp/inventory-locations"
            }
        },
        "companion_service": {
            "name": "Command Service",
            "port": settings.COMMAND_PORT,
            "operations": ["CREATE", "UPDATE", "DELETE"],
            "url": f"http://localhost:{settings.COMMAND_PORT}"
        },
        "nginx_production_paths": {
            "query_prefix": "/api/query",
            "command_prefix": "/api/command"
        },
        "cqrs_compliance": {
            "enforcement": "strict",
            "write_blocking": "enabled",
            "error_handling": "detailed"
        }
    }

@app.get("/errors", tags=["Error Handling"])
async def error_handling_info():
    """Information about error handling and troubleshooting"""
    return {
        "error_handling": {
            "cqrs_violations": {
                "code": 405,
                "message": "Method Not Allowed - Use Command Service",
                "solution": f"Redirect to http://localhost:{settings.COMMAND_PORT}"
            },
            "database_errors": {
                "code": 500,
                "message": "Database connection or query error",
                "solution": "Check database status and connection"
            },
            "authentication_errors": {
                "code": 401,
                "message": "Authentication required",
                "solution": "Provide valid JWT token in Authorization header"
            },
            "not_found_errors": {
                "code": 404,
                "message": "Resource not found",
                "solution": "Check endpoint path and resource ID"
            }
        },
        "troubleshooting": {
            "health_check": "/api/health",
            "service_info": "/info",
            "documentation": "/api/docs",
            "logs": "Check terminal output for detailed logs"
        },
        "support": {
            "cqrs_pattern": "Queries use this service, Commands use port " + str(settings.COMMAND_PORT),
            "database": "Ensure XAMPP MySQL is running",
            "authentication": "Use JWT tokens from auth/login endpoint"
        }
    }

@app.get("/cqrs", tags=["CQRS"])
async def cqrs_info():
    """CQRS Architecture information"""
    return {
        "pattern": "Command Query Responsibility Segregation",
        "architecture": {
            "query_service": {
                "port": settings.API_PORT,
                "responsibilities": ["READ", "LIST", "SEARCH", "GET"],
                "database_access": "Read-only",
                "methods_allowed": ["GET", "OPTIONS"]
            },
            "command_service": {
                "port": settings.COMMAND_PORT,
                "responsibilities": ["CREATE", "UPDATE", "DELETE"],
                "database_access": "Read-write",
                "methods_allowed": ["POST", "PUT", "DELETE", "PATCH"]
            }
        },
        "benefits": [
            "Scalability - separate read/write scaling",
            "Security - isolated command operations", 
            "Performance - optimized query operations",
            "Maintenance - clear separation of concerns"
        ],
        "enforcement": {
            "middleware": "block_write_operations",
            "status": "enabled",
            "blocking_rate": "100%"
        },
        "compliance": "strict"
    }

# Mobile-specific endpoints with optimizations
@app.get("/mobile/app-config", tags=["mobile"])
async def mobile_app_config(request: Request):
    """Mobile app configuration and feature flags"""
    device_info = get_device_info(request)
    
    return {
        "app_config": {
            "version": "2.0.0",
            "min_supported_version": "1.8.0",
            "features": {
                "offline_mode": True,
                "push_notifications": True,
                "biometric_auth": device_info["capabilities"]["biometric"],
                "barcode_scanner": True,
                "photo_capture": True,
                "gps_tracking": device_info["capabilities"]["gps"]
            },
            "ui_config": {
                "theme": "manufacturing",
                "screen_density": device_info["screen"]["density"],
                "layout_mode": "mobile" if device_info["type"] == "mobile" else "tablet"
            },
            "sync_intervals": {
                "production_data": 300,  # 5 minutes
                "inventory_data": 600,   # 10 minutes
                "quality_data": 180     # 3 minutes
            }
        },
        "device_info": device_info,
        "server_time": datetime.now().isoformat(),
        "endpoints": {
            "base_url": f"http://localhost:{settings.API_PORT}",
            "query_prefix": "/mobile",
            "command_service": f"http://localhost:{settings.COMMAND_PORT}/mobile"
        }
    }

@app.get("/mobile/dashboard/summary", tags=["mobile", "dashboard"])
async def mobile_dashboard_summary(request: Request):
    """Mobile-optimized dashboard summary"""
    device_info = get_device_info(request)
    
    # Simplified data for mobile screens
    summary_data = {
        "production": {
            "active_orders": 12,
            "completed_today": 8,
            "efficiency": 94.5,
            "status": "normal"
        },
        "inventory": {
            "low_stock_items": 3,
            "pending_transfers": 5,
            "last_updated": datetime.now().isoformat()
        },
        "quality": {
            "inspections_pending": 7,
            "pass_rate_today": 98.2,
            "alerts": 1
        },
        "alerts": [
            {
                "id": 1,
                "type": "warning",
                "message": "Machine M-001 needs maintenance",
                "priority": "medium",
                "timestamp": datetime.now().isoformat()
            }
        ]
    }
    
    if device_info["type"] == "mobile":
        # Further optimize for mobile
        summary_data["_mobile_optimized"] = True
        summary_data["_data_compressed"] = True
    
    return summary_data

@app.get("/mobile/production/orders/active", tags=["mobile", "production"])
async def mobile_active_production_orders(request: Request):
    """Mobile-optimized active production orders"""
    device_info = get_device_info(request)
    
    # Simulated data - in real implementation, fetch from database
    orders = [
        {
            "id": "PO-2024-001",
            "product": "Widget A",
            "quantity": 1000,
            "progress": 75,
            "status": "in_progress",
            "priority": "high",
            "due_date": "2024-01-15",
            "machine": "M-001",
            "operator": "John Doe"
        },
        {
            "id": "PO-2024-002", 
            "product": "Widget B",
            "quantity": 500,
            "progress": 30,
            "status": "in_progress",
            "priority": "normal",
            "due_date": "2024-01-16",
            "machine": "M-002",
            "operator": "Jane Smith"
        }
    ]
    
    # Mobile-specific formatting
    if device_info["type"] == "mobile":
        # Reduce data for mobile screens
        for order in orders:
            order["_display_name"] = f"{order['product']} ({order['progress']}%)"
            order["_status_color"] = {
                "in_progress": "#FFA500",
                "completed": "#008000",
                "delayed": "#FF0000"
            }.get(order["status"], "#808080")
    
    return {
        "orders": orders,
        "total_count": len(orders),
        "device_optimized": device_info["type"],
        "last_updated": datetime.now().isoformat()
    }

@app.get("/mobile/inventory/low-stock", tags=["mobile", "inventory"])
async def mobile_low_stock_items(request: Request):
    """Mobile-optimized low stock items"""
    device_info = get_device_info(request)
    
    low_stock_items = [
        {
            "id": "ITM-001",
            "name": "Steel Rod 10mm",
            "current_stock": 25,
            "min_stock": 100,
            "location": "WH-A-001",
            "status": "critical",
            "last_movement": "2024-01-10T14:30:00"
        },
        {
            "id": "ITM-002",
            "name": "Bearing 608ZZ",
            "current_stock": 150,
            "min_stock": 200,
            "location": "WH-B-002",
            "status": "low",
            "last_movement": "2024-01-12T09:15:00"
        }
    ]
    
    # Add mobile-specific display data
    for item in low_stock_items:
        percentage = (item["current_stock"] / item["min_stock"]) * 100
        item["_stock_percentage"] = round(percentage, 1)
        item["_urgency_level"] = "critical" if percentage < 30 else "low"
        item["_display_text"] = f"{item['name']} ({item['current_stock']}/{item['min_stock']})"
    
    return {
        "low_stock_items": low_stock_items,
        "critical_count": sum(1 for item in low_stock_items if item["_urgency_level"] == "critical"),
        "total_count": len(low_stock_items),
        "device_info": device_info,
        "refresh_interval": 300  # 5 minutes for mobile
    }

@app.get("/mobile/quality/inspections/pending", tags=["mobile", "quality"])
async def mobile_pending_inspections(request: Request):
    """Mobile-optimized pending quality inspections"""
    device_info = get_device_info(request)
    
    inspections = [
        {
            "id": "QC-001",
            "product": "Widget A",
            "batch": "B-2024-001",
            "type": "incoming",
            "priority": "high",
            "assigned_to": "QC Team 1",
            "due_time": "2024-01-15T16:00:00",
            "location": "QC-Station-1"
        },
        {
            "id": "QC-002",
            "product": "Widget B", 
            "batch": "B-2024-002",
            "type": "final",
            "priority": "normal",
            "assigned_to": "QC Team 2",
            "due_time": "2024-01-15T18:00:00",
            "location": "QC-Station-2"
        }
    ]
    
    # Mobile optimizations
    for inspection in inspections:
        inspection["_time_remaining"] = "2h 30m"  # Calculate actual time remaining
        inspection["_status_badge"] = {
            "high": {"color": "#FF0000", "text": "URGENT"},
            "normal": {"color": "#FFA500", "text": "NORMAL"}
        }.get(inspection["priority"])
    
    return {
        "pending_inspections": inspections,
        "urgent_count": sum(1 for i in inspections if i["priority"] == "high"),
        "total_count": len(inspections),
        "device_optimized": True,
        "mobile_features": {
            "barcode_scan": True,
            "photo_capture": True,
            "offline_mode": device_info["capabilities"]["offline"]
        }
    }

@app.get("/mobile/warehouse/tasks", tags=["mobile", "warehouse"])
async def mobile_warehouse_tasks(request: Request):
    """Mobile-optimized warehouse tasks"""
    device_info = get_device_info(request)
    
    tasks = [
        {
            "id": "WH-T-001",
            "type": "picking",
            "priority": "high",
            "items": [
                {"product": "Widget A", "quantity": 50, "location": "A-01-01"},
                {"product": "Widget B", "quantity": 25, "location": "A-02-01"}
            ],
            "assigned_to": "Warehouse Team 1",
            "estimated_time": "30 min",
            "status": "pending"
        },
        {
            "id": "WH-T-002",
            "type": "putaway",
            "priority": "normal", 
            "items": [
                {"product": "Raw Material X", "quantity": 100, "location": "B-01-05"}
            ],
            "assigned_to": "Warehouse Team 2",
            "estimated_time": "15 min",
            "status": "in_progress"
        }
    ]
    
    # Mobile-specific enhancements
    for task in tasks:
        task["_task_summary"] = f"{task['type'].title()} - {len(task['items'])} items"
        task["_priority_color"] = {
            "high": "#FF0000",
            "normal": "#FFA500", 
            "low": "#008000"
        }.get(task["priority"])
    
    return {
        "warehouse_tasks": tasks,
        "high_priority_count": sum(1 for t in tasks if t["priority"] == "high"),
        "total_count": len(tasks),
        "device_capabilities": device_info["capabilities"],
        "mobile_tools": {
            "barcode_scanner": True,
            "location_gps": device_info["capabilities"]["gps"],
            "voice_notes": True
        }
    }

# Include API routes if available
if api_router:
    # Include API routes langsung untuk development
    app.include_router(api_router, prefix="")
    
    # Include API routes dengan prefix untuk production nginx
    app.include_router(api_router, prefix="/api/query")
else:
    logger.warning("⚠️  API router not available - running in mobile-only mode")

# Alias: map /api/mobile/* to /mobile/* to normalize paths across environments
@app.get("/api/mobile/{path:path}", include_in_schema=False)
async def mobile_alias(path: str, request: Request):
    """Redirect /api/mobile/* to /mobile/* to keep compatibility with nginx configs"""
    base = str(request.base_url).rstrip('/')
    target = f"{base}/mobile/{path}"
    if request.url.query:
        target = f"{target}?{request.url.query}"
    return RedirectResponse(url=target, status_code=307)

# Alias: map /api/query/mobile/* to /api/mobile/* for nginx prefix consistency
@app.get("/api/query/mobile/{path:path}", include_in_schema=False)
async def mobile_query_alias(path: str, request: Request):
    base = str(request.base_url).rstrip('/')
    target = f"{base}/api/mobile/{path}"
    if request.url.query:
        target = f"{target}?{request.url.query}"
    return RedirectResponse(url=target, status_code=307)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
