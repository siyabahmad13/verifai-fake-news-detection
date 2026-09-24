"""
VERIFAI — Input & Security Validators
Validates input lengths, content boundaries, and safe URLs to prevent SSRF and DOS attacks.
"""

import ipaddress
import socket
from urllib.parse import urlparse
from .exceptions import InputValidationError

MIN_TEXT_WORDS = 4
MIN_TEXT_CHARS = 15
MAX_TEXT_CHARS = 50000  # ~8,000 to 10,000 words


def validate_prediction_text(text: str, field_name: str = "text") -> str:
    """
    Validate that submitted article text satisfies minimum length requirements
    and does not exceed maximum processing limits.
    """
    if not text or not isinstance(text, str):
        raise InputValidationError(f"The '{field_name}' field must be a non-empty string.")

    stripped = text.strip()
    char_len = len(stripped)

    if char_len < MIN_TEXT_CHARS:
        raise InputValidationError(
            f"The '{field_name}' content is too short ({char_len} chars). "
            f"Please submit at least {MIN_TEXT_CHARS} characters."
        )

    if char_len > MAX_TEXT_CHARS:
        raise InputValidationError(
            f"The '{field_name}' content exceeds the maximum allowed length of {MAX_TEXT_CHARS} characters."
        )

    words = stripped.split()
    if len(words) < MIN_TEXT_WORDS:
        raise InputValidationError(
            f"The '{field_name}' content must contain at least {MIN_TEXT_WORDS} words."
        )

    return stripped


def validate_safe_url(url: str) -> str:
    """
    Validate URL to protect against Server-Side Request Forgery (SSRF) and malicious schemes.
    Only publicly routable HTTP and HTTPS URLs are permitted.
    """
    if not url or not isinstance(url, str):
        raise InputValidationError("A valid URL string must be provided.")

    parsed = urlparse(url.strip())

    # 1. Scheme Check
    if parsed.scheme.lower() not in ('http', 'https'):
        raise InputValidationError("Only HTTP and HTTPS URLs are supported.")

    hostname = parsed.hostname
    if not hostname:
        raise InputValidationError("The URL does not contain a valid domain hostname.")

    # 2. Block Localhost and common internal names
    blocked_hosts = {
        'localhost', '127.0.0.1', '::1', '0.0.0.0',
        'metadata.google.internal', '169.254.169.254'
    }
    if hostname.lower() in blocked_hosts or hostname.lower().endswith('.local'):
        raise InputValidationError("Access to internal, private, or local network addresses is prohibited.")

    # 3. Resolve IP and check against private/reserved ranges
    try:
        resolved_ips = socket.getaddrinfo(hostname, None)
        for item in resolved_ips:
            ip_str = item[4][0]
            ip_obj = ipaddress.ip_address(ip_str)

            if (
                ip_obj.is_private
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_reserved
                or ip_obj.is_multicast
            ):
                raise InputValidationError("Target URL resolves to a private or restricted network address.")

    except socket.gaierror:
        raise InputValidationError("Could not resolve host. Please ensure the domain exists and is accessible.")

    return url.strip()
