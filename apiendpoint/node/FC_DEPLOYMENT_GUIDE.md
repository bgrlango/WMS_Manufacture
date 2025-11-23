# Alibaba Cloud Function Compute - Node.js Custom Runtime Setup

**Last Updated:** November 2025  
**Target:** Alibaba Cloud Function Compute (FC) with Custom Node.js 18 Runtime  
**Architecture:** CQRS Command Service

---

## Overview

This guide covers deploying the WMS Manufacturing Command Service to Alibaba Cloud Function Compute using a custom Node.js 18 runtime.

### Key Features
- ✅ Custom Node.js 18 runtime support
- ✅ HTTP trigger for RESTful APIs
- ✅ VPC integration with RDS MySQL
- ✅ Automatic scaling
- ✅ Environment variable management
- ✅ Graceful shutdown handling
- ✅ Local development compatibility

---

## Prerequisites

### Local Development Setup
```bash
# Install Alibaba Cloud CLI tools
npm install -g @alibabacloud/fc-tools

# Or install Serverless Framework
npm install -g serverless
npm install -g serverless-alibaba-fc-function-compute
```

### Alibaba Cloud Account Requirements
- Access Key ID and Secret
- Function Compute enabled in your region
- RDS MySQL instance (8.0.41+)
- VPC configured with security groups
- NAT Gateway for outbound internet (optional)

### Regional Information
- **Singapore (ap-southeast-1):** Primary production region
- **Jakarta (ap-southeast-5):** Secondary production region
- **Tokyo (ap-northeast-1):** Backup region

---

## Project Structure

```
apiendpoint/node/
├── bootstrap.js                      # FC entry point
├── server-express.js                 # Express app (shared)
├── server-local.js                   # Local development server
├── function-compute-handler.js       # FC handlers
├── fc.custom                         # Custom runtime definition
├── template.yml                      # Deployment template
├── Dockerfile                        # Container for custom runtime
├── package.json                      # Dependencies
├── config/
│   ├── database.js
│   └── alibaba.config.js
├── middleware/
│   ├── cqrsMiddleware.js
│   ├── authMiddleware.js
│   └── ...
├── controllers/
├── routes/
├── models/
└── ...
```

---

## Step 1: Build Custom Runtime Image

### Option A: Using Docker (Recommended)

Create `apiendpoint/node/Dockerfile.custom`:

```dockerfile
FROM node:18-alpine

# Install Node.js
RUN apk add --no-cache \
    bash \
    curl \
    git \
    python3 \
    make \
    g++ \
    ca-certificates

# Set working directory
WORKDIR /code

# Copy bootstrap script
COPY bootstrap.js /code/
COPY server-express.js /code/
COPY function-compute-handler.js /code/
COPY package*.json /code/

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . /code/

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:9000/health || exit 1

# Expose port
EXPOSE 9000

# Set environment
ENV FC_FUNCTION_NAME=wms-command-service \
    FC_REQUEST_ID=local \
    FC_LOG_TYPE=tail \
    FC_INITIALIZER=bootstrap.js

# Start
ENTRYPOINT ["/code/bootstrap.js"]
```

### Build and Push to Alibaba ACR

```bash
# Login to Alibaba Cloud ACR
docker login -u <your-aliyun-id>@<namespace> registry.ap-southeast-5.aliyuncs.com

# Build image
docker build -f Dockerfile.custom -t wms-command-runtime:latest .

# Tag for ACR
docker tag wms-command-runtime:latest registry.ap-southeast-5.aliyuncs.com/<namespace>/wms-command-runtime:latest

# Push
docker push registry.ap-southeast-5.aliyuncs.com/<namespace>/wms-command-runtime:latest
```

---

## Step 2: Deploy to Function Compute

### Using Alibaba Cloud Console

1. **Create Service:**
   - Log in to Alibaba Cloud Console
   - Navigate to Function Compute
   - Create new Service: `wms-manufacturing`
   - Select VPC and security group

2. **Create Function:**
   - Function name: `command-service`
   - Runtime: **Custom**
   - Custom Runtime Image: `registry.ap-southeast-5.aliyuncs.com/<namespace>/wms-command-runtime:latest`
   - Memory: 1024 MB (min) to 3072 MB
   - Timeout: 300 seconds
   - Ephemeral Storage: 512 MB

