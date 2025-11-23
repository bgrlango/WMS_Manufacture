#!/usr/bin/env python3
"""
Alibaba Cloud Function Compute Bootstrap
Entry point for FastAPI application with Debian10 custom runtime
Handles HTTP requests on port 9000
"""

import os
import sys
import json
import logging
from pathlib import Path

# Configure logging FIRST
logging.basicConfig(
    level=logging.DEBUG,
    format='[%(levelname)s] %(asctime)s - %(name)s - %(message)s'
)
logger = logging.getLogger('bootstrap')

logger.info("="*70)
logger.info("🚀 BOOTSTRAP INITIALIZATION")
logger.info("="*70)

# Log environment
logger.info(f"Current working directory: {os.getcwd()}")
logger.info(f"Python executable: {sys.executable}")
logger.info(f"Python version: {sys.version}")
logger.info(f"Environment variables:")
for key in sorted(os.environ.keys()):
    if 'PATH' in key or 'PYTHON' in key or 'CODE' in key:
        logger.info(f"  {key}={os.environ[key][:100]}")

# Determine paths - Alibaba FC specific
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
logger.info(f"Script directory: {SCRIPT_DIR}")

# Try multiple paths
CODE_PATHS = [
    os.environ.get('CODE_DIR'),                    # From env var
    '/code',                                        # Alibaba FC standard
    SCRIPT_DIR,                                     # Current script directory
    os.path.dirname(SCRIPT_DIR),                   # Parent directory
    '/opt/python3.9',                              # Alibaba layer
    '/opt/python',                                 # Alibaba layer alt
]

CODE_DIR = None
for path in CODE_PATHS:
    if path and os.path.exists(path):
        logger.info(f"Checking path: {path}")
        if os.path.isdir(path):
            # Check if app/ or main.py exists
            if os.path.exists(os.path.join(path, 'app')) or os.path.exists(os.path.join(path, 'main.py')) or path == SCRIPT_DIR:
                CODE_DIR = path
                logger.info(f"✓ Using CODE_DIR: {CODE_DIR}")
                break

if not CODE_DIR:
    CODE_DIR = SCRIPT_DIR
    logger.warning(f"⚠ Using fallback CODE_DIR: {CODE_DIR}")

# Update sys.path
sys.path.insert(0, CODE_DIR)
sys.path.insert(0, os.path.join(CODE_DIR, 'app'))
logger.info(f"Updated sys.path: {sys.path[:3]}")

# Load environment variables
def load_env():
    """Load environment variables from .env files"""
    env_paths = [
        os.path.join(CODE_DIR, '.env'),
        os.path.join(CODE_DIR, '.env.production'),
        os.path.join(SCRIPT_DIR, '.env'),
        '/root/.env',
    ]
    
    for env_path in env_paths:
        if os.path.exists(env_path):
            logger.info(f"Loading environment from: {env_path}")
            try:
                from dotenv import load_dotenv
                load_dotenv(env_path)
                logger.info(f"✓ Loaded environment from {env_path}")
                return True
            except ImportError:
                logger.warning("python-dotenv not installed, reading manually")
                try:
                    with open(env_path, 'r') as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith('#') and '=' in line:
                                key, value = line.split('=', 1)
                                os.environ[key.strip()] = value.strip()
                    logger.info(f"✓ Manually loaded environment from {env_path}")
                    return True
                except Exception as e:
                    logger.warning(f"Error reading {env_path}: {e}")
    
    logger.info("No .env file found, using system environment")
    return False

load_env()

# Import FastAPI app with multiple strategies
def import_app():
    """Import FastAPI app with multiple fallback strategies"""
    
    logger.info("Attempting to import FastAPI application...")
    strategies = []
    
    # Strategy 1: Direct import from app.main
    try:
        logger.debug("Strategy 1: Attempting 'from app.main import app'")
        from app.main import app
        logger.info("✓ Strategy 1 SUCCESS: FastAPI app imported from app.main")
        return app
    except (ImportError, ModuleNotFoundError) as e:
        strategies.append(f"app.main: {e}")
        logger.debug(f"Strategy 1 failed: {e}")
    
    # Strategy 2: Import from main (current directory)
    try:
        logger.debug("Strategy 2: Attempting 'from main import app'")
        from main import app
        logger.info("✓ Strategy 2 SUCCESS: FastAPI app imported from main")
        return app
    except (ImportError, ModuleNotFoundError) as e:
        strategies.append(f"main: {e}")
        logger.debug(f"Strategy 2 failed: {e}")
    
    # Strategy 3: Load from file path using importlib
    try:
        logger.debug("Strategy 3: Attempting importlib.util.spec_from_file_location")
        import importlib.util
        
        main_paths = [
            os.path.join(CODE_DIR, 'app', 'main.py'),
            os.path.join(CODE_DIR, 'main.py'),
            os.path.join(SCRIPT_DIR, 'main.py'),
        ]
        
        for main_path in main_paths:
            logger.debug(f"Checking: {main_path}")
            if os.path.exists(main_path):
                logger.info(f"Found main.py at: {main_path}")
                spec = importlib.util.spec_from_file_location("app_main", main_path)
                if spec and spec.loader:
                    main_module = importlib.util.module_from_spec(spec)
                    sys.modules['app_main'] = main_module
                    spec.loader.exec_module(main_module)
                    if hasattr(main_module, 'app'):
                        logger.info(f"✓ Strategy 3 SUCCESS: FastAPI app loaded from {main_path}")
                        return main_module.app
    except Exception as e:
        strategies.append(f"importlib: {e}")
        logger.debug(f"Strategy 3 failed: {e}")
    
    # All strategies failed
    logger.error("❌ ALL IMPORT STRATEGIES FAILED!")
    logger.error("\nDiagnostic Information:")
    logger.error(f"  CODE_DIR: {CODE_DIR}")
    logger.error(f"  SCRIPT_DIR: {SCRIPT_DIR}")
    logger.error(f"  CWD: {os.getcwd()}")
    logger.error(f"  sys.path[:5]: {sys.path[:5]}")
    
    logger.error("\nAttempted strategies:")
    for strategy in strategies:
        logger.error(f"  - {strategy}")
    
    logger.error("\nDirectory contents:")
    try:
        contents = os.listdir(CODE_DIR)
        logger.error(f"  {CODE_DIR}/: {contents[:10]}")
    except Exception as e:
        logger.error(f"  Error listing {CODE_DIR}: {e}")
    
    sys.exit(1)

