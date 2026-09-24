from rest_framework.response import Response
from rest_framework import status


def success_response(data=None, message="Operation successful.", status_code=status.HTTP_200_OK):
    """
    Standardized success response builder.
    """
    payload = {
        "success": True,
        "message": message,
        "data": data if data is not None else {}
    }
    return Response(payload, status=status_code)


def error_response(message="An error occurred.", errors=None, status_code=status.HTTP_400_BAD_REQUEST):
    """
    Standardized error response builder.
    """
    payload = {
        "success": False,
        "message": message,
        "errors": errors if errors is not None else {}
    }
    return Response(payload, status=status_code)
