#!/bin/bash

# Script to test Docker image locally
# Usage: ./test_docker.sh

set -e

echo "🐳 Building Docker image for FastAPI..."
docker build -f Dockerfile.custom -t wms-query:latest .

if [ $? -eq 0 ]; then
    echo "✓ Docker build successful"
else
    echo "✗ Docker build failed"
    exit 1
fi

echo ""
echo "📋 Verifying bootstrap.py exists in image..."
docker run --rm wms-query:latest ls -la /code/bootstrap.py

if [ $? -eq 0 ]; then
    echo "✓ bootstrap.py found in image"
else
    echo "✗ bootstrap.py NOT found in image"
    exit 1
fi

echo ""
echo "📂 Listing /code directory in image..."
docker run --rm wms-query:latest ls -la /code/

echo ""
echo "🚀 Testing FastAPI startup (will run for 5 seconds)..."
timeout 5 docker run --rm -p 9000:9000 wms-query:latest || true

echo ""
echo "✓ Docker test completed"
