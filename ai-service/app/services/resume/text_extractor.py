"""Resume text extraction module supporting plain text and PDF byte streams."""

import base64
import io
import logging
from typing import Any, Dict, Optional
import pypdf

logger = logging.getLogger("ai_service.resume.extractor")


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract text from raw PDF bytes using pypdf.

    Safely handles malformed, encrypted, or damaged PDFs.
    """
    if not pdf_bytes:
        return ""

    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        if reader.is_encrypted:
            try:
                reader.decrypt("")
            except Exception:
                logger.warning("Encrypted PDF could not be decrypted with empty password")
                return ""

        text_pages = []
        for idx, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text()
                if page_text:
                    text_pages.append(page_text)
            except Exception as page_err:
                logger.warning("Failed to extract text from PDF page %d: %s", idx, type(page_err).__name__)

        return "\n\n".join(text_pages).strip()
    except Exception as exc:
        logger.warning("PDF extraction failed: %s", type(exc).__name__)
        return ""


def extract_resume_text(resume_data: Dict[str, Any]) -> str:
    """Extract text from resume payload object.

    Checks:
    1. Direct 'text' field
    2. 'fileContentBase64' (Base64-encoded PDF or text)
    3. 'content' string field
    """
    if not resume_data or not isinstance(resume_data, dict):
        return ""

    # Direct raw text
    direct_text = resume_data.get("text")
    if direct_text and isinstance(direct_text, str) and direct_text.strip():
        return direct_text.strip()

    # Base64 encoded payload
    base64_content = resume_data.get("fileContentBase64") or resume_data.get("base64")
    if base64_content and isinstance(base64_content, str):
        try:
            # Strip data URL prefix if present (e.g. data:application/pdf;base64,...)
            if "," in base64_content:
                base64_content = base64_content.split(",", 1)[1]

            decoded_bytes = base64.b64decode(base64_content.strip())
            mime_type = str(resume_data.get("mimeType") or "").lower()

            if "pdf" in mime_type or decoded_bytes.startswith(b"%PDF"):
                return extract_text_from_pdf_bytes(decoded_bytes)

            try:
                return decoded_bytes.decode("utf-8", errors="ignore").strip()
            except Exception:
                return ""
        except Exception as exc:
            logger.warning("Base64 resume decoding failed: %s", type(exc).__name__)
            return ""

    # Secondary text fields
    content = resume_data.get("content") or resume_data.get("rawText")
    if content and isinstance(content, str):
        return content.strip()

    return ""
