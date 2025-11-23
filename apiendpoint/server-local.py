#!/usr/bin/env python3
"""
Local development server for FastAPI
Supports both local and Function Compute testing
"""

import os
import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, '/code' if os.path.exists('/code') else str(Path(__file__).parent))

def main():
    import uvicorn
    from dotenv import load_dotenv
    
    # Load environment
    load_dotenv()
    
    # Detect environment
    is_running_in_fc = os.environ.get('FC_FUNCTION_NAME') is not None
    
    # Port selection
    port = int(os.environ.get('PORT', 9000 if is_running_in_fc else 8000))
    host = os.environ.get('HOST', '127.0.0.1')
    
    # Reload setting
    reload = os.environ.get('ENV', 'development') == 'development'
    
    env_name = 'Function Compute' if is_running_in_fc else 'Local Development'
    
    print(f"\n{'='*60}")
    print(f"✅ WMS Manufacturing Query Service (FastAPI)")
    print(f"   Environment: {env_name}")
    print(f"   Listening on: {host}:{port}")
    print(f"   URL: http://{host}:{port}")
    print(f"   Health: http://{host}:{port}/health")
    print(f"   Docs: http://{host}:{port}/docs")
    print(f"{'='*60}\n")
    
    # Start server
    uvicorn.run(
        'app.main:app',
        host=host,
        port=port,
        reload=reload,
        log_level='info',
        access_log=True,
    )

if __name__ == '__main__':
    main()