# Import the app
app = import_app()
logger.info(f"FastAPI app object: {app}")
logger.info(f"App title: {getattr(app, 'title', 'N/A')}")

# Port configuration from environment
FC_PORT = int(os.environ.get('FC_PORT', 9000))
FC_HOST = os.environ.get('FC_HOST', '0.0.0.0')

logger.info(f"Configured to listen on {FC_HOST}:{FC_PORT}")
logger.info("="*70)

# ASGI app reference
asgi_app = app

# HTTP handler for Alibaba FC
def http_handler(environ, start_response):
    """
    WSGI handler for Alibaba Function Compute
    Converts WSGI to ASGI for FastAPI
    """
    import io
    from urllib.parse import unquote
    
    # Extract request details
    method = environ.get('REQUEST_METHOD', 'GET')
    path = unquote(environ.get('PATH_INFO', '/'))
    query_string = environ.get('QUERY_STRING', '')
    content_length = int(environ.get('CONTENT_LENGTH', 0))
    body = environ['wsgi.input'].read(content_length) if content_length else b''
    
    headers = {}
    for key, value in environ.items():
        if key.startswith('HTTP_'):
            headers[key[5:].replace('_', '-').lower()] = value
    
    # Create ASGI event
    asgi_scope = {
        'type': 'http',
        'asgi': {'version': '3.0'},
        'http_version': '1.1',
        'method': method,
        'scheme': environ.get('wsgi.url_scheme', 'http'),
        'path': path,
        'query_string': query_string.encode(),
        'root_path': '',
        'headers': [[k.encode(), v.encode()] for k, v in headers.items()],
        'server': (environ.get('SERVER_NAME', 'localhost'), int(environ.get('SERVER_PORT', 80))),
        'client': (environ.get('REMOTE_ADDR', '0.0.0.0'), 0),
        'state': {},
    }
    
    response_started = False
    status_code = 200
    response_headers = []
    
    async def asgi_coroutine():
        nonlocal response_started, status_code, response_headers
        
        # Receive
        async def receive():
            return {'type': 'http.request', 'body': body, 'more_body': False}
        
        # Send
        async def send(message):
            nonlocal response_started, status_code, response_headers
            if message['type'] == 'http.response.start':
                response_started = True
                status_code = message['status']
                response_headers = message.get('headers', [])
            elif message['type'] == 'http.response.body':
                if response_started:
                    body = message.get('body', b'')
                    if body:
                        start_response(f"{status_code} OK", response_headers)
                        return body
        
        await app(asgi_scope, receive, send)
    
    # Run async coroutine
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        response_body = loop.run_until_complete(asgi_coroutine())
        if response_body:
            start_response(f"{status_code} OK", response_headers)
            return [response_body]
    finally:
        loop.close()
    
    start_response('200 OK', [('Content-Type', 'application/json')])
    return [b'{"status":"ok"}']

if __name__ == '__main__':
    try:
        import uvicorn
        
        # Detect if running in Function Compute
        is_running_in_fc = os.environ.get('FC_FUNCTION_NAME') is not None
        env_name = 'Alibaba FC' if is_running_in_fc else 'Local Development'
        
        logger.info("\n" + "="*70)
        logger.info("✅ WMS Manufacturing Query Service (FastAPI)")
        logger.info(f"   Environment: {env_name}")
        logger.info(f"   Listening on: http://{FC_HOST}:{FC_PORT}")
        logger.info(f"   Health Check: http://{FC_HOST}:{FC_PORT}/health")
        logger.info(f"   API Docs: http://{FC_HOST}:{FC_PORT}/docs")
        logger.info("="*70 + "\n")
        
        # Start Uvicorn server
        uvicorn.run(
            app,
            host=FC_HOST,
            port=FC_PORT,
            log_level='info',
            access_log=True,
            reload=False,
        )
        
    except ImportError as e:
        logger.error(f"Required package not found: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to start server: {e}", exc_info=True)
        sys.exit(1)
