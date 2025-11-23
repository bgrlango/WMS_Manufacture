#!/usr/bin/env python3
"""
Alibaba Cloud Function Compute Bootstrap
Entry point for FastAPI application with custom Python runtime
Listens on port 9000 (FC standard)
"""

import os
import sys
import signal
import logging
from pathlib import Path

# Determine the code directory dynamically
# Support multiple Alibaba Cloud deployment paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CODE_DIR = os.environ.get('CODE_DIR', SCRIPT_DIR)

# Alibaba Cloud FC paths (priority order)
ALIBABA_FC_PATHS = [
    CODE_DIR,                           # ENV variable first
    SCRIPT_DIR,                         # Script directory
    '/code',                            # Standard custom runtime path
    '/root/code',                       # Alternative root path
    os.path.expandvars('$PYTHONPATH'),  # From PYTHONPATH env
    '/opt/fc/code',                     # Alibaba FC optional path
    '/mnt/code',                        # Mounted path in FC
]

# Find valid code directory
for path in ALIBABA_FC_PATHS:
    if path and os.path.exists(path) and os.path.exists(os.path.join(path, 'app')):
        CODE_DIR = path
        logger.info(f"Using code directory: {CODE_DIR}")
        break
else:
    # Fallback: use first path that exists (even without app/)
    for path in ALIBABA_FC_PATHS:
        if path and os.path.exists(path):
            CODE_DIR = path
            logger.info(f"Using code directory (fallback): {CODE_DIR}")
            break

logger.info(f"LD_LIBRARY_PATH: {os.environ.get('LD_LIBRARY_PATH', 'NOT SET')}")
logger.info(f"PATH: {os.environ.get('PATH', 'NOT SET')[:100]}...")
logger.info(f"PYTHONPATH: {os.environ.get('PYTHONPATH', 'NOT SET')}")

# Add app directory to path
sys.path.insert(0, CODE_DIR)
sys.path.insert(0, os.path.join(CODE_DIR, 'app'))
sys.path.insert(0, os.path.join(CODE_DIR, 'app', 'app'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(asctime)s - %(name)s - %(message)s'
)
logger = logging.getLogger('bootstrap')

# Load environment variables from multiple paths
def load_env():
    """Load environment variables from .env files"""
    env_paths = [
        os.path.join(CODE_DIR, '.env'),
        os.path.join(CODE_DIR, '.env.production'),
        os.path.expanduser('~/.env'),
        '.env'
    ]
    
    for env_path in env_paths:
        if os.path.exists(env_path):
            logger.info(f"Loading environment from: {env_path}")
            try:
                from dotenv import load_dotenv
                load_dotenv(env_path)
                logger.info(f"✓ Loaded environment from {env_path}")
                break
            except ImportError:
                logger.warning("python-dotenv not installed, reading manually")
                # Manual .env reading
                try:
                    with open(env_path, 'r') as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith('#'):
                                key, value = line.split('=', 1)
                                os.environ[key.strip()] = value.strip()
                except Exception as e:
                    logger.warning(f"Error reading {env_path}: {e}")
                break

# Load environment
load_env()

# Import FastAPI app with fallback strategies
def import_app():
    """Import FastAPI app with multiple fallback strategies"""
    import_errors = []
    
    # Strategy 1: Direct import from app.main
    try:
        from app.main import app
        logger.info("✓ Strategy 1: FastAPI app imported from app.main")
        return app
    except ImportError as e:
        import_errors.append(f"app.main: {e}")
    
    # Strategy 2: Import from main
    try:
        from main import app
        logger.info("✓ Strategy 2: FastAPI app imported from main")
        return app
    except ImportError as e:
        import_errors.append(f"main: {e}")
    
    # Strategy 3: Load from file path
    try:
        import importlib.util
        main_paths = [
            os.path.join(CODE_DIR, 'app', 'main.py'),
            os.path.join(CODE_DIR, 'main.py'),
            '/code/app/main.py',
            '/opt/fc/code/app/main.py',
        ]
        
        for main_path in main_paths:
            if os.path.exists(main_path):
                logger.info(f"Loading main.py from: {main_path}")
                spec = importlib.util.spec_from_file_location("app_main", main_path)
                main_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(main_module)
                logger.info(f"✓ Strategy 3: FastAPI app loaded from {main_path}")
                return main_module.app
        
        import_errors.append(f"main.py not found in: {main_paths}")
    except Exception as e:
        import_errors.append(f"File import: {e}")
    
    # All strategies failed - detailed diagnostic
    logger.error("="*70)
    logger.error("FAILED TO IMPORT FASTAPI APP - DIAGNOSTIC INFO:")
    logger.error("="*70)
    
    logger.error("Failed strategies:")
    for error in import_errors:
        logger.error(f"  - {error}")
    
    logger.error(f"\nEnvironment:")
    logger.error(f"  CODE_DIR: {CODE_DIR}")
    logger.error(f"  SCRIPT_DIR: {SCRIPT_DIR}")
    logger.error(f"  PWD: {os.getcwd()}")
    logger.error(f"  FC_FUNCTION_NAME: {os.environ.get('FC_FUNCTION_NAME', 'NOT SET')}")
    
    logger.error(f"\nDirectory contents:")
    try:
        if os.path.exists(CODE_DIR):
            contents = os.listdir(CODE_DIR)
            logger.error(f"  {CODE_DIR}: {contents}")
        else:
            logger.error(f"  {CODE_DIR}: DOES NOT EXIST")
    except Exception as e:
        logger.error(f"  Error listing {CODE_DIR}: {e}")
    
    logger.error(f"\nsys.path (first 5):")
    for i, path in enumerate(sys.path[:5], 1):
        logger.error(f"  [{i}] {path}")
    
    logger.error("="*70)
    sys.exit(1)

app = import_app()

# Port configuration
FC_PORT = int(os.environ.get('FC_PORT', 9000))
FC_HOST = os.environ.get('FC_HOST', '0.0.0.0')

# Create ASGI app reference
asgi_app = app

def signal_handler(signum, frame):
    """Handle graceful shutdown"""
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

if __name__ == '__main__':
    try:
        import uvicorn
        
        # Detect if running in Function Compute
        is_running_in_fc = os.environ.get('FC_FUNCTION_NAME') is not None
        env_name = 'Function Compute' if is_running_in_fc else 'Local Development'
        
        logger.info("\n" + "="*60)
        logger.info("✅ WMS Manufacturing Query Service (FastAPI)")
        logger.info(f"   Environment: {env_name}")
        logger.info(f"   Listening on: {FC_HOST}:{FC_PORT}")
        logger.info(f"   URL: http://{FC_HOST}:{FC_PORT}")
        logger.info(f"   Health: http://{FC_HOST}:{FC_PORT}/health")
        logger.info(f"   Docs: http://{FC_HOST}:{FC_PORT}/docs")
        logger.info("="*60 + "\n")
        
        # Start Uvicorn server
        uvicorn.run(
            'app.main:app',
            host=FC_HOST,
            port=FC_PORT,
            log_level='info',
            access_log=True,
            reload=False,  # Production mode
        )
        
    except ImportError:
        logger.error("uvicorn not installed")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)
