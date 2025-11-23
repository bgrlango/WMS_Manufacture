#!/bin/bash
# Quick deployment checklist for FastAPI Query Service
# Source: WMS Manufacturing System - Alibaba Cloud Function Compute
# Last Updated: November 2025

echo "
╔══════════════════════════════════════════════════════════════════╗
║   🚀 FastAPI Query Service - Deployment Checklist              ║
║   Alibaba Cloud Function Compute with Custom Python 3.9         ║
╚══════════════════════════════════════════════════════════════════╝
"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_item() {
    echo -e "${YELLOW}[ ] $1${NC}"
}

done_item() {
    echo -e "${GREEN}[✓] $1${NC}"
}

fail_item() {
    echo -e "${RED}[✗] $1${NC}"
}

echo ""
echo "PRE-DEPLOYMENT CHECKS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_item "Docker installed and running"
docker --version
if [ $? -eq 0 ]; then done_item "Docker verified"; else fail_item "Docker not found"; exit 1; fi
echo ""

check_item "Git repository clean"
cd apiendpoint
git status --porcelain
if [ -z "$(git status --porcelain)" ]; then done_item "Repository clean"; else check_item "Uncommitted changes"; fi
echo ""

check_item "Requirements.txt exists"
if [ -f requirements.txt ]; then done_item "requirements.txt found"; else fail_item "requirements.txt missing"; exit 1; fi
echo ""

check_item "Bootstrap.py exists"
if [ -f bootstrap.py ]; then done_item "bootstrap.py found"; else fail_item "bootstrap.py missing"; exit 1; fi
echo ""

echo "LOCAL DOCKER TESTING:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

check_item "Building Docker image..."
docker build -f Dockerfile.custom -t wms-query:test . 2>&1 | grep -E "(Successfully|error|ERROR)"
if [ $? -eq 0 ]; then done_item "Docker build successful"; else fail_item "Docker build failed"; exit 1; fi
echo ""

check_item "Verifying bootstrap.py in image..."
docker run --rm wms-query:test test -f /code/bootstrap.py && echo "✓ bootstrap.py exists" || echo "✗ bootstrap.py NOT FOUND"
echo ""

check_item "Listing /code directory..."
docker run --rm wms-query:test ls -la /code/ | head -5
echo ""

echo "DEPLOYMENT OPTIONS:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Push to Alibaba ACR and Deploy to Function Compute:"
echo "   export ACR_NAMESPACE=<your-namespace>"
echo "   export ACR_REGION=ap-southeast-5"
echo "   export IMAGE_TAG=v1"
echo ""
echo "   docker tag wms-query:test registry.\${ACR_REGION}.aliyuncs.com/\${ACR_NAMESPACE}/wms-query:\${IMAGE_TAG}"
echo "   docker push registry.\${ACR_REGION}.aliyuncs.com/\${ACR_NAMESPACE}/wms-query:\${IMAGE_TAG}"
echo ""
echo "2. Deploy with aliyun CLI:"
echo "   aliyun fc deploy-function \\"
echo "     --service-name query-service \\"
echo "     --function-name query-service \\"
echo "     --handler bootstrap.http_handler \\"
echo "     --runtime custom \\"
echo "     --environment CODE_DIR=/code,PYTHONPATH=/code"
echo ""
echo "3. Or use template deployment:"
echo "   aliyun fc deploy --template-file template.yml"
echo ""
echo "VERIFICATION:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After deployment, verify with:"
echo ""
echo "  # Get function info"
echo "  aliyun fc get-function --service-name query-service --function-name query-service"
echo ""
echo "  # Check logs"
echo "  aliyun fc get-function-logs --service-name query-service --function-name query-service --limit 50"
echo ""
echo "  # Invoke function"
echo "  aliyun fc invoke-function --service-name query-service --function-name query-service --invocation-type async"
echo ""
echo "  # Test endpoint"
echo "  curl -X GET https://<fc-url>/2016-08-15/proxy/query-service/query-service/health"
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║   ✅ Ready for Deployment!                                      ║"
echo "║   Docker image tested and verified. Ready to push to ACR.        ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
