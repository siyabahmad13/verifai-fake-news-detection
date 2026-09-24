import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that ensures every error response
    conforms to the standard format:
    {
        "success": False,
        "message": "...",
        "errors": {...}
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        errors = response.data
        message = "A validation or client error occurred."

        # Extract cleaner message if available
        if isinstance(errors, dict):
            if "detail" in errors:
                message = str(errors.pop("detail"))
            elif "non_field_errors" in errors:
                message = "; ".join(str(e) for e in errors.get("non_field_errors", []))
        elif isinstance(errors, list):
            message = "; ".join(str(e) for e in errors)
            errors = {"detail": errors}

        response.data = {
            "success": False,
            "message": message,
            "errors": errors if errors else {}
        }
        return response

    # Unhandled 500 errors
    logger.exception(
        "Unhandled exception in API view %s",
        context.get('view'),
        exc_info=exc
    )

    error_msg = "An unexpected server error occurred."
    debug_details = str(exc) if getattr(settings, 'DEBUG', False) else "Please contact system administrator."

    return Response(
        {
            "success": False,
            "message": error_msg,
            "errors": {"server_error": debug_details}
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
