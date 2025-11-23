# Alibaba Cloud Function Compute - Environment Paths

**Last Updated:** November 2025  
**Target:** FastAPI Query Service on Alibaba Cloud Function Compute  
**Custom Runtime:** Python 3.9

## Alibaba FC Environment Variables

Dari screenshot Anda, berikut adalah environment variables yang tersedia di Alibaba Cloud Function Compute:

### System Paths

```
LD_LIBRARY_PATH=/code/code/lib/usr/lib/opt/lib/usr/local/lib
PATH=/opt/python3.9/bin/usr/local/bin/usr/bin/bin
PYTHONPATH=/opt/python/code
```

### Path Resolution Strategy

Bootstrap.py sekarang mendukung semua paths ini:

| Path | Purpose | Priority |
|------|---------|----------|
| `CODE_DIR` env var | User-specified path | 1 (Highest) |
| Script directory | Current script location | 2 |
| `/code` | Standard FC custom runtime | 3 |
| `/root/code` | Alternative root path | 4 |
| `$PYTHONPATH` | From env variable | 5 |
| `/opt/fc/code` | Alibaba optional path | 6 |
| `/mnt/code` | Mounted path | 7 (Fallback) |

### Supported Environment Variables

```bash
# Path configuration
CODE_DIR=/code                                    # Bootstrap looks here first
PYTHONPATH=/code:/code/app                       # Python module search path
LD_LIBRARY_PATH=/code/lib:/opt/fc/lib            # Native library search

# Function Compute
FC_FUNCTION_NAME=query-service
FC_HOST=0.0.0.0
FC_PORT=9000

# Python configuration
PYTHONUNBUFFERED=1                               # Unbuffered output
PYTHONDONTWRITEBYTECODE=1                        # Don't create .pyc files

# Database
DB_HOST=rm-xxxxx.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=wms_manufacture

# Application
LOG_LEVEL=INFO
NODE_ENV=production
```

## Dockerfile Settings

Updated `Dockerfile.custom` untuk Alibaba FC:

```dockerfile
# Set working directory
WORKDIR /code

# Export environment
ENV CODE_DIR=/code
ENV PYTHONPATH=/code:/code/app
ENV LD_LIBRARY_PATH=/code/lib:/usr/local/lib:/usr/lib:/opt/fc/lib
ENV FC_FUNCTION_NAME=query-service
ENV FC_PORT=9000
ENV FC_HOST=0.0.0.0
```

## Bootstrap.py Logic

```python
# Dynamic path detection for Alibaba FC
ALIBABA_FC_PATHS = [
    CODE_DIR,                           # ENV variable (fastest)
    SCRIPT_DIR,                         # Script directory
    '/code',                            # Standard path
    '/root/code',                       # Root alternative
    os.path.expandvars('$PYTHONPATH'),  # From PYTHONPATH
    '/opt/fc/code',                     # Alibaba optional
    '/mnt/code',                        # Mounted path
]

# Find first existing path with app/
for path in ALIBABA_FC_PATHS:
    if os.path.exists(path) and os.path.exists(os.path.join(path, 'app')):
        CODE_DIR = path
        break
```

## Expected Alibaba FC Behavior

### Container Startup
1. Function Compute receives trigger
2. Calls `ENTRYPOINT ["python", "-u", "/code/bootstrap.py"]`
3. bootstrap.py:
   - Detects Alibaba FC environment (checks `FC_FUNCTION_NAME` env var)
   - Resolves `CODE_DIR` from available paths
   - Loads `.env` files from multiple locations
   - Imports FastAPI app with multiple strategies
   - Starts Uvicorn on port 9000
4. Function Compute routes HTTP requests to port 9000

### Logging Output

Expected logs when successful:

```
[INFO] 2025-11-23 12:34:56 - bootstrap - Determined code directory: /code
[INFO] 2025-11-23 12:34:56 - bootstrap - LD_LIBRARY_PATH: /code/lib:/opt/fc/lib
[INFO] 2025-11-23 12:34:56 - bootstrap - PYTHONPATH: /code:/code/app
[INFO] 2025-11-23 12:34:56 - bootstrap - ✓ Strategy 1: FastAPI app imported from app.main
[INFO] 2025-11-23 12:34:56 - bootstrap - ============================================================
[INFO] 2025-11-23 12:34:56 - bootstrap - ✅ WMS Manufacturing Query Service (FastAPI)
[INFO] 2025-11-23 12:34:56 - bootstrap -    Environment: Function Compute
[INFO] 2025-11-23 12:34:56 - bootstrap -    Listening on: 0.0.0.0:9000
[INFO] 2025-11-23 12:34:56 - bootstrap -    Health: http://0.0.0.0:9000/health
[INFO] 2025-11-23 12:34:56 - bootstrap - ============================================================
```

