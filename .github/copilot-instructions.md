# Copilot / AI Agent Instructions - WMS Manufacturing System

**Last Updated:** November 2025  
**Architecture:** CQRS (Command-Query Responsibility Segregation) with microservices

## Quick Start for AI Agents

This is a **CQRS-based manufacturing ERP system** with dual backend services:
- **Command Service** (Node.js, port 3108): Handles POST/PUT/DELETE operations
- **Query Service** (FastAPI, port 2025): Handles GET operations and dashboards

Key entry points:
- `apiendpoint/node/server.js` - Command Service
- `apiendpoint/app/main.py` - Query Service  
- `database/*.sql` - Database schema and enhancements

## Architecture Overview

```
Frontend (React/Vue) → Nginx Gateway → Command Service (Node.js)
                                     → Query Service (FastAPI/Python)
                                         ↓
                                    MySQL Database
```

### Service Boundaries (CQRS Pattern)

**Command Service** (`apiendpoint/node/`) — Write operations only
- JWT authentication (`middleware/authMiddleware.js`)
- Controllers: `controllers/authController.js`, `productionController.js`, `qcController.js`, `warehouseController.js`
- Routes: `routes/authRoutes.js`, `productionRoutes.js`, `qcRoutes.js`, `warehouseRoutes.js`
- CQRS enforcement: All POST/PUT/DELETE must go here; GET requests rejected via `middleware/cqrsMiddleware.js`
- Database: Sequelize ORM (`models/` folder with Sequelize models)

**Query Service** (`apiendpoint/app/`) — Read operations only  
- FastAPI endpoints in `app/api/v1/endpoints/`
- SQLAlchemy models (`app/models/`)
- Mobile-optimized routes: `GET /mobile/dashboard/summary`, `GET /mobile/production/orders/active`
- No write operations; rejects POST/PUT/DELETE

### Database Schema (MySQL)

Core production tables:
- `production_orders` - Production planning master
- `output_mc` - Machine production output records
- `oqc` - Quality control (OQC) records
- `delivery` - Warehouse delivery tracking
- `return_customer` - Customer returns
- `transfer_qc` - QC transfer operations

ERP extension tables (see `database/ERP_ENHANCEMENT_*.sql`):
- `inventory_locations`, `inventory_balances`, `inventory_movements` - Warehouse & stock
- `machines` - Production machine master
- `bill_of_materials` - BOM structure
- `workflow_states` - Process workflow states

## Project Workflows

### Build & Startup

**Command Service (Node.js)**
```powershell
cd apiendpoint/node
npm install
npm start
# Runs on port 3108 (or env var PORT, default 8080)
```

**Query Service (FastAPI)**
```bash
cd apiendpoint
pip install -r requirements.txt
python app/main.py
# Runs on port 2025
```

**Production Deployment (PM2)**
```bash
# Start Query Service
pm2 start apiendpoint/ecosystem.query.config.js

# Start Command Service
cd apiendpoint/node && pm2 start server.js --name "command-service"
```

### Testing & Debugging

**Command Service endpoints** (port 3108):
- `POST /auth/login` - JWT authentication
- `POST /production/orders` - Create production orders
- `PUT /production/orders/:id` - Update production order
- `POST /qc/results` - Record QC results
- `POST /warehouse/delivery` - Record warehouse delivery

**Query Service endpoints** (port 2025):
- `GET /api/v1/production/orders` - List production orders
- `GET /api/v1/dashboard/summary` - Dashboard data
- `GET /api/v1/inventory/balance` - Stock balance reports
- `GET /mobile/production/orders/active` - Mobile active orders list

### Database Migrations

**Command Service (Sequelize)**
```bash
cd apiendpoint/node
npx sequelize migration:generate --name add_new_feature
npx sequelize db:migrate
```

## Conventions & Key Patterns

### CQRS Enforcement
- **Critical middleware:** `apiendpoint/node/middleware/cqrsMiddleware.js`
  - Rejects GET requests in Command Service → directs to Query Service
  - Rejects write operations (POST/PUT/DELETE) in Query Service
  - Enforce this pattern strictly on all route changes

