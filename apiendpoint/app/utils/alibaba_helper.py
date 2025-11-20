"""
Alibaba Cloud Helper Functions for FastAPI Query Service
For RDS MySQL, OSS, and other Alibaba Cloud operations
"""

import os
import json
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import text, create_engine
from app.core.alibaba_config import get_alibaba_config
import logging

logger = logging.getLogger(__name__)


class AlibabaCloudHelper:
    """Helper class for Alibaba Cloud operations"""
    
    def __init__(self):
        self.config = get_alibaba_config()
    
    # ==================================================
    # RDS MYSQL OPERATIONS
    # ==================================================
    
    async def test_rds_connection(self) -> Dict[str, Any]:
        """Test connection to Alibaba RDS MySQL"""
        try:
            engine = create_engine(self.config.database_url, echo=False)
            with engine.connect() as connection:
                result = connection.execute(text("SELECT 1 as connection_test"))
                connection.commit()
            
            logger.info("✅ Alibaba RDS MySQL - Connected successfully")
            return {
                "status": "success",
                "message": "Connected to Alibaba RDS MySQL successfully",
                "host": self.config.db_host,
                "port": self.config.db_port,
                "database": self.config.db_name,
                "connection_type": "Alibaba RDS MySQL",
            }
        except Exception as e:
            logger.error(f"❌ Alibaba RDS MySQL - Connection failed: {str(e)}")
            return {
                "status": "error",
                "message": f"Failed to connect to Alibaba RDS MySQL: {str(e)}",
                "host": self.config.db_host,
                "port": self.config.db_port,
            }
    
    # ==================================================
    # OSS OPERATIONS
    # ==================================================
    
    async def test_oss_connection(self) -> Dict[str, Any]:
        """Test connection to Alibaba OSS"""
        try:
            # Try to import oss2
            import oss2
            
            auth = oss2.Auth(self.config.access_key_id, self.config.access_key_secret)
            bucket = oss2.Bucket(auth, self.config.oss_endpoint, self.config.oss_bucket)
            
            # Test by getting bucket info
            bucket_info = bucket.get_bucket_info()
            
            logger.info("✅ Alibaba OSS - Connected successfully")
            return {
                "status": "success",
                "message": "Connected to Alibaba OSS successfully",
                "endpoint": self.config.oss_endpoint,
                "bucket": self.config.oss_bucket,
                "region": self.config.oss_region,
            }
        except ImportError:
            logger.warning("⚠️  oss2 library not installed")
            return {
                "status": "warning",
                "message": "oss2 library not installed. Install with: pip install oss2",
            }
        except Exception as e:
            logger.warning(f"⚠️  Alibaba OSS - Connection warning: {str(e)}")
            return {
                "status": "warning",
                "message": f"OSS connection warning: {str(e)}",
                "endpoint": self.config.oss_endpoint,
                "bucket": self.config.oss_bucket,
            }
    
    # ==================================================
    # CREDENTIALS CHECK
    # ==================================================
    
    async def test_alibaba_credentials(self) -> Dict[str, Any]:
        """Test Alibaba Cloud credentials"""
        try:
            has_access_key = (
                self.config.access_key_id and 
                self.config.access_key_id != "your_access_key_id_here"
            )
            has_access_secret = (
                self.config.access_key_secret and 
                self.config.access_key_secret != "your_access_key_secret_here"
            )
            
            if not has_access_key or not has_access_secret:
                logger.error("❌ Alibaba Credentials - Not configured")
                return {
                    "status": "error",
                    "message": "Alibaba Cloud credentials not configured",
                    "missing_fields": {
                        "access_key_id": not has_access_key,
                        "access_key_secret": not has_access_secret,
                    }
                }
            
            logger.info("✅ Alibaba Credentials - Configured")
            return {
                "status": "success",
                "message": "Alibaba Cloud credentials configured",
                "region": self.config.region,
                "access_key_id_masked": self.config.access_key_id[:5] + "***",
            }
        except Exception as e:
            logger.error(f"❌ Alibaba Credentials - Error: {str(e)}")
            return {
                "status": "error",
                "message": f"Credentials check error: {str(e)}",
            }
    
    # ==================================================
    # VERIFY ALL CONNECTIONS
    # ==================================================
    
    async def verify_all_connections(self) -> Dict[str, Any]:
        """Verify all Alibaba Cloud connections"""
        logger.info("🔍 Verifying Alibaba Cloud connections...")
        
        credentials_result = await self.test_alibaba_credentials()
        rds_result = await self.test_rds_connection()
        oss_result = await self.test_oss_connection()
        
        all_ok = (
            credentials_result["status"] == "success" and
            rds_result["status"] == "success" and
            oss_result["status"] in ["success", "warning"]
        )
        
        return {
            "timestamp": datetime.now().isoformat(),
            "credentials": credentials_result,
            "rds_mysql": rds_result,
            "oss": oss_result,
            "summary": {
                "credentials": "✅ OK" if credentials_result["status"] == "success" else "❌ FAILED",
                "rds_mysql": "✅ OK" if rds_result["status"] == "success" else "❌ FAILED",
                "oss": "✅ OK" if oss_result["status"] == "success" else "⚠️  WARNING",
                "all_configured": all_ok,
            }
        }
    
    # ==================================================
    # DATABASE INFO
    # ==================================================
    
    def get_database_info(self) -> Dict[str, Any]:
        """Get database connection info"""
        return {
            "host": self.config.db_host,
            "port": self.config.db_port,
            "database": self.config.db_name,
            "user": self.config.db_user,
            "connection_type": "Alibaba RDS MySQL",
            "region": self.config.region,
            "ssl": "Enabled" if self.config.db_ssl_enabled else "Disabled",
        }
    
    def get_oss_info(self) -> Dict[str, Any]:
        """Get OSS storage info"""
        return {
            "endpoint": self.config.oss_endpoint,
            "bucket": self.config.oss_bucket,
            "region": self.config.oss_region,
        }
    
    def get_alibaba_config_info(self) -> Dict[str, Any]:
        """Get all Alibaba Cloud configuration info"""
        return {
            "region": self.config.region,
            "database": self.get_database_info(),
            "oss": self.get_oss_info(),
            "environment": self.config.python_env,
            "configured": self.config.is_configured(),
        }
    
    # ==================================================
    # BACKUP OPERATIONS
    # ==================================================
    
    async def get_backup_info(self) -> Dict[str, Any]:
        """Get backup configuration info"""
        return {
            "backup_enabled": self.config.backup_enabled,
            "frequency": self.config.backup_frequency,
            "time": self.config.backup_time,
            "retention_days": self.config.backup_retention_days,
            "location": self.config.backup_location,
            "oss_bucket": self.config.oss_bucket,
        }


# Create singleton instance
_alibaba_helper = None


def get_alibaba_helper() -> AlibabaCloudHelper:
    """Get Alibaba Cloud helper instance (singleton)"""
    global _alibaba_helper
    if _alibaba_helper is None:
        _alibaba_helper = AlibabaCloudHelper()
    return _alibaba_helper
