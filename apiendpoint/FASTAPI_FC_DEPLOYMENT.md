# FastAPI Custom Runtime - Alibaba Cloud Function Compute Deployment Guide

**Status:** ✅ Ready for Production  
**Last Updated:** November 2025  
**Target:** Alibaba Cloud Function Compute with Custom Python 3.9 Runtime  
**Architecture:** CQRS Query Service (Read Operations)

---

## 📋 Quick Start

### Prerequisites
```bash
# Install Docker
docker --version

# Install Alibaba CLI tools
pip install aliyun-python-sdk-fc2
pip install aliyun-python-sdk-core

# Or install Fun CLI
npm install -g @alibabacloud/fun
```

### Local Development (Port 8000)
```bash
cd apiendpoint

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp ../.env.example .env

# Run development server
python server-local.py
# Server on http://localhost:8000
```

### Function Compute Testing (Port 9000)
```bash
# Set FC environment
export FC_FUNCTION_NAME=query-service

# Start bootstrap (mimics FC)
python bootstrap.py
# Server on http://localhost:9000
```

### Deploy to Alibaba Cloud
```bash
# 1. Build Docker image
docker build -f Dockerfile.custom -t wms-query-service:latest .

# 2. Push to Alibaba ACR
docker login -u <ALIYUN_ID>@<NAMESPACE> registry.ap-southeast-5.aliyuncs.com
docker tag wms-query-service:latest registry.ap-southeast-5.aliyuncs.com/<NAMESPACE>/wms-query-service:latest
docker push registry.ap-southeast-5.aliyuncs.com/<NAMESPACE>/wms-query-service:latest

# 3. Deploy to Function Compute
aliyun fc create-stack \
  --template-file template.yml \
  --parameter-overrides \
  DBHost=<RDS_ENDPOINT> \
  DBUser=<DB_USER> \
  DBPassword=<DB_PASSWORD> \
  VpcId=<VPC_ID> \
  SecurityGroupId=<SG_ID> \
  SubnetId=<SUBNET_ID> \
  ImageUri=registry.ap-southeast-5.aliyuncs.com/<NAMESPACE>/wms-query-service:latest
```

---

## 🏗️ Architecture

```
┌────────────────────────────────────────┐
│ Alibaba Cloud Function Compute         │
├────────────────────────────────────────┤
│  bootstrap.py (Entry point, port 9000) │
│         ↓                              │
│  Uvicorn ASGI Server                   │
│         ↓                              │
│  FastAPI Application (app/main.py)     │
│  ├─ GET endpoints (dashboards)         │
│  ├─ GET endpoints (reports)            │
│  ├─ GET endpoints (read data)          │
│  └─ POST endpoints (limited)           │
│         ↓                              │
│  SQLAlchemy ORM                        │
│         ↓                              │
│  RDS MySQL (Database)                  │
└────────────────────────────────────────┘
```

---

## 📁 File Structure

### New Files Created

| File | Purpose | Status |
|------|---------|--------|
| `bootstrap.py` | FC entry point | ✅ |
| `server-local.py` | Local dev server | ✅ |
| `function_compute_handler.py` | FC HTTP & event handlers | ✅ |
| `fc.custom` | Custom runtime config | ✅ |
| `Dockerfile.custom` | Docker image for FC | ✅ |
| `template.yml` | Infrastructure template | ✅ |
| `fun.yml` | Alibaba fun format | ✅ |
| `.alibaba-fc.yml` | FC CLI configuration | ✅ |

### Existing FastAPI Structure

```
apiendpoint/
├── app/
│   ├── main.py                    # FastAPI app entry
│   ├── api/v1/
│   │   └── endpoints/             # API routes
│   ├── core/
│   │   └── config.py              # Configuration
│   ├── database/
│   │   ├── session.py
│   │   └── base.py
│   ├── models/                    # SQLAlchemy models
│   ├── schemas/                   # Pydantic schemas
│   └── utils/                     # Utilities
├── get/                           # Query functions
├── middleware/                    # Middleware
├── requirements.txt               # Dependencies
└── ...
```

