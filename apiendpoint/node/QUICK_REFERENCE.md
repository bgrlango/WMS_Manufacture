# Function Compute - Developer Quick Reference Card

**Print & Post This on Your Monitor! 📌**

---

## Development Commands

```bash
# Local Development (port 3108)
npm run dev                    # Dev server with hot reload

# Function Compute Testing (port 9000)
npm run fc:dev                 # FC bootstrap with hot reload
npm run fc:test                # FC test mode

# Production (Local)
npm start                      # Production server

# Production (Function Compute)
npm run fc:start               # FC production mode
```

---

## Testing Endpoints

### Health Check (Always Works)
```bash
# Local
curl http://localhost:3108/health

# Function Compute (local)
curl http://localhost:9000/health

# Function Compute (cloud)
curl https://<SERVICE_ID>.ap-southeast-5.fc.aliyuncs.com/api/command/health
```

### Authentication
```bash
curl -X POST http://localhost:3108/api/command/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

### Create Production Order
```bash
curl -X POST http://localhost:3108/api/command/production/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "part_number":"TEST-001",
    "quantity":100,
    "priority":"normal"
  }'
```

---

## Environment Setup

### First Time Setup
```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp ../../.env.example .env

# 3. Edit .env with your credentials
nano .env

# 4. Start development
npm run dev
```

### Required Environment Variables
```env
DB_HOST=<your-rds-endpoint>
DB_PORT=3306
DB_USER=<database-user>
DB_PASSWORD=<database-password>
DB_NAME=wms_manufacture
JWT_SECRET=<your-jwt-secret>
CORS_ORIGIN=https://your-domain.com
NODE_ENV=development
```

---

## File Quick Reference

| File | Purpose | Edit? |
|------|---------|-------|
| `bootstrap.js` | FC entry point | ❌ Don't edit |
| `server-express.js` | Express app | ✅ Add routes here |
| `server-local.js` | Local server | ❌ Don't edit |
| `function-compute-handler.js` | FC handlers | ✅ Add event handlers here |
| `package.json` | Dependencies | ✅ Add deps here |
| `.env` | Environment variables | ✅ Your credentials |

---

## CQRS Architecture Reminder

```
COMMAND Service (Node.js - WRITE operations)
├─ POST /production/orders              ✅ CREATE order
├─ PUT /production/orders/:id           ✅ UPDATE order
├─ DELETE /production/orders/:id        ✅ DELETE order
├─ POST /qc/results                     ✅ CREATE QC result
├─ POST /warehouse/delivery             ✅ CREATE delivery
└─ GET requests                         ❌ REJECTED (wrong service)

QUERY Service (FastAPI - READ operations)
├─ GET /api/v1/production/orders        ✅ List orders
├─ GET /api/v1/qc/results               ✅ List QC results
└─ POST/PUT/DELETE requests             ❌ REJECTED (wrong service)
```

**Rule:** Command Service handles all writes. Query Service handles all reads.

---

## Common Errors & Fixes

### ❌ "Cannot find module 'express'"
```bash
# Fix: Install dependencies
npm install
```

### ❌ "ECONNREFUSED - Database connection failed"
```bash
# Fix: Check DB credentials in .env
# Verify RDS is running
# Test connection: mysql -h <HOST> -u <USER> -p
```

### ❌ "Port 3108 already in use"
```bash
# Fix: Kill process on that port
# Windows:
netstat -ano | findstr :3108
taskkill /PID <PID> /F

# Linux/Mac:
lsof -i :3108
kill -9 <PID>
```

### ❌ "JWT validation failed"
```bash
# Fix: Ensure JWT_SECRET is set in .env
# Verify token format: Bearer <token>
# Check token expiry
```

---

## Performance Checklist

- [ ] Cold start < 5 seconds
- [ ] Warm start < 500ms
- [ ] Database queries < 1 second
- [ ] API response < 2 seconds
- [ ] Memory usage < 80%
- [ ] Error rate < 1%

---

## Debugging Tips

### View Logs
```bash
# Development (console output)
npm run dev
# Watch for console.log output

