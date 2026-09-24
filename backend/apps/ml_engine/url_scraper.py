"""
VERIFAI — Safe URL Article Extractor Service
Fetches and extracts text from external URLs with SSRF protection, size caps, and timeouts.
"""

import requests
import logging
from bs4 import BeautifulSoup
from django.conf import settings
from .validators import validate_safe_url
from .exceptions import InputValidationError

logger = logging.getLogger(__name__)


def extract_article_from_url(url: str) -> dict:
    """
    Safely fetches the HTML from an external article URL and extracts
    the headline and body text.
    Protects against SSRF, infinite streams, and private IP probing.
    """
    # 1. Validate URL against SSRF and private IP ranges
    validated_url = validate_safe_url(url)

    timeout = getattr(settings, 'URL_SCRAPE_TIMEOUT_SECONDS', 5)
    max_bytes = getattr(settings, 'MAX_URL_CONTENT_BYTES', 2 * 1024 * 1024)

    headers = {
        'User-Agent': (
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
            'AppleWebKit/537.36 (KHTML, like Gecko) '
            'Chrome/120.0.0.0 Safari/537.36 VERIFAI-Research-Bot/1.0'
        ),
        'Accept': 'text/html,application/xhtml+xml',
    }

    try:
        # Stream response to enforce size limits before reading entire body
        with requests.get(
            validated_url,
            headers=headers,
            timeout=timeout,
            stream=True,
            allow_redirects=True
        ) as response:
            # Check status
            if response.status_code != 200:
                raise InputValidationError(
                    f"Target URL returned HTTP status {response.status_code} ({response.reason})."
                )

            # Check content-type
            content_type = response.headers.get('Content-Type', '').lower()
            if 'text/html' not in content_type and 'application/xhtml' not in content_type:
                raise InputValidationError(
                    f"Unsupported content type '{content_type}'. Only HTML articles can be evaluated."
                )

            # Read content with strict upper size bound
            content_chunks = []
            total_bytes = 0

            for chunk in response.iter_content(chunk_size=16384):
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise InputValidationError(
                        f"Target page size exceeds the security limit of {max_bytes // (1024*1024)}MB."
                    )
                content_chunks.append(chunk)

            html_text = b"".join(content_chunks).decode(response.encoding or 'utf-8', errors='replace')

    except requests.exceptions.Timeout:
        raise InputValidationError("Connection timed out while fetching target URL.")
    except requests.exceptions.RequestException as e:
        logger.warning("Error fetching URL %s: %s", validated_url, e)
        raise InputValidationError(f"Could not retrieve content from URL: {str(e)}")

    # 2. Parse HTML and extract headline & body
    soup = BeautifulSoup(html_text, 'html.parser')

    # Remove script, style, navigation, footer tags
    for tag in soup(['script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript', 'form']):
        tag.decompose()

    # Extract headline
    headline = ""
    title_tag = soup.find('title')
    h1_tag = soup.find('h1')

    if h1_tag and h1_tag.get_text().strip():
        headline = h1_tag.get_text().strip()
    elif title_tag and title_tag.get_text().strip():
        headline = title_tag.get_text().strip()

    # Extract article body
    paragraphs = []
    article_container = soup.find('article') or soup.find('main') or soup

    for p in article_container.find_all('p'):
        text = p.get_text().strip()
        if len(text) > 25:  # Ignore tiny snippet buttons or copyright notices
            paragraphs.append(text)

    extracted_body = "\n\n".join(paragraphs)

    if not extracted_body or len(extracted_body.split()) < 10:
        raise InputValidationError(
            "Could not extract sufficient article text from the provided URL. "
            "Please copy and paste the article text directly into the detector."
        )

    return {
        "url": validated_url,
        "headline": headline,
        "text": extracted_body,
        "word_count": len(extracted_body.split())
    }
