# Alibaba Cloud Function Compute Deployment Checklist

**Project:** WMS Manufacturing - Command Service  
**Deployment Target:** Alibaba Cloud Function Compute (Custom Node.js 18 Runtime)  
**Last Updated:** November 2025

---

## Pre-Deployment Phase

### ✅ Infrastructure Prerequisites

- [ ] Alibaba Cloud account created and activated
- [ ] Access Key ID and Secret Key generated
- [ ] Appropriate billing method configured
- [ ] VPC created in target region (ap-southeast-5 Jakarta)
- [ ] V-Switch (subnet) created within VPC
- [ ] Security group created and configured
- [ ] RDS MySQL instance deployed (8.0.41+)
  - [ ] Database created: `wms_manufacture`
  - [ ] Admin user created
  - [ ] Test user created for application
  - [ ] Database schema imported
  - [ ] Connection tested from local machine

### ✅ Alibaba CLI & Tools Setup

- [ ] Alibaba Cloud CLI installed: `aliyun --version`
- [ ] Alibaba Function Compute CLI installed: `fc --version`
- [ ] Docker installed and configured: `docker --version`
- [ ] Node.js 18.x+ installed: `node --version`
- [ ] npm/yarn installed: `npm --version`

### ✅ Repository & Code Preparation

- [ ] Repository cloned to local machine
- [ ] All dependencies installed: `npm install`
- [ ] Code compiles without errors: `npm run build` (if applicable)
- [ ] Tests pass locally: `npm test` (if available)
- [ ] `.env.example` copied to `.env` with local values
- [ ] All code changes committed and pushed to `main` branch
- [ ] No uncommitted changes: `git status`

### ✅ Alibaba Cloud Configuration

- [ ] Configure Alibaba credentials:
  ```bash
  aliyun configure
  # Enter: Access Key ID, Access Key Secret, Region (ap-southeast-5), Output Format (json)
  ```
- [ ] Test credentials: `aliyun fc list-services`
- [ ] RAM role created: `fc_basic_execution_role`
  - [ ] Role has FC service permission
  - [ ] Role has RDS access permission
  - [ ] Role has CloudWatch/CloudMonitor permission
  - [ ] Role has Log Service (SLS) permission
- [ ] Secrets Manager configured (if using):
  - [ ] DB_PASSWORD stored as secret
  - [ ] JWT_SECRET stored as secret

### ✅ RDS MySQL Database

- [ ] Database connectivity verified:
  ```bash
  mysql -h <RDS_ENDPOINT> -u <USER> -p -D wms_manufacture -e "SELECT 1;"
  ```
- [ ] Schema initialized (run all migration scripts):
  ```bash
  # From database/ directory
  mysql -h <RDS_ENDPOINT> -u <USER> -p wms_manufacture < update_database_schema.sql
  mysql -h <RDS_ENDPOINT> -u <USER> -p wms_manufacture < erp_enhancement_safe.sql
  ```
- [ ] Initial data loaded (if required):
  ```bash
  mysql -h <RDS_ENDPOINT> -u <USER> -p wms_manufacture < WMS_PRODUCTION_SETUP.sql
  ```
- [ ] Security group rule added:
  - [ ] RDS security group allows port 3306 from Function Compute security group

---

## Local Testing Phase

### ✅ Local Development Server

- [ ] Start local development server:
  ```bash
  npm run dev
  # Server should listen on http://localhost:3108
  ```
- [ ] Health check endpoint responds:
  ```bash
  curl http://localhost:3108/health
  ```
- [ ] Test sample endpoints:
  - [ ] POST /auth/login (authentication)
  - [ ] POST /production/orders (create order)
  - [ ] GET /production/orders (list orders) - should be rejected (CQRS)
  - [ ] POST /qc/results (QC operation)

### ✅ Function Compute Local Emulation

- [ ] Start FC bootstrap locally:
  ```bash
  npm run fc:dev
  # Server should listen on http://localhost:9000
  ```
- [ ] Health check endpoint responds:
  ```bash
  curl http://localhost:9000/health
  ```
- [ ] Test with proper FC environment simulation

### ✅ Environment Variables Verification

- [ ] All required env vars documented and set:
  - [ ] DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
  - [ ] JWT_SECRET, CORS_ORIGIN
  - [ ] NODE_ENV=production
  - [ ] LOG_LEVEL=info
- [ ] No hardcoded credentials in code
- [ ] Secrets stored securely (not in Git)

---

## Docker & Image Build Phase

### ✅ Docker Image Preparation

