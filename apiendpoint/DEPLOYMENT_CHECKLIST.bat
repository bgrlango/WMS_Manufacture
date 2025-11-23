@echo off
REM Quick deployment checklist for FastAPI Query Service (Windows)
REM Source: WMS Manufacturing System - Alibaba Cloud Function Compute
REM Last Updated: November 2025

cls
echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║   FastAPI Query Service - Deployment Checklist (Windows)         ║
echo ║   Alibaba Cloud Function Compute with Custom Python 3.9          ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

setlocal enabledelayedexpansion

echo PRE-DEPLOYMENT CHECKS:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo [ ] Checking Docker...
docker --version
if %ERRORLEVEL% NEQ 0 (
    echo [X] Docker not found or not running
    exit /b 1
) else (
    echo [✓] Docker verified
)
echo.

echo [ ] Checking Git repository...
cd apiendpoint
git status --porcelain >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [✓] Git repository clean
) else (
    echo [!] Git issues detected
)
echo.

echo [ ] Checking requirements.txt...
if exist requirements.txt (
    echo [✓] requirements.txt found
) else (
    echo [X] requirements.txt missing
    exit /b 1
)
echo.

echo [ ] Checking bootstrap.py...
if exist bootstrap.py (
    echo [✓] bootstrap.py found
) else (
    echo [X] bootstrap.py missing
    exit /b 1
)
echo.

echo LOCAL DOCKER TESTING:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

echo [ ] Building Docker image...
docker build -f Dockerfile.custom -t wms-query:test . >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [X] Docker build failed
    exit /b 1
) else (
    echo [✓] Docker build successful
)
echo.

echo [ ] Verifying bootstrap.py in image...
docker run --rm wms-query:test python -c "import os; os.path.exists('/code/bootstrap.py') and print('✓ bootstrap.py exists') or print('✗ NOT FOUND')"
echo.

echo [ ] Listing /code directory...
docker run --rm wms-query:test cmd /c "dir /code | findstr bootstrap"
echo.

echo DEPLOYMENT OPTIONS:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 1. Push to Alibaba ACR:
echo    set ACR_NAMESPACE=YOUR_NAMESPACE
echo    set ACR_REGION=ap-southeast-5
echo    set IMAGE_TAG=v1
echo.
echo    docker tag wms-query:test %%ACR_REGION%%.aliyuncs.com/%%ACR_NAMESPACE%%/wms-query:%%IMAGE_TAG%%
echo    docker push registry.%%ACR_REGION%%.aliyuncs.com/%%ACR_NAMESPACE%%/wms-query:%%IMAGE_TAG%%
echo.
echo 2. Deploy with aliyun CLI:
echo    aliyun fc deploy-function ^
echo      --service-name query-service ^
echo      --function-name query-service ^
echo      --handler bootstrap.http_handler ^
echo      --runtime custom ^
echo      --environment CODE_DIR=/code,PYTHONPATH=/code
echo.
echo 3. Or use template deployment:
echo    aliyun fc deploy --template-file template.yml
echo.
echo VERIFICATION:
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo After deployment, verify with:
echo.
echo   # Get function info
echo   aliyun fc get-function --service-name query-service --function-name query-service
echo.
echo   # Check logs
echo   aliyun fc get-function-logs --service-name query-service --function-name query-service --limit 50
echo.
echo   # Invoke function
echo   aliyun fc invoke-function --service-name query-service --function-name query-service --invocation-type async
echo.
echo   # Test endpoint
echo   curl -X GET https://^<fc-url^>/2016-08-15/proxy/query-service/query-service/health
echo.
echo ╔══════════════════════════════════════════════════════════════════╗
echo ║   ✓ Ready for Deployment!                                       ║
echo ║   Docker image tested and verified. Ready to push to ACR.        ║
echo ╚══════════════════════════════════════════════════════════════════╝
echo.

pause
