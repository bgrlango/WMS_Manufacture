#!/usr/bin/env python3
"""
Diagnostic script to check bootstrap.py path resolution
Run this INSIDE the Docker container to debug path issues
"""

import os
import sys
from pathlib import Path

print("\n" + "="*70)
print("🔍 BOOTSTRAP PATH DIAGNOSIS")
print("="*70)

# Check environment
print("\n1️⃣  ENVIRONMENT VARIABLES:")
print(f"   PYTHONPATH: {os.environ.get('PYTHONPATH', 'NOT SET')}")
print(f"   CODE_DIR: {os.environ.get('CODE_DIR', 'NOT SET')}")
print(f"   FC_FUNCTION_NAME: {os.environ.get('FC_FUNCTION_NAME', 'NOT SET')}")
print(f"   PWD: {os.getcwd()}")

# Check script location
script_dir = os.path.dirname(os.path.abspath(__file__))
print(f"\n2️⃣  SCRIPT LOCATION:")
print(f"   Script: {__file__}")
print(f"   Directory: {script_dir}")

# Check for bootstrap.py
bootstrap_locations = [
    '/code/bootstrap.py',
    '/root/code/bootstrap.py',
    os.path.join(script_dir, 'bootstrap.py'),
    os.path.join(os.path.dirname(script_dir), 'bootstrap.py'),
    './bootstrap.py',
    '../bootstrap.py',
]

print(f"\n3️⃣  BOOTSTRAP.PY LOCATIONS:")
for loc in bootstrap_locations:
    exists = os.path.exists(loc)
    status = "✓ EXISTS" if exists else "✗ NOT FOUND"
    print(f"   {loc:<40} {status}")

# Check /code directory
print(f"\n4️⃣  /CODE DIRECTORY CONTENTS:")
if os.path.exists('/code'):
    try:
        contents = os.listdir('/code')
        for item in sorted(contents):
            path = os.path.join('/code', item)
            item_type = "📁" if os.path.isdir(path) else "📄"
            print(f"   {item_type} {item}")
    except Exception as e:
        print(f"   ✗ Error listing: {e}")
else:
    print(f"   ✗ /code directory does NOT exist")

# Check sys.path
print(f"\n5️⃣  PYTHON PATH (sys.path):")
for i, path in enumerate(sys.path[:5], 1):
    print(f"   [{i}] {path}")
if len(sys.path) > 5:
    print(f"   ... and {len(sys.path) - 5} more")

# Try to import app
print(f"\n6️⃣  IMPORT TEST:")
try:
    from app.main import app
    print(f"   ✓ Successfully imported 'app.main:app'")
except ImportError as e:
    print(f"   ✗ Failed to import 'app.main:app': {e}")

# Summary
print("\n" + "="*70)
print("📋 SUMMARY:")
print("="*70)
print("""
If bootstrap.py is NOT found:
1. Check Dockerfile COPY commands
2. Verify dockerfile RUN ls output
3. Check if files are being excluded by .dockerignore

If bootstrap.py IS found but import fails:
1. Check PYTHONPATH environment variable
2. Verify sys.path includes /code and /code/app
3. Check if app/main.py exists and is valid Python

Common fixes:
- Add 'ENV PYTHONPATH=/code' to Dockerfile
- Use absolute paths /code/bootstrap.py instead of relative paths
- Ensure WORKDIR /code is set before running Python
""")
print("="*70 + "\n")
