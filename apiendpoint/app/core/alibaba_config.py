"""
Alibaba Cloud Configuration for FastAPI Query Service
Handles RDS MySQL, OSS, and other Alibaba Cloud services
"""

import os
from typing import Optional
from functools import lru_cache
from dotenv import load_dotenv

# Load .env.alibaba file
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env.alibaba'))


class AlibabaCloudConfig:
    """Alibaba Cloud Configuration"""
    
    # ==================================================
    # ALIBABA CLOUD CREDENTIALS
    # ==================================================
    access_key_id: str = os.getenv("ALIBABA_ACCESS_KEY_ID", "")
    access_key_secret: str = os.getenv("ALIBABA_ACCESS_KEY_SECRET", "")
    region: str = os.getenv("ALIBABA_REGION", "ap-southeast-1")
    
    # ==================================================
    # APSARADB RDS MYSQL DATABASE
    # ==================================================
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", 3306))
    db_user: str = os.getenv("DB_USER", "root")
    db_password: str = os.getenv("DB_PASSWORD", "")
    db_name: str = os.getenv("DB_NAME", "wms_manufacture")
    
    # Connection pool settings
    db_connection_limit: int = int(os.getenv("DB_CONNECTION_LIMIT", 10))
    db_ssl_enabled: bool = os.getenv("DB_SSL_ENABLED", "false").lower() == "true"
    db_ssl_ca_path: Optional[str] = os.getenv("DB_SSL_CA_PATH")
    
    # ==================================================
    # ALIBABA OSS (OBJECT STORAGE SERVICE)
    # ==================================================
    oss_endpoint: str = os.getenv("OSS_ENDPOINT", "")
    oss_bucket: str = os.getenv("OSS_BUCKET_NAME", "")
    oss_region: str = os.getenv("OSS_REGION", "ap-southeast-1")
    
    # ==================================================
    # ALIBABA MESSAGE QUEUE (Optional)
    # ==================================================
    mq_endpoint: str = os.getenv("MQ_ENDPOINT", "")
    mq_queue_name: str = os.getenv("MQ_QUEUE_NAME", "")
    mq_topic_name: str = os.getenv("MQ_TOPIC_NAME", "")
    mq_consumer_group: str = os.getenv("MQ_CONSUMER_GROUP", "")
    mq_username: Optional[str] = os.getenv("MQ_USERNAME")
    mq_password: Optional[str] = os.getenv("MQ_PASSWORD")
    
    # ==================================================
    # SERVICE CONFIGURATION
    # ==================================================
    query_service_port: int = int(os.getenv("QUERY_SERVICE_PORT", 2025))
    query_service_host: str = os.getenv("QUERY_SERVICE_HOST", "0.0.0.0")
    
    # ==================================================
    # VPC & NETWORKING
    # ==================================================
    vpc_id: str = os.getenv("VPC_ID", "")
    security_group_id: str = os.getenv("SECURITY_GROUP_ID", "")
    ecs_instance_id: str = os.getenv("ECS_INSTANCE_ID", "")
    ecs_private_ip: str = os.getenv("ECS_PRIVATE_IP", "")
    
    # ==================================================
    # BACKUP CONFIGURATION
    # ==================================================
    backup_enabled: bool = os.getenv("BACKUP_ENABLED", "false").lower() == "true"
    backup_frequency: str = os.getenv("BACKUP_FREQUENCY", "daily")
    backup_time: str = os.getenv("BACKUP_TIME", "02:00")
    backup_retention_days: int = int(os.getenv("BACKUP_RETENTION_DAYS", 30))
    backup_location: str = os.getenv("BACKUP_LOCATION", "")
    
    # ==================================================
    # SECURITY
    # ==================================================
    jwt_secret: str = os.getenv("JWT_SECRET", "")
    jwt_expiry: str = os.getenv("JWT_EXPIRY", "24h")
    
    # ==================================================
    # ENVIRONMENT
    # ==================================================
    python_env: str = os.getenv("PYTHON_ENV", "development")
    
    # ==================================================
    # SQLALCHEMY DATABASE URL
    # ==================================================
    @property
    def database_url(self) -> str:
        """Generate SQLAlchemy database URL for Alibaba RDS MySQL"""
        if self.db_ssl_enabled and self.db_ssl_ca_path:
            return f"mysql+pymysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}?ssl_ca={self.db_ssl_ca_path}&ssl_verify_cert=true"
        return f"mysql+pymysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    # ==================================================
    # CHECK IF CONFIGURED
    # ==================================================
    def is_configured(self) -> bool:
        """Check if Alibaba Cloud is properly configured"""
        return (
            self.access_key_id != "" and 
            self.access_key_id != "your_access_key_id_here" and
            self.access_key_secret != "" and
            self.access_key_secret != "your_access_key_secret_here" and
            self.db_host != "" and
            self.db_host != "rm-xxxxx.mysql.rds.aliyuncs.com"
        )
    
    def get_info(self) -> dict:
        """Get configuration info for display"""
        return {
            "region": self.region,
            "db_host": self.db_host,
            "db_port": self.db_port,
            "db_name": self.db_name,
            "oss_endpoint": self.oss_endpoint,
            "oss_bucket": self.oss_bucket,
            "configured": self.is_configured(),
            "environment": self.python_env,
        }


# Create singleton instance
@lru_cache()
def get_alibaba_config() -> AlibabaCloudConfig:
    """Get Alibaba Cloud configuration (cached)"""
    return AlibabaCloudConfig()


# For backward compatibility
alibaba_config = get_alibaba_config()
