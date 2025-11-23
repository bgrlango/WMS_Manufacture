@echo off
REM Script to test Docker image locally (Windows)
REM Usage: test_docker.bat

setlocal enabledelayedexpansion

echo.
echo 🐳 Building Docker image for FastAPI...
docker build -f Dockerfile.custom -t wms-query:latest .

if %ERRORLEVEL% NEQ 0 (
    echo ✗ Docker build failed
    exit /b 1
)

echo ✓ Docker build successful
echo.

echo 📋 Verifying bootstrap.py exists in image...
docker run --rm wms-query:latest python -c "import os; assert os.path.exists('/code/bootstrap.py'), 'bootstrap.py not found'; print('✓ bootstrap.py verified')"

if %ERRORLEVEL% NEQ 0 (
    echo ✗ bootstrap.py verification failed
    exit /b 1
)

echo.
echo 📂 Listing /code directory in image...
docker run --rm wms-query:latest cmd /c dir /code/

echo.
echo 🧪 Running FastAPI in Docker for 10 seconds (test)...
REM Note: This will timeout after 10 seconds, which is expected for this test
timeout /t 10 /nobreak
docker run --rm -p 9000:9000 wms-query:latest

echo.
echo ✓ Docker test completed