- [ ] Dockerfile.custom reviewed and updated
- [ ] Build Docker image locally:
  ```bash
  cd apiendpoint/node
  docker build -f Dockerfile.custom -t wms-command-runtime:latest .
  ```
- [ ] Image builds successfully (no errors)
- [ ] Image size reasonable (< 500 MB recommended)
- [ ] Test image locally:
  ```bash
  docker run -p 9000:9000 \
    -e DB_HOST=host.docker.internal \
    -e DB_PORT=3306 \
    -e DB_USER=root \
    -e DB_PASSWORD=password \
    wms-command-runtime:latest
  ```
- [ ] Container starts without errors
- [ ] Health endpoint responds: `curl http://localhost:9000/health`

### ✅ Alibaba Container Registry (ACR)

- [ ] ACR instance created in Alibaba Cloud
- [ ] Docker authentication configured:
  ```bash
  docker login -u <ALIYUN_ID>@<NAMESPACE> registry.ap-southeast-5.aliyuncs.com
  ```
- [ ] Image tagged for ACR:
  ```bash
  docker tag wms-command-runtime:latest registry.ap-southeast-5.aliyuncs.com/<NAMESPACE>/wms-command-runtime:latest
  ```
- [ ] Image pushed to ACR:
  ```bash
  docker push registry.ap-southeast-5.aliyuncs.com/<NAMESPACE>/wms-command-runtime:latest
  ```
- [ ] Image accessibility verified:
  ```bash
  aliyun cr get-repo --repo-name wms-command-runtime
  ```

---

## Alibaba Cloud Deployment Phase

### ✅ Function Compute Setup

**Option 1: Using Alibaba Console (GUI)**

- [ ] Log in to Alibaba Cloud Console
- [ ] Navigate to Function Compute service
- [ ] Create new Service:
  - [ ] Service name: `wms-manufacturing`
  - [ ] VPC: Select your VPC
  - [ ] Security group: Select your security group
  - [ ] Enable internet access: Yes
- [ ] Create new Function:
  - [ ] Function name: `command-service`
  - [ ] Runtime: **Custom** (NOT nodejs18)
  - [ ] Image URI: `registry.ap-southeast-5.aliyuncs.com/<NAMESPACE>/wms-command-runtime:latest`
  - [ ] Memory: 1024 MB
  - [ ] Timeout: 300 seconds
  - [ ] Ephemeral storage: 512 MB
- [ ] Configure environment variables in console:
  ```
  DB_HOST=<RDS_ENDPOINT>
  DB_PORT=3306
  DB_USER=<DB_USER>
  DB_PASSWORD=<DB_PASSWORD>
  DB_NAME=wms_manufacture
  NODE_ENV=production
  JWT_SECRET=<GENERATED_SECRET>
  CORS_ORIGIN=https://your-domain.com
  ```