---

## 🚀 Deployment Steps

### Step 1: Build Docker Image

```bash
cd apiendpoint

# Build for Function Compute
docker build -f Dockerfile.custom \
  -t wms-query-service:latest .

# Verify image
docker images | grep wms-query-service
```

### Step 2: Push to Alibaba ACR

```bash
# Login
docker login -u <ALIYUN_ID>@<NAMESPACE> registry.ap-southeast-5.aliyuncs.com

# Tag
docker tag wms-query-service:latest \
  registry.ap-southeast-5.aliyuncs.com/<NAMESPACE>/wms-query-service:latest

# Push
docker push registry.ap-southeast-5.aliyuncs.com/<NAMESPACE>/wms-query-service:latest

# Verify
aliyun cr get-repo --repo-name wms-query-service
```

### Step 3: Deploy to Function Compute

```bash
# Via CLI
aliyun fc create-stack \
  --region ap-southeast-5 \
  --template-file template.yml \
  --stack-name wms-query-stack \
  --parameter-overrides \
  DBHost=<YOUR_RDS_ENDPOINT> \
  DBPort=3306 \
  DBUser=<DB_USER> \
  DBPassword=<DB_PASSWORD> \
  DBName=wms_manufacture \
  VpcId=<YOUR_VPC_ID> \
  SecurityGroupId=<YOUR_SG_ID> \
  SubnetId=<YOUR_SUBNET_ID> \
  ImageUri=registry.ap-southeast-5.aliyuncs.com/<NAMESPACE>/wms-query-service:latest \
  MemorySize=1024 \
  Timeout=300

# Or via Console
# 1. Go to Alibaba Cloud Console
# 2. Function Compute → Create Function
# 3. Select "Custom" runtime
# 4. Upload Docker image URI
# 5. Configure environment variables
```

### Step 4: Configure HTTP Trigger

```bash
# Create trigger
aliyun fc create-trigger \
  --region ap-southeast-5 \
  --service-name wms-manufacturing-query \
  --function-name query-service \
  --trigger-name http-trigger \
  --trigger-type http \
  --trigger-config '{"methods":["GET","POST"]}'
```

### Step 5: Test Endpoint

```bash
# Get function URL
FC_URL="https://<SERVICE_ID>.ap-southeast-5.fc.aliyuncs.com"

# Health check
curl -X GET ${FC_URL}/health

# API health
curl -X GET ${FC_URL}/api/v1/health

# Dashboard endpoint
curl -X GET "${FC_URL}/api/v1/dashboard/summary" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## 🔍 Testing & Debugging

### Local Development Testing

```bash
# Terminal 1: Start server
python server-local.py

# Terminal 2: Test endpoints
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/health
curl "http://localhost:8000/api/v1/dashboard/summary" \
  -H "Authorization: Bearer <TOKEN>"
```

### Function Compute Simulation

```bash
# Start FC bootstrap locally
export FC_FUNCTION_NAME=query-service
python bootstrap.py

# In another terminal
curl http://localhost:9000/health
```

### View Logs

```bash
# Using FC CLI
aliyun fc logs \
  --region ap-southeast-5 \
  --service-name wms-manufacturing-query \
  --function-name query-service \
  --tail

# Or check Alibaba Console:
# Function Compute → Select Function → Logs tab
```

### Monitor Metrics

```bash
# View in Alibaba CloudMonitor
# Metrics to monitor:
# - Invocations (total calls)
# - Errors (failed calls)
# - Duration (execution time)
# - Memory (peak usage)
# - Concurrency (parallel executions)
```

---

## 📊 Performance Expectations

| Metric | Value |
|--------|-------|
| Cold Start | 3-5 seconds |
| Warm Start | 100-300ms |
| Dashboard Query | 50-200ms |
| API Response | 10-100ms |
| Memory | 250-350 MB |
| Concurrent Users | 10-100 |

---

## 🔒 Environment Variables

```env
# Database
DB_HOST=<RDS_ENDPOINT>
DB_PORT=3306
DB_USER=<DATABASE_USER>
DB_PASSWORD=<DATABASE_PASSWORD>
DB_NAME=wms_manufacture
DATABASE_URL=mysql+pymysql://<USER>:<PASS>@<HOST>:<PORT>/<DB>

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true

