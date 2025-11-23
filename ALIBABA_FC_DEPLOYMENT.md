# 🚀 Alibaba Cloud Function Compute - FastAPI Deployment Guide

**Status:** ✅ Ready for Deployment  
**Runtime:** custom.debian10 (Python 3.9)  
**Region:** ap-southeast-5  
**Entry Point:** bootstrap.py  

---

## 📁 Directory Structure for Alibaba FC

```
WMS_Manufacture/
├── Fastapi-queryservice/          ← CRITICAL: This folder is deployed to /code
│   ├── bootstrap.py               ← Entry point (Handler: bootstrap.http_handler)
│   ├── requirements.txt            ← Python dependencies
│   ├── app/                        ← FastAPI application
│   │   ├── main.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── api/
│   │   └── ...
│   └── bin/                        ← Optional: Custom executables
├── s.yaml                          ← Alibaba Serverless Framework config
└── .env                            ← Database credentials (keep secure)
```

---

## ⚙️ Configuration Details

### Environment Variables (from s.yaml)

| Variable | Value | Purpose |
|----------|-------|---------|
| `PYTHONPATH` | `/code:/code/app:/opt/python3.9` | Python module search paths |
| `LD_LIBRARY_PATH` | `/code:/code/lib:/usr/lib:/opt/lib:/usr/local/lib` | Library paths |
| `CODE_DIR` | `/code` | Bootstrap script uses this to find app |
| `FC_PORT` | `9000` | Port for HTTP handler |
| `PYTHONUNBUFFERED` | `1` | Real-time logging output |

### Custom Runtime Config

```yaml
customRuntimeConfig:
  port: 9000
  command:
    - python3
    - bootstrap.py
```

This tells Alibaba FC to:
1. Start a Python process with `python3 bootstrap.py`
2. Listen on port 9000
3. Pass HTTP requests to the handler

---

## 🔧 Quick Deployment Steps

### Step 1: Update Dependencies

```bash
cd Fastapi-queryservice

# Update requirements.txt if needed
pip install -r requirements.txt --dry-run
```

### Step 2: Verify Structure

```bash
# Make sure bootstrap.py exists
ls -la bootstrap.py

# Verify app directory
ls -la app/

# Check if app/main.py exists
ls -la app/main.py
```

### Step 3: Deploy with Alibaba CLI

**Option A: Using Serverless Framework CLI**
```bash
# Install serverless framework
npm install -g @alibabacloud/fun

# Deploy from root directory
cd ..
fun deploy
```

**Option B: Using Alibaba Cloud CLI**
```bash
aliyun fc deploy-function \
  --service-name default \
  --function-name Fastapi-queryservice \
  --zip-file file://Fastapi-queryservice.zip \
  --handler bootstrap.http_handler \
  --runtime custom.debian10 \
  --timeout 300 \
  --memory-size 512
```

**Option C: Manual ZIP deployment**
```bash
# Create deployment package
cd Fastapi-queryservice
zip -r ../fastapi-queryservice.zip .

# Upload to Alibaba console
# Console: Function Compute → Create/Update Function → Upload code
```

### Step 4: Verify Deployment

```bash
# Check function info
aliyun fc get-function \
  --service-name default \
  --function-name Fastapi-queryservice

# Check provisioned concurrency
aliyun fc get-provisioned-config \
  --service-name default \
  --function-name Fastapi-queryservice
```

---

## 🧪 Testing

### Test Locally Before Deploying

```bash
cd Fastapi-queryservice

# Install dependencies
pip install -r requirements.txt

# Run bootstrap directly (mimics FC environment)
FC_FUNCTION_NAME=Fastapi-queryservice python3 bootstrap.py
```

**Expected output:**
```
[INFO] 2025-11-23 12:34:56 - bootstrap - ================================================================================
[INFO] 2025-11-23 12:34:56 - bootstrap - 🚀 BOOTSTRAP INITIALIZATION
[INFO] 2025-11-23 12:34:56 - bootstrap - ================================================================================
[INFO] 2025-11-23 12:34:56 - bootstrap - Current working directory: /path/to/Fastapi-queryservice
[INFO] 2025-11-23 12:34:56 - bootstrap - ✓ Using CODE_DIR: /path/to/Fastapi-queryservice
[INFO] 2025-11-23 12:34:56 - bootstrap - ✓ Strategy 1 SUCCESS: FastAPI app imported from app.main
[INFO] 2025-11-23 12:34:56 - bootstrap - ================================================================================
[INFO] 2025-11-23 12:34:56 - bootstrap - ✅ WMS Manufacturing Query Service (FastAPI)
[INFO] 2025-11-23 12:34:56 - bootstrap - ✅ Uvicorn running on http://0.0.0.0:9000
```

### Test Health Endpoint

```bash
# While bootstrap is running
curl http://localhost:9000/health

# Expected: 200 OK with health status
```

### Test API Endpoints

```bash
# Get production orders
curl http://localhost:9000/api/v1/production/orders

# Get dashboard summary
curl http://localhost:9000/api/v1/dashboard/summary

# Access API docs
open http://localhost:9000/docs
```

---

## 🔍 Debugging Alibaba FC Errors

### Error: `python: can't open file '/code/bootstrap.py': [Errno 2] No such file or directory`