### Authentication
- JWT tokens managed in `apiendpoint/node/middleware/authMiddleware.js`
- Token payload typically contains: `userId`, `role`, `permissions`
- Query Service validates JWT but does NOT issue tokens

### Configuration
- Environment variables loaded from `.env` files (multiple locations checked in `apiendpoint/node/server.js`)
- Database connection: Sequelize config in `apiendpoint/node/config/`
- FastAPI config: `apiendpoint/app/core/config.py` (if exists)

### Code Structure
- **Command Service:** MVC-style routing → controllers → models
  - Routes: `apiendpoint/node/routes/`
  - Controllers: `apiendpoint/node/controllers/` (business logic)
  - Models: `apiendpoint/node/models/` (Sequelize ORM)
  
- **Query Service:** Endpoint/schema-driven
  - API routes: `apiendpoint/app/api/v1/endpoints/`
  - Models: `apiendpoint/app/models/` (SQLAlchemy)
  - Schemas: `apiendpoint/app/schemas/` (Pydantic input/output)

### Naming Conventions
- Production order IDs: Auto-generated format `JO-YYYYMMDD-XXXX` (see Command Service logic)
- Tables: snake_case (e.g., `production_orders`)
- API endpoints: kebab-case or snake_case (e.g., `/api/v1/production/orders`)

## Integration Points & External Dependencies

### External Services
- **MySQL Database:** Connection managed by Sequelize (Node.js) and SQLAlchemy (Python)
  - Shared database between both services; ensure migrations don't conflict
  - Location: typically `localhost:3306` or Docker internal network
  
- **GCP Integration:** VM instance access via gcloud CLI
  - Webserver instance ID: `8173244087838732061` (for file retrieval)

### API Contracts
- No GraphQL or OpenAPI specification currently; maintain REST conventions
- Mobile endpoints return compact JSON for offline capability
- Always include pagination metadata for large datasets: `{ data: [], total, page, pageSize }`

## Debugging & Troubleshooting

### Common Issues

**CQRS Violation Errors:**
- If Query Service receives POST/PUT/DELETE, check `apiendpoint/node/middleware/cqrsMiddleware.js`
- If Command Service rejects GET requests, verify CQRS middleware is active

**Database Connection:**
- Check `.env` file exists with `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- Verify MySQL service running: `netstat -an | grep :3306` (Windows) or `lsof -i :3306` (Unix)
- Test connection: `mysql -h localhost -u <user> -p <password> -D <database>`

**Port Conflicts:**
- Command Service port 3108: `netstat -an | grep 3108`
- Query Service port 2025: `netstat -an | grep 2025`
- Use `lsof -i :<port>` (Unix) or `netstat -ano | findstr :<port>` (Windows)

**JWT Token Issues:**
- Invalid or expired tokens → check token generation in `apiendpoint/node/middleware/authMiddleware.js`
- Test token: `curl -H "Authorization: Bearer <token>" http://localhost:3108/auth/verify`

## File References

**Key files to read when making changes:**

| Pattern | File | Purpose |
|---------|------|---------|
| CQRS routing | `apiendpoint/node/middleware/cqrsMiddleware.js` | Enforces read/write separation |
| Auth logic | `apiendpoint/node/middleware/authMiddleware.js` | JWT validation & generation |
| DB schema | `database/update_database_schema.sql` | Core table definitions |
| ERP tables | `database/erp_enhancement_safe.sql` | Extension tables (inventory, workflow) |
| Startup | `apiendpoint/node/server.js` | Command Service initialization |
| FastAPI main | `apiendpoint/app/main.py` | Query Service initialization |
| Production config | `apiendpoint/ecosystem.query.config.js` | PM2 deployment configuration |

## Guidelines for AI Agents

1. **Respect CQRS pattern:**
   - Any new write operation (create/update/delete) → add to Command Service (`apiendpoint/node/routes/`)
   - Any new read operation (list/filter/search) → add to Query Service (`apiendpoint/app/api/v1/endpoints/`)