# Function Compute (Alibaba CLI)
fc logs --function-name command-service --tail

# Alibaba Console
# Function Compute → Select function → Logs → View
```

### Enable Debug Mode
```env
LOG_LEVEL=debug
DEBUG=wms:*
ENABLE_REQUEST_LOGGING=true
```

### Test Database Connection
```bash
# From Node.js
npm run dev
# In another terminal
curl http://localhost:3108/api/command/health
```

---

## Docker Commands

```bash
# Build image
docker build -f Dockerfile.custom -t wms-command-runtime:latest .

# Test locally
docker run -p 9000:9000 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=3306 \
  -e DB_USER=root \
  -e DB_PASSWORD=password \
  wms-command-runtime:latest

# Push to registry
docker tag wms-command-runtime:latest registry.ap-southeast-5.aliyuncs.com/<NAMESPACE>/wms-command-runtime:latest
docker push registry.ap-southeast-5.aliyuncs.com/<NAMESPACE>/wms-command-runtime:latest
```

---

## Deployment Summary

1. **Test locally:** `npm run fc:dev`
2. **Build image:** `docker build -f Dockerfile.custom ...`
3. **Push to ACR:** `docker push registry...`
4. **Deploy to FC:** Use `fun.yml` template via Alibaba CLI
5. **Verify:** `curl https://<SERVICE_ID>.../api/command/health`

---

## Key Resources

📖 **Documentation:**
- `FC_DEPLOYMENT_GUIDE.md` - Complete setup guide
- `DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- `FC_README.md` - Detailed README

🔗 **External:**
- Alibaba FC Docs: https://www.alibabacloud.com/help/fc
- Function Compute CLI: https://github.com/alibaba/serverless-fc
- Custom Runtime: https://www.alibabacloud.com/help/fc/user-guide/custom-runtime

📊 **Monitoring:**
- Alibaba CloudMonitor: Check dashboard in console
- Logs: `fc logs --tail`
- Metrics: Error rate, duration, memory

---

## Useful Aliases (Add to ~/.bashrc or ~/.zshrc)

```bash
# Dev shortcuts
alias dev='npm run dev'
alias fcdev='npm run fc:dev'
alias fctest='npm run fc:test'
alias logs='fc logs --tail'

# Docker shortcuts
alias dcbuild='docker build -f Dockerfile.custom -t wms-command-runtime:latest .'
alias dcrun='docker run -p 9000:9000 wms-command-runtime:latest'

# Alibaba CLI shortcuts
alias afc='aliyun fc'
alias aflogs='aliyun fc logs --function-name command-service --tail'
alias afstatus='aliyun fc get-function --service-name wms-manufacturing --function-name command-service'
```

---

## Quick Troubleshooting Flowchart

```
Error?
├─ Server won't start?
│  ├─ npm install
│  ├─ Check .env file
│  └─ Check port conflicts
├─ Database error?
│  ├─ Verify DB_HOST, DB_USER, DB_PASSWORD in .env
│  ├─ Test: mysql -h <host> -u <user> -p
│  └─ Check security groups
├─ API returns 500?
│  ├─ Check logs: npm run dev (check console)
│  ├─ Verify JWT_SECRET set
│  └─ Check database connection
└─ CORS error?
   ├─ Check CORS_ORIGIN in .env
   ├─ Verify CORS middleware in server-express.js
   └─ Check OPTIONS requests
```

---

## Important Notes ⚠️

- ✅ **Backup** `.env` file (contains sensitive data)
- ✅ **Never commit** `.env` to Git
- ✅ **Use** environment variables for credentials
- ✅ **Monitor** cold start times in production
- ✅ **Set up** alarms for error rates and latency
- ✅ **Review** logs regularly for issues

---

**Print Date:** _______________  
**Developer:** _______________  
**Team:** WMS Manufacturing