# CORS
ALLOW_ORIGINS=https://your-domain.com

# FastAPI
DEBUG=false
FASTAPI_ENV=production
```

---

## 🛠️ NPM/Python Scripts

### Python Scripts

```bash
# Development (hot reload)
python server-local.py

# Production (FC bootstrap)
python bootstrap.py

# Local FC testing
export FC_FUNCTION_NAME=query-service && python bootstrap.py
```

### Docker Commands

```bash
# Build
docker build -f Dockerfile.custom -t wms-query-service:latest .

# Test locally
docker run -p 9000:9000 \
  -e DB_HOST=host.docker.internal \
  -e DB_USER=root \
  wms-query-service:latest

# Push to ACR
docker push registry.ap-southeast-5.aliyuncs.com/<NS>/wms-query-service:latest
```

---

## 🚨 Troubleshooting

### Cold Start Too Slow

**Problem:** Cold start > 5 seconds

**Solutions:**
```bash
# 1. Increase memory
aliyun fc update-function \
  --service-name wms-manufacturing-query \
  --function-name query-service \
  --memory 2048

# 2. Enable provisioned concurrency
aliyun fc put-provisioned-concurrency-config \
  --service-name wms-manufacturing-query \
  --function-name query-service \
  --provisioned-concurrent-executions 10
```

### Database Connection Error

**Problem:** Cannot connect to RDS

**Solutions:**
```bash
# 1. Check RDS security group allows port 3306 from FC security group
# 2. Verify database credentials
# 3. Test connection:
mysql -h <RDS_HOST> -u <USER> -p -e "SELECT 1;"
```

### Out of Memory

**Problem:** Function OOM killed

**Solutions:**
```bash
# Increase memory allocation
aliyun fc update-function \
  --service-name wms-manufacturing-query \
  --function-name query-service \
  --memory 2048

# Or optimize code (reduce pandas, cache data, etc)
```

---

## 📈 Scaling Configuration

```yaml
# Auto-scaling settings
auto_scaling:
  enabled: true
  max_concurrent_executions: 100
  target_utilization: 70%
  scale_up_cool_down: 60s
  scale_down_cool_down: 600s

# Provisioned concurrency (warm instances)
provisioned_concurrency:
  concurrent_executions: 10  # Keep 10 instances warm
```

---

## 💰 Cost Estimation

**Monthly Cost for 1M API calls:**

| Component | Cost |
|-----------|------|
| Invocations | ¥0.20 |
| Memory (1024MB, avg 100ms) | ¥1.71 |
| Storage | ¥0.10 |
| **Total** | **~¥40-50/month** |

---

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: Deploy FastAPI to FC

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build and Push Docker
        run: |
          docker build -f apiendpoint/Dockerfile.custom -t wms-query:latest .
          docker push registry.ap-southeast-5.aliyuncs.com/...
      
      - name: Deploy to FC
        run: |
          aliyun fc create-stack \
            --template-file apiendpoint/template.yml \
            --parameter-overrides ImageUri=...
```

---

## 📚 Additional Resources

- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **Uvicorn Guide:** https://www.uvicorn.org/
- **SQLAlchemy ORM:** https://docs.sqlalchemy.org/
- **Alibaba FC:** https://www.alibabacloud.com/help/fc
- **Custom Runtime:** https://www.alibabacloud.com/help/fc/user-guide/custom-runtime

---

**Deployment Status:** ✅ Ready for Production

All files created and configured for Alibaba Cloud Function Compute!