- [ ] Set up HTTP trigger:
  - [ ] Trigger name: `http-trigger`
  - [ ] HTTP methods: POST, PUT, DELETE, GET, PATCH
  - [ ] Auth type: Anonymous (or configure with API Gateway)
  - [ ] Path pattern: Leave default or set to /api/command/*

**Option 2: Using FC CLI**

- [ ] Configure FC CLI:
  ```bash
  fc config set access_key_id <YOUR_KEY_ID>
  fc config set access_key_secret <YOUR_KEY_SECRET>
  fc config set region ap-southeast-5
  ```
- [ ] Deploy using template:
  ```bash
  aliyun fc create-stack \
    --template-file fun.yml \
    --parameter-overrides \
    DBHost=<RDS_ENDPOINT> \
    DBUser=<DB_USER> \
    DBPassword=<DB_PASSWORD> \
    VpcId=<VPC_ID> \
    SecurityGroupId=<SG_ID> \
    SubnetId=<SUBNET_ID> \
    ImageUri=registry.ap-southeast-5.aliyuncs.com/<NAMESPACE>/wms-command-runtime:latest
  ```

- [ ] Verify service created:
  ```bash
  aliyun fc get-service --service-name wms-manufacturing
  ```
- [ ] Verify function created:
  ```bash
  aliyun fc get-function --service-name wms-manufacturing --function-name command-service
  ```

### ✅ HTTP Trigger Configuration

- [ ] Trigger created and enabled
- [ ] Test trigger URL obtained (from console or CLI)
- [ ] CORS settings configured (if needed)
- [ ] Authentication method set (anonymous for MVP)

---

## Post-Deployment Verification Phase

### ✅ Endpoint Testing

- [ ] Get function trigger URL from Alibaba Console
- [ ] Test health endpoint:
  ```bash
  curl -X GET https://<SERVICE_ID>.ap-southeast-5.fc.aliyuncs.com/api/command/health
  # Expected: 200 OK with health status
  ```
- [ ] Test authentication endpoint:
  ```bash
  curl -X POST https://<SERVICE_ID>.ap-southeast-5.fc.aliyuncs.com/api/command/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "****"}'
  # Expected: 200 OK with JWT token
  ```
- [ ] Test production order creation:
  ```bash
  curl -X POST https://<SERVICE_ID>.ap-southeast-5.fc.aliyuncs.com/api/command/production/orders \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <JWT_TOKEN>" \
    -d '{
      "part_number": "TEST-001",
      "quantity": 100,
      "priority": "normal"
    }'
  # Expected: 201 Created
  ```

### ✅ Error Handling

- [ ] 404 error handling tested
- [ ] 500 error handling tested
- [ ] CQRS middleware rejection tested (GET to Command Service)
- [ ] JWT validation tested (missing/invalid token)

### ✅ Database Connectivity

- [ ] Verify RDS connection working:
  - [ ] Check CloudMonitor logs for connection events
  - [ ] Run SELECT query from Function Compute
- [ ] Verify data persistence:
  - [ ] Create record via FC endpoint
  - [ ] Query RDS directly to confirm record exists

### ✅ Logging & Monitoring

- [ ] Logs visible in Alibaba Cloud console
- [ ] CloudMonitor metrics showing:
  - [ ] Invocations count
  - [ ] Error count (should be 0)
  - [ ] Duration (should be reasonable, < 10s)
  - [ ] Memory usage (should be under allocated)
- [ ] Create test alarm for errors:
  ```bash
  aliyun cloudmonitor put-metric-alarm \
    --alarm-name wms-command-errors \
    --metric-name FunctionErrors \
    --dimensions ServiceName=wms-manufacturing,FunctionName=command-service \
    --threshold 5 \
    --comparison-operator GreaterThanThreshold
  ```

### ✅ VPC & Security Verification

- [ ] Function deployed in correct VPC
- [ ] Security group rules allowing RDS access
- [ ] No public IP exposure (function is private)
- [ ] Network connectivity test:
  ```bash
  # From Function Compute test page
  telnet wms-mysql.rds.aliyuncs.com 3306
  # Should connect successfully
  ```

---

## Performance & Optimization Phase

### ✅ Cold Start Testing

- [ ] First invocation timing noted (cold start)
- [ ] Subsequent invocations timing measured (warm start)
- [ ] Cold start > 3s? Consider:
  - [ ] Increase memory allocation
  - [ ] Enable provisioned concurrency
  - [ ] Optimize code dependencies

### ✅ Load Testing

- [ ] Perform load test with Apache JMeter or similar:
  ```bash
  # Simple test: 100 concurrent requests
  ab -n 1000 -c 100 https://<SERVICE_ID>.ap-southeast-5.fc.aliyuncs.com/api/command/health
  ```
- [ ] Monitor error rate during load
- [ ] Monitor CloudMonitor metrics during test
- [ ] Identify and fix bottlenecks

### ✅ Cost Analysis

- [ ] Estimated monthly cost calculated
- [ ] Memory size optimized:
  - [ ] Lower memory reduces cost but increases CPU throttling
  - [ ] 512-1024 MB often optimal for this use case
- [ ] Invocation count projected based on usage
- [ ] Cost optimization recommendations:
  - [ ] Use reserved concurrency only for critical hours
  - [ ] Optimize code to reduce execution time
  - [ ] Cache frequently accessed data

---

## CI/CD Integration Phase

### ✅ GitHub Actions Setup

- [ ] `.github/workflows/deploy-fc.yml` created
- [ ] GitHub Secrets configured:
  - [ ] ALIBABA_ACCESS_KEY_ID
  - [ ] ALIBABA_ACCESS_KEY_SECRET
  - [ ] ALIBABA_REGION
  - [ ] IMAGE_REGISTRY_URI
- [ ] Workflow tested (manual trigger):
  ```bash
  # Push to trigger: git push origin main
  ```
- [ ] Deployment successful from GitHub Actions

### ✅ Automated Testing in CI/CD

- [ ] Unit tests run before deployment
- [ ] Linting passes
- [ ] Docker build succeeds
- [ ] Image pushed to ACR only if tests pass
- [ ] Function deployed only if all checks pass

---

## Monitoring & Alerting Setup Phase

### ✅ CloudMonitor/CloudWatch Alarms

- [ ] Error rate alarm created (threshold: > 5 errors in 5 min)
- [ ] High latency alarm created (threshold: avg duration > 10s)
- [ ] Memory pressure alarm created (threshold: > 80%)
- [ ] Concurrent execution alarm created (threshold: > 80% of max)
- [ ] Alarm notifications configured:
  - [ ] Email notifications enabled
  - [ ] SMS notifications enabled (optional)
  - [ ] DingTalk integration (optional, for China-based team)

### ✅ Logging Configuration

- [ ] Application logs sent to SLS (Simple Log Service)
- [ ] Log retention set to 30 days
- [ ] Log queries saved for recurring analysis
- [ ] Sample queries:
  ```
  # Errors in last hour
  status >= 400 AND _time > now() - 3600
  
  # Slow requests
  duration > 10000 AND _time > now() - 3600
  
  # JWT validation failures
  message contains "JWT" AND status = 401
  ```

---

## Disaster Recovery & Backup Phase

### ✅ Backup Configuration

- [ ] Database backups enabled (RDS automatic backups)
- [ ] Backup retention: 30 days minimum
- [ ] Database snapshots taken:
  - [ ] Before major deployments
  - [ ] After significant data migrations
- [ ] Code backups (Git repository)
- [ ] Configuration backups (exported from Alibaba console)

### ✅ Disaster Recovery Plan

- [ ] Documented procedure to restore from backup
- [ ] RTO (Recovery Time Objective): < 1 hour
- [ ] RPO (Recovery Point Objective): < 1 day
- [ ] Tested recovery procedure at least once

---

## Production Go-Live Phase

### ✅ Final Checks Before Production

- [ ] All checklist items completed and verified
- [ ] No known critical bugs
- [ ] Performance meets requirements
- [ ] Cost is within budget
- [ ] Disaster recovery plan tested
- [ ] Team trained on production procedures
- [ ] Runbooks documented

### ✅ Production Deployment

- [ ] Enable monitoring on production function
- [ ] Scale up provisioned concurrency to production level
- [ ] Configure rate limiting if needed
- [ ] Enable request logging for audit trail
- [ ] Start monitoring CloudMonitor dashboard
- [ ] Alert on-call team that system is live

### ✅ Post-Deployment Monitoring (First 24h)

- [ ] Monitor error rate every 30 minutes
- [ ] Check latency metrics
- [ ] Verify database connections stable
- [ ] Monitor cost burn rate
- [ ] Review logs for any warnings
- [ ] Test critical user journeys manually
- [ ] Prepare rollback plan if issues arise

---

## Maintenance & Operations Phase

### ✅ Regular Maintenance

- [ ] Weekly: Review CloudMonitor metrics
- [ ] Weekly: Check error logs for patterns
- [ ] Monthly: Performance review and optimization
- [ ] Monthly: Cost analysis and forecasting
- [ ] Quarterly: Security audit and updates
- [ ] Quarterly: Disaster recovery drill

### ✅ Scaling Adjustments

- [ ] Monitor peak usage patterns
- [ ] Adjust provisioned concurrency based on demand
- [ ] Scale up memory if performance degrades
- [ ] Scale down memory if over-provisioned
- [ ] Implement caching if database queries become bottleneck

---

## Rollback Procedure (If Needed)

```bash
# 1. Immediately disable current version
aliyun fc update-function \
  --service-name wms-manufacturing \
  --function-name command-service \
  --environment-variables DISABLE_FUNCTION=true

# 2. Revert to previous image
aliyun fc update-function \
  --service-name wms-manufacturing \
  --function-name command-service \
  --code ImageUri=registry.ap-southeast-5.aliyuncs.com/<NAMESPACE>/wms-command-runtime:v1.0

# 3. Test endpoint
curl https://<SERVICE_ID>.ap-southeast-5.fc.aliyuncs.com/api/command/health

# 4. Monitor metrics
# Watch CloudMonitor for stability
```

---

## Sign-Off & Completion

- [ ] Project Manager: Approved for production
- [ ] DevOps Lead: Verified infrastructure
- [ ] Security Lead: Approved security configuration
- [ ] Database Admin: Confirmed RDS connectivity
- [ ] QA Lead: Verified functional testing
- [ ] Go-live date: _______________
- [ ] Deployment completed: _______________

---

## Notes & Issues Log

| Date | Issue | Resolution | Status |
|------|-------|-----------|--------|
| | | | |
| | | | |
| | | | |

---

**Document Version:** 1.0  
**Last Updated:** November 2025  
**Next Review:** December 2025
