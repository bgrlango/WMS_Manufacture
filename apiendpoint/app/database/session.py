"""
Database session management for ERP Query Service
Production-ready with connection pooling and error handling
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from typing import Generator
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

# Create database engine with production-ready configuration
engine = create_engine(
    settings.DATABASE_URL,
    # Connection Pool Configuration
    poolclass=QueuePool,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,
    # Performance Settings
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    echo_pool=settings.DEBUG,  # Log pool events in debug mode
    # Connection Settings
    connect_args={
        "charset": "utf8mb4",
        "autocommit": False,
        "sql_mode": "TRADITIONAL",
    }
)

# Add connection event listeners for monitoring
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Set database connection parameters"""
    if settings.DEBUG:
        logger.info("New database connection established")

@event.listens_for(engine, "checkout")
def checkout_listener(dbapi_connection, connection_record, connection_proxy):
    """Monitor connection checkout"""
    if settings.DEBUG:
        logger.debug("Connection checked out from pool")

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Prevent lazy loading issues
)

def get_db() -> Generator[Session, None, None]:
    """
    Dependency to get database session
    Includes proper error handling and cleanup
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def get_db_session() -> Session:
    """Get database session for direct usage"""
    return SessionLocal()

# Health check function
def check_database_health() -> bool:
    """Check if database is healthy"""
    try:
        from sqlalchemy import text
        db = SessionLocal()
        result = db.execute(text("SELECT 1")).scalar()
        db.close()
        return result == 1
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False

# Connection info
def get_connection_info() -> dict:
    """Get database connection information"""
    pool = engine.pool
    return {
        "pool_size": pool.size(),
        "checked_in_connections": pool.checkedin(),
        "checked_out_connections": pool.checkedout(),
        "overflow_connections": pool.overflow(),
        "invalid_connections": pool.invalid(),
    }