## Debugging Alibaba FC Path Issues

### Check Available Paths in FC Container

```bash
# Via FC console or remote debugging
python -c "
import os
paths = ['/code', '/root/code', '/opt/fc/code', '/mnt/code']
for p in paths:
    status = '✓' if os.path.exists(p) else '✗'
    print(f'{status} {p}')
"
```

### View Alibaba FC Environment Variables

```bash
# In bootstrap.py or function logs
import os
print('Available environment:')
for key in ['CODE_DIR', 'PYTHONPATH', 'LD_LIBRARY_PATH', 'PATH']:
    print(f'  {key}={os.environ.get(key, "NOT SET")}')
```

### Test Import in Function Compute

```bash
# Add to bootstrap.py for debugging
import sys
print('sys.path:')
for i, p in enumerate(sys.path[:10]):
    print(f'  [{i}] {p}')

from app.main import app
print('✓ Import successful')
```

## File Structure in Alibaba FC Container

Expected structure after deployment:

```
/code/
├── bootstrap.py              ← Entry point (ENTRYPOINT)
├── requirements.txt          ← Python dependencies
├── app/
│   ├── main.py              ← FastAPI application
│   ├── api/
│   ├── models/
│   ├── schemas/
│   └── ...
├── config/                   ← Configuration modules
├── database/                 ← Database schemas
├── get/                      ← Query functions
├── middleware/               ← Middleware modules
├── models/                   ← SQLAlchemy models
├── schemas/                  ← Pydantic schemas
├── utils/                    ← Utility functions
└── lib/                      ← Native library bindings (optional)
```

## Configuration Files for Alibaba FC

### fc.custom
Specifies runtime and environment variables:
```
RUNTIME python39
ENTRYPOINT python /code/bootstrap.py
ENV CODE_DIR=/code
ENV PYTHONPATH=/code:/code/app
ENV LD_LIBRARY_PATH=/code/lib:/usr/local/lib:/usr/lib:/opt/fc/lib
```

### Dockerfile.custom
Builds Docker image with all dependencies and files copied to `/code`:
```dockerfile
WORKDIR /code
COPY . /code/
ENV CODE_DIR=/code
ENV PYTHONPATH=/code:/code/app
```

### .alibaba-fc.yml
Specifies FC service and function configuration:
```yaml
environment_variables:
  CODE_DIR: /code
  PYTHONPATH: /code:/code/app
  LD_LIBRARY_PATH: /code/lib:/opt/fc/lib
  FC_PORT: "9000"
  DB_HOST: ${DB_HOST}
  ...
```

## Quick Reference

| Variable | Value | Purpose |
|----------|-------|---------|
| `CODE_DIR` | `/code` | Root application directory |
| `PYTHONPATH` | `/code:/code/app` | Module search paths |
| `LD_LIBRARY_PATH` | `/code/lib:/opt/fc/lib` | Native binary search paths |
| `FC_FUNCTION_NAME` | `query-service` | Function Compute function name |
| `FC_PORT` | `9000` | Listening port (fixed in FC) |
| `FC_HOST` | `0.0.0.0` | Binding address |
| `PYTHONUNBUFFERED` | `1` | Real-time logging |

## Next Steps

1. ✅ Updated bootstrap.py with Alibaba FC path support
2. ✅ Updated Dockerfile.custom with proper environment variables
3. ✅ Updated fc.custom with Alibaba-specific settings
4. ✅ Updated .alibaba-fc.yml with environment configuration
5. 📝 Build and test Docker locally
6. 🚀 Deploy to Alibaba Cloud ACR
7. 🔍 Verify in Function Compute console
8. 📊 Monitor logs and metrics

---

**Reference:** Alibaba Cloud Function Compute Custom Runtime Documentation
- https://www.alibabacloud.com/help/fc/user-guide/custom-runtime