3. **Configure Environment Variables:**
   ```env
   DB_HOST=<RDS endpoint>
   DB_PORT=3306
   DB_USER=<database user>
   DB_PASSWORD=<database password>
   DB_NAME=wms_manufacture
   DB_DIALECT=mysql
   NODE_ENV=production
   JWT_SECRET=<your-jwt-secret>
   CORS_ORIGIN=https://your-domain.com
   LOG_LEVEL=info
   ```

4. **Configure HTTP Trigger:**
   - Trigger Type: HTTP
   - HTTP Methods: POST, PUT, DELETE, GET
   - Path Pattern: /api/command/*
   - Qualifier: LATEST

5. **Configure VPC Access:**
   - VPC ID: <your-vpc>
   - Security Group: <your-security-group>
   - V-Switch: <your-v-switch>

### Using FC CLI

```bash
# Initialize project
fc init

# Configure credentials
fc config set access_key_id <your-access-key>
fc config set access_key_secret <your-access-secret>
fc config set region ap-southeast-5

# Create function
fc function create --function-name command-service \
  --handler function-compute-handler.handler \
  --runtime custom \
  --timeout 300 \
  --memory 1024

# Deploy
fc deploy

# Invoke function
fc invoke --function-name command-service
```

---

## Step 3: Local Development & Testing

### Run Locally

```bash
# Install dependencies
npm install

# Create .env file
cp ../../.env.example .env

# Update .env with local database credentials
nano .env

# Start development server (local)
npm run dev
# Server runs on http://localhost:3108

# Or test FC bootstrap locally
npm run fc:dev
# Bootstrap runs on http://localhost:9000
```

### Test Function Locally

```bash
# Using FC emulator
fc local start

# In another terminal
curl -X GET http://localhost:9000/health
```

### Test Production Endpoint

```bash
# Get function URL from Alibaba Console
FC_ENDPOINT="https://<service-id>.ap-southeast-5.fc.aliyuncs.com/api/command"

# Test health endpoint
curl -X GET ${FC_ENDPOINT}/health

# Test production order creation
curl -X POST ${FC_ENDPOINT}/production/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{
    "part_number": "PN-001",
    "quantity": 1000,
    "priority": "high"
  }'
```

---

## Step 4: Database Configuration

### RDS MySQL Security Group Rules

Ensure your RDS security group allows inbound on port 3306 from the Function Compute security group:

```bash
# Using Alibaba CLI
aliyun ecs AuthorizeSecurityGroup \
  --RegionId ap-southeast-5 \
  --SecurityGroupId <rds-sg-id> \
  --SourceSecurityGroupId <fc-sg-id> \
  --IpProtocol tcp \
  --PortRange 3306/3306
```

### Connection Pooling for FC

Update `apiendpoint/node/config/database.js`:

```javascript
const connectionPool = {
  min: 1,           // Minimum connections
  max: 10,          // Maximum connections (FC has per-instance limits)
  acquire: 30000,   // Acquire timeout
  idle: 10000,      // Idle timeout
  evict: 10000      // Eviction interval
};
```

---

## Step 5: Monitoring & Logging

### CloudWatch/CloudMonitor Integration

Enable Function Compute logging:

```env
# Environment variables
FC_LOG_TYPE=tail              # Log to stderr/stdout
FC_LOG_LEVEL=info
LOG_RETENTION_DAYS=30
```

### View Logs

```bash
# Using FC CLI
fc logs --function-name command-service --tail

# Using Alibaba CLI
aliyun fc get_function --service-name wms-manufacturing --function-name command-service
```

### Metrics

Monitor in Alibaba Cloud Console:
- **Invocations:** Total function calls
- **Errors:** Failed invocations
- **Duration:** Average execution time
- **Memory Usage:** Peak memory consumption
- **Concurrent Executions:** Running instances

---

## Step 6: Scaling Configuration

### Auto-Scaling Settings

```yaml
# Reserve capacity (min 0, max 100)
ProvisionedConcurrencyConfig:
  CurrentProvisionedConcurrentExecutions: 10
  ProvisionedConcurrentExecutions: 10

# Reserved instances
ReservedConcurrentExecutions: 100
```

### Cold Start Optimization

- **Provisioned Concurrency:** Keep instances warm
- **Code Optimization:** Lazy load heavy modules
- **Memory Size:** Higher memory = more CPU power
- **Timeout:** Set appropriate timeout (300s recommended)

---

## Step 7: CI/CD Integration

### GitHub Actions Deployment

Create `.github/workflows/deploy-fc.yml`:

```yaml
name: Deploy to Alibaba FC

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure Alibaba Cloud Credentials
        run: |
          mkdir -p ~/.alibabacloud
          echo "access_key_id = ${{ secrets.ALIBABA_ACCESS_KEY_ID }}" >> ~/.alibabacloud/credentials
          echo "access_key_secret = ${{ secrets.ALIBABA_ACCESS_KEY_SECRET }}" >> ~/.alibabacloud/credentials
      
      - name: Build and Push Docker Image
        run: |
          docker login -u ${{ secrets.ALIBABA_REGISTRY_USER }} -p ${{ secrets.ALIBABA_REGISTRY_PASSWORD }}
          docker build -f Dockerfile.custom -t wms-command-runtime:latest .
          docker push registry.ap-southeast-5.aliyuncs.com/<namespace>/wms-command-runtime:latest
      
      - name: Deploy to Function Compute
        run: |
          fc config set access_key_id ${{ secrets.ALIBABA_ACCESS_KEY_ID }}
          fc config set access_key_secret ${{ secrets.ALIBABA_ACCESS_KEY_SECRET }}
          fc config set region ap-southeast-5
          fc deploy
```

---

## Troubleshooting

### Issue: Function Timeout

**Solution:**
- Increase timeout: Default 3s → 300s
- Optimize database queries
- Use connection pooling
- Check cold start time

```bash
# Increase timeout
fc update --function-name command-service --timeout 300
```

### Issue: Database Connection Failed

**Solution:**
- Verify VPC configuration
- Check security group rules
- Test RDS connectivity from FC instance
- Verify credentials in environment variables

```bash
# Test connection
fc invoke --function-name command-service \
  --payload '{"test": "connection"}'
```

### Issue: Out of Memory (OOM)

**Solution:**
- Increase memory allocation
- Profile code for memory leaks
- Reduce concurrent connections
- Optimize payload sizes

```bash
# Increase memory to 3GB
fc update --function-name command-service --memory 3072
```

### Issue: CORS Errors

**Solution:**
Update CORS configuration in `server-express.js`:

```javascript
const corsOptions = {
  origin: ['https://your-domain.com', 'https://app.your-domain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
};
```

---

## Security Best Practices

1. **Credentials Management:**
   - Store secrets in Alibaba Cloud Secrets Manager
   - Use IAM roles instead of access keys
   - Rotate credentials regularly

2. **VPC Isolation:**
   - Place function in private VPC
   - Use NAT Gateway for outbound traffic
   - Restrict security group rules

3. **API Protection:**
   - Enable API Gateway rate limiting
   - Implement JWT validation
   - Add IP whitelisting

4. **Monitoring:**
   - Enable CloudTrail/ActionTrail logging
   - Set up CloudWatch alarms
   - Monitor suspicious activity

---

## Cost Optimization

### Pricing Breakdown (Alibaba FC)
- **Invocations:** ¥0.0000002 per call
- **Memory:** ¥0.0000167 per GB/second
- **Storage:** ¥0.000111 per GB/month

### Cost Reduction Tips
1. Use provisioned concurrency only for critical functions
2. Optimize code to reduce execution time
3. Use appropriate memory size (not over-provisioned)
4. Implement request caching
5. Use async processing where possible

---

## Next Steps

1. Deploy and test production endpoint
2. Set up monitoring and alerts
3. Configure CI/CD pipeline
4. Load testing with Apache JMeter
5. Document API endpoints for consumers
6. Set up disaster recovery procedures

---

## Support & Resources

- **Alibaba Cloud Documentation:** https://www.alibabacloud.com/help/fc
- **Function Compute CLI:** https://github.com/alibaba/serverless-fc
- **Troubleshooting Guide:** https://www.alibabacloud.com/help/fc/latest/troubleshooting
- **Community Forum:** https://developer.aliyun.com/forums

---

**Deployment Status:** ✅ Ready for Production

Last Updated: November 2025