2. **Database migrations:**
   - Test migrations in development first
   - Coordinate with team if modifying shared tables
   - Document breaking changes in `database/ERP_ENHANCEMENT_DOCUMENTATION.md`

3. **Mobile endpoints:**
   - Keep response payloads compact for mobile (`GET /mobile/...`)
   - Always include `data`, `total`, `page`, `pageSize` in paginated responses

4. **Error handling:**
   - Command Service: Return `{ error: "message", code: "ERROR_CODE" }`
   - Query Service: Return same format with HTTP status codes (200, 400, 401, 404, 500)

5. **Environment variables:**
   - Check existing `.env.example` (if exists) before adding new ones
   - Document new env vars in README or this file

## GCP VM Integration (Existing Setup)

This workspace is also set up for:
- GCP VM instance access using gcloud CLI
- Retrieving folders from webserver instance (ID: 8173244087838732061)
- Backend development environment

## Alibaba Cloud Integration

### Overview
WMS Manufacturing System dapat diintegrasikan dengan Alibaba Cloud untuk hosting dan managed services:
- **ApsaraDB RDS MySQL** - Managed database service
- **ECS (Elastic Compute Service)** - VM untuk deploy services
- **OSS (Object Storage Service)** - Cloud storage untuk files/backups
- **Message Queue** - Async message processing
- **VPC (Virtual Private Cloud)** - Network isolation

### Setup Alibaba Cloud Connection

**Prerequisites:**
- Alibaba Cloud account dengan Access Key & Secret Key
- Region pilihan (contoh: `ap-southeast-1` untuk Singapore, `ap-southeast-5` untuk Jakarta)

**Environment Variables (.env):**
```
# Alibaba Cloud Credentials
ALIBABA_ACCESS_KEY_ID=your_access_key_id
ALIBABA_ACCESS_KEY_SECRET=your_access_key_secret
ALIBABA_REGION=ap-southeast-1

# ApsaraDB RDS MySQL (Alibaba Managed Database)
DB_HOST=rm-xxxxx.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wms_manufacture

# OSS Configuration (for file storage/backup)
OSS_ENDPOINT=https://oss-ap-southeast-1.aliyuncs.com
OSS_BUCKET_NAME=wms-manufacturing-bucket
OSS_REGION=ap-southeast-1

# Message Queue (optional, for async operations)
MQ_ENDPOINT=amqp://mq-instance-id.ap-southeast-1.aliyuncs.com:5672
MQ_QUEUE_NAME=wms_commands_queue
```

### Node.js Alibaba Cloud Integration

**Command Service configuration** (`apiendpoint/node/config/alibaba.config.js`):
```javascript
// Alibaba Cloud SDK configuration
const Alibabacloud = require('@alibabacloud/tea-client');
const AlibabaOSS = require('ali-oss');

module.exports = {
  // RDS MySQL Connection
  mysql: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },

  // OSS Client for file storage
  oss: {
    region: process.env.OSS_REGION || 'ap-southeast-1',
    accessKeyId: process.env.ALIBABA_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET_NAME,
    endpoint: process.env.OSS_ENDPOINT,
  },

  // Message Queue Configuration
  mq: {
    endpoint: process.env.MQ_ENDPOINT,
    queueName: process.env.MQ_QUEUE_NAME,
  },
};
```

### Python FastAPI Alibaba Cloud Integration

