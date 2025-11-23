"""
Function Compute Handler for FastAPI
Handles HTTP and event-based invocations
"""

import json
import logging
from typing import Any, Dict
from app.main import app

logger = logging.getLogger('fc_handler')

async def http_handler(request, context) -> Any:
    """
    HTTP trigger handler
    Receives HTTP requests from API Gateway or direct invocation
    
    Args:
        request: HTTP request object
        context: Function Compute context
        
    Returns:
        HTTP response
    """
    try:
        # FastAPI/Starlette handles the request
        return await app(request, context)
    except Exception as e:
        logger.error(f"HTTP handler error: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }

async def event_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Event trigger handler
    Handles async events from MQ, Timer, etc.
    
    Args:
        event: Event data
        context: Function Compute context
        
    Returns:
        Event processing result
    """
    event_type = event.get('type')
    
    logger.info(f"Processing event: {event_type}")
    
    try:
        if event_type == 'production_order_created':
            # Handle production order creation
            return {
                'success': True,
                'message': 'Production order event processed',
                'event_type': event_type
            }
        
        elif event_type == 'qc_inspection_completed':
            # Handle QC inspection completion
            return {
                'success': True,
                'message': 'QC inspection event processed',
                'event_type': event_type
            }
        
        elif event_type == 'delivery_created':
            # Handle delivery creation
            return {
                'success': True,
                'message': 'Delivery event processed',
                'event_type': event_type
            }
        
        else:
            logger.warning(f"Unknown event type: {event_type}")
            return {
                'success': False,
                'message': f"Unknown event type: {event_type}"
            }
    
    except Exception as e:
        logger.error(f"Event handler error: {e}", exc_info=True)
        return {
            'success': False,
            'error': str(e)
        }

# Export handlers for Function Compute
__all__ = ['http_handler', 'event_handler', 'app']