**Cause:** bootstrap.py not found in deployment package

**Solution:**
1. Verify `s.yaml` has correct code path: `code: ./Fastapi-queryservice`
2. Ensure bootstrap.py is in `Fastapi-queryservice/` directory
3. Check deployment package contents:
   ```bash
   unzip -l fastapi-queryservice.zip | grep bootstrap.py
   ```

### Error: `ModuleNotFoundError: No module named 'app'`

**Cause:** app/ directory not found or PYTHONPATH not set correctly

**Solution:**
1. Verify `Fastapi-queryservice/app/main.py` exists
2. Check s.yaml has:
   ```yaml
   environmentVariables:
     PYTHONPATH: /code:/code/app:/opt/python3.9
   ```
3. Manually test import:
   ```bash
   cd Fastapi-queryservice
   python3 -c "from app.main import app; print('OK')"
   ```

### Error: `Port 9000 already in use`

**Cause:** Another process using port 9000

**Solution:**
1. Locally: Kill the process using port 9000
   ```bash
   # Linux/Mac
   lsof -i :9000 | grep LISTEN | awk '{print $2}' | xargs kill -9
   
   # Windows
   netstat -ano | findstr :9000
   taskkill /PID <PID> /F
   ```
2. On Alibaba FC: Auto-handled by platform (check provisioned concurrency)

### Error: `Handler not found: bootstrap.http_handler`

**Cause:** bootstrap.py doesn't define `http_handler` function

**Solution:**
1. Verify bootstrap.py defines: `def http_handler(environ, start_response):`
2. Check handler is callable and accepts correct parameters
3. Test locally:
   ```bash
   python3 -c "from bootstrap import http_handler; print(http_handler)"
   ```

---

## 📊 Monitoring & Logs

### View Function Logs

```bash
# Get recent logs
aliyun fc get-function-logs \
  --service-name default \
  --function-name Fastapi-queryservice \
  --limit 100

# Get logs from specific time
aliyun fc get-function-logs \
  --service-name default \
  --function-name Fastapi-queryservice \
  --start-time "2025-11-23T12:00:00Z" \
  --end-time "2025-11-23T13:00:00Z"
```

### Monitor Metrics

```bash
# Check invocation count
aliyun fc get-function-code-download-url \
  --service-name default \
  --function-name Fastapi-queryservice
```

### Alibaba Console

1. Log in to [Alibaba Cloud Console](https://console.aliyun.com)
2. Go to **Function Compute** → **Services**
3. Select service → Select **Fastapi-queryservice**
4. View tabs:
   - **Monitoring:** Request count, error rate, duration
   - **Logs:** Real-time logs
   - **Settings:** Environment variables, code
   - **Triggers:** HTTP endpoint URL

---

## 🔐 Security & Best Practices

### Store Sensitive Data

**❌ DO NOT** put secrets in s.yaml:
```yaml
# BAD
environmentVariables:
  DB_PASSWORD: "secret123"
```

**✅ DO** use Alibaba Secrets Manager:
1. Create secret in Alibaba console
2. Reference in function
3. Access via environment at runtime

```bash
# In bootstrap.py
db_password = os.environ.get('DB_PASSWORD')  # Retrieved from secrets manager
```

### Configure Database Connection

Store in `.env` file (keep out of git):
```
DB_HOST=your-rds.ap-southeast-5.rds.aliyuncs.com
DB_PORT=3306
DB_USER=wms_user
DB_PASSWORD=secure_password
DB_NAME=wms_manufacture
```

### Set Resource Limits

```yaml
props:
  memorySize: 512        # 512 MB
  timeout: 300           # 5 minutes
  diskSize: 512          # 512 MB
  cpu: 0.35              # 0.35 vCPU
  instanceConcurrency: 5 # Max 5 concurrent
```

---

## 📦 Deployment Checklist

- [ ] Verify `Fastapi-queryservice/bootstrap.py` exists
- [ ] Verify `Fastapi-queryservice/app/main.py` exists
- [ ] Verify `requirements.txt` has all dependencies
- [ ] Test locally: `FC_FUNCTION_NAME=test python3 bootstrap.py`
- [ ] Verify health endpoint: `curl http://localhost:9000/health`
- [ ] Check `s.yaml` has correct `code: ./Fastapi-queryservice`
- [ ] Update environment variables for RDS connection
- [ ] Store sensitive data in Secrets Manager (not in s.yaml)
- [ ] Deploy: `fun deploy` or upload to console
- [ ] Verify in Alibaba console: Function appears and shows metrics
- [ ] Test HTTP endpoint from Alibaba console
- [ ] Check logs for any errors
- [ ] Monitor metrics for 5 minutes
- [ ] Configure alarms for errors

---

## 🔗 Resources

- [Alibaba FC Documentation](https://www.alibabacloud.com/help/fc)
- [Custom Runtime Guide](https://www.alibabacloud.com/help/fc/user-guide/custom-runtime)
- [Serverless Framework CLI](https://github.com/alibaba/funcraft)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Uvicorn Documentation](https://www.uvicorn.org/)

---

**Deployment Status:** ✅ Ready for Alibaba Cloud Function Compute!

Updated: November 23, 2025
