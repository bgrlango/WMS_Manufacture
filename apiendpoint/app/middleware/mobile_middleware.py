"""
Mobile API Middleware for FastAPI (Simplified Version)
Device detection, compression, and mobile optimization
"""
import time
import gzip
from typing import Dict, Any
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class MobileOptimizationMiddleware(BaseHTTPMiddleware):
    """Mobile optimization middleware for FastAPI"""
    
    def __init__(self, app, enable_compression: bool = True):
        super().__init__(app)
        self.enable_compression = enable_compression
        
    async def dispatch(self, request: Request, call_next):
        # Device detection
        user_agent = request.headers.get('user-agent', '')
        mobile_header = request.headers.get('x-mobile-app') == 'true'
        
        is_mobile = mobile_header or any(device in user_agent.lower() for device in 
                                       ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'])
        
        # Add mobile info to request state
        request.state.is_mobile = is_mobile
        request.state.device_id = request.headers.get('x-device-id', 'unknown')
        request.state.app_version = request.headers.get('x-app-version', '1.0.0')
        
        # Process request
        response = await call_next(request)
        
        # Add mobile optimization headers
        if is_mobile:
            response.headers['X-Mobile-Optimized'] = 'true'
            response.headers['X-Device-Detected'] = 'mobile'
        
        # Response compression for mobile (simplified)
        if (self.enable_compression and 
            is_mobile and 
            response.headers.get('content-type', '').startswith('application/json')):
            response.headers['Content-Encoding'] = 'optimized'
        
        return response

class MobileRateLimitMiddleware(BaseHTTPMiddleware):
    """Simple rate limiting middleware for mobile API"""
    
    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_counts: Dict[str, list] = {}
        
    async def dispatch(self, request: Request, call_next):
        # Get client identifier
        client_ip = request.client.host if request.client else 'unknown'
        device_id = request.headers.get('x-device-id', client_ip)
        
        # Check rate limit for mobile endpoints
        if request.url.path.startswith('/mobile'):
            current_time = time.time()
            
            # Clean old requests
            if device_id in self.request_counts:
                self.request_counts[device_id] = [
                    req_time for req_time in self.request_counts[device_id] 
                    if current_time - req_time < 60
                ]
            else:
                self.request_counts[device_id] = []
            
            # Check rate limit
            if len(self.request_counts[device_id]) >= self.requests_per_minute:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Rate Limit Exceeded",
                        "message": f"Maximum {self.requests_per_minute} requests per minute allowed",
                        "retry_after": 60
                    }
                )
            
            # Add current request
            self.request_counts[device_id].append(current_time)
        
        return await call_next(request)