**Query Service configuration** (`apiendpoint/app/core/alibaba_config.py`):
```python
import os
from typing import Optional

class AlibabaCloudConfig:
    # Alibaba Cloud Credentials
    access_key_id: str = os.getenv("ALIBABA_ACCESS_KEY_ID", "")
    access_key_secret: str = os.getenv("ALIBABA_ACCESS_KEY_SECRET", "")
    region: str = os.getenv("ALIBABA_REGION", "ap-southeast-1")
    
    # RDS MySQL Database
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", 3306))
    db_user: str = os.getenv("DB_USER", "root")
    db_password: str = os.getenv("DB_PASSWORD", "")
    db_name: str = os.getenv("DB_NAME", "wms_manufacture")
    
    # OSS (Object Storage Service)
    oss_endpoint: str = os.getenv("OSS_ENDPOINT", "")
    oss_bucket: str = os.getenv("OSS_BUCKET_NAME", "")
    oss_region: str = os.getenv("OSS_REGION", "ap-southeast-1")
    
    # Message Queue
    mq_endpoint: str = os.getenv("MQ_ENDPOINT", "")
    mq_queue_name: str = os.getenv("MQ_QUEUE_NAME", "")
    
    # Database connection string for SQLAlchemy
    @property
    def database_url(self) -> str:
        return f"mysql+pymysql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

alibaba_config = AlibabaCloudConfig()
```

### Alibaba Cloud Deployment (ECS)

**Quick Start:**
```bash
# 1. SSH ke Alibaba Cloud ECS instance
ssh -i your_key.pem ec2-user@your_ecs_ip

# 2. Install Node.js & Python
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs python3 python3-pip

# 3. Clone repository
git clone https://github.com/bgrlango-pixel/WMS_Manufacture.git
cd WMS_Manufacture

# 4. Setup Command Service (Node.js)
cd apiendpoint/node
npm install
pm2 start server.js --name "command-service"

# 5. Setup Query Service (FastAPI)
cd ../..
pip3 install -r apiendpoint/requirements.txt
pm2 start "python3 apiendpoint/app/main.py" --name "query-service"

# 6. Verify services
pm2 status
```

**Alibaba Cloud VPC & Security Group Setup:**
- Port 3108: Command Service (restrict to internal VPC only)
- Port 2025: Query Service (restrict to internal VPC only)
- Port 80/443: Nginx gateway (open to public)
- Port 3306: RDS MySQL (restrict to ECS security group only)

### Alibaba OSS for File Storage/Backup

**Upload production order backup to OSS:**
```javascript
// Node.js example
const AlibabaOSS = require('ali-oss');
const client = new AlibabaOSS(alibabaConfig.oss);

async function backupDatabaseToOSS() {
  const fileName = `wms_backup_${Date.now()}.sql`;
  const localPath = `/tmp/${fileName}`;
  
  // Dump MySQL database
  child_process.execSync(`mysqldump -h ${process.env.DB_HOST} -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} > ${localPath}`);
  
  // Upload to Alibaba OSS
  await client.put(fileName, localPath);
  console.log(`Backup uploaded to OSS: ${fileName}`);
}
```

### Alibaba RDS MySQL Management

**Connect to Alibaba RDS MySQL:**
```bash
# From ECS instance
mysql -h rm-xxxxx.mysql.rds.aliyuncs.com -P 3306 -u root -p
```

**Common RDS Operations:**
- Backup: Use Alibaba console or automated backup policy
- Restore: Download backup from console and restore locally
- Failover: Configured automatically for high availability
- Monitoring: Use Alibaba CloudMonitor or MySQL Workbench

### Troubleshooting Alibaba Cloud Connection

**Database Connection Issues:**
```bash
# Test RDS connectivity from ECS
telnet rm-xxxxx.mysql.rds.aliyuncs.com 3306
mysql -h rm-xxxxx.mysql.rds.aliyuncs.com -u root -p -e "SELECT 1"
```

**Security Group Rules:**
- Ensure ECS security group allows MySQL port 3306 to RDS
- Ensure RDS allows inbound from ECS security group
- Verify VPC is same or properly peered

**OSS Access Issues:**
- Check Access Key ID & Secret are correct
- Verify bucket region matches endpoint
- Ensure bucket policy allows the operations

## Questions / Missing Documentation

- Where is `.env.example` or documented env var list?
- Are there integration tests or e2e tests? (Not found in repository)
- Is there a frontend repository linked to this backend?
- What is the deployment target (AWS, GCP, on-prem)?

---

**This file was last updated automatically on November 2025. Merge future updates carefully to preserve repository-specific rules.**
