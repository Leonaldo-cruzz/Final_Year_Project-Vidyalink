"""Tests for resume text extraction and normalization modules."""

import base64
import io
import pytest

from app.services.resume.text_extractor import extract_resume_text, extract_text_from_pdf_bytes
from app.services.resume.normalizer import normalize_text, extract_normalized_words
from app.services.resume.parser import parse_resume


# ---------------------------------------------------------------------------
# text_extractor tests
# ---------------------------------------------------------------------------

class TestExtractResumeText:
    def test_direct_text_field(self):
        """Direct 'text' field should be returned verbatim."""
        result = extract_resume_text({"text": "Hello World Resume"})
        assert result == "Hello World Resume"

    def test_content_fallback(self):
        """Falls back to 'content' if 'text' is absent."""
        result = extract_resume_text({"content": "Content resume text"})
        assert result == "Content resume text"

    def test_raw_text_fallback(self):
        """Falls back to 'rawText' field."""
        result = extract_resume_text({"rawText": "Raw text resume"})
        assert result == "Raw text resume"

    def test_empty_payload(self):
        """Empty dict returns empty string."""
        result = extract_resume_text({})
        assert result == ""

    def test_none_payload(self):
        """None payload returns empty string."""
        result = extract_resume_text(None)
        assert result == ""

    def test_base64_plain_text(self):
        """Base64-encoded plain text decoded correctly."""
        raw = "John Doe Software Engineer"
        encoded = base64.b64encode(raw.encode("utf-8")).decode("utf-8")
        result = extract_resume_text({"fileContentBase64": encoded, "mimeType": "text/plain"})
        assert "John Doe" in result

    def test_base64_data_url_prefix_stripped(self):
        """Data URL prefix (data:...;base64,) stripped before decoding."""
        raw = "Resume content here"
        encoded = base64.b64encode(raw.encode("utf-8")).decode("utf-8")
        data_url = f"data:text/plain;base64,{encoded}"
        result = extract_resume_text({"fileContentBase64": data_url, "mimeType": "text/plain"})
        assert "Resume content" in result

    def test_invalid_base64_returns_empty(self):
        """Invalid base64 payload returns empty string without crashing."""
        result = extract_resume_text({"fileContentBase64": "!!!not-valid-base64!!!"})
        assert result == ""

    def test_empty_string_text(self):
        """Empty text string returns empty string."""
        result = extract_resume_text({"text": "   "})
        assert result == ""


class TestExtractTextFromPdfBytes:
    def test_empty_bytes_returns_empty(self):
        """Empty bytes returns empty string."""
        result = extract_text_from_pdf_bytes(b"")
        assert result == ""

    def test_non_pdf_bytes_returns_empty(self):
        """Random non-PDF bytes returns empty string without crash."""
        result = extract_text_from_pdf_bytes(b"This is not a PDF!!!")
        assert result == ""


# ---------------------------------------------------------------------------
# normalizer tests
# ---------------------------------------------------------------------------

class TestNormalizeText:
    def test_strips_whitespace(self):
        """Leading and trailing whitespace is removed."""
        result = normalize_text("  Hello World  ")
        assert result == "Hello World"

    def test_bullet_points_normalized(self):
        """Bullet points (•, ▪, ▫) are replaced with ' - '."""
        result = normalize_text("• Python\n• JavaScript")
        assert "Python" in result
        assert "JavaScript" in result

    def test_smart_quotes_normalized(self):
        """Smart quotes replaced with standard quotes."""
        result = normalize_text("\u201cHello\u201d")
        assert '"Hello"' in result

    def test_multiple_newlines_collapsed(self):
        """Three or more consecutive newlines collapsed to maximum two."""
        result = normalize_text("Line 1\n\n\n\nLine 2")
        assert "\n\n\n" not in result
        assert "Line 1" in result
        assert "Line 2" in result

    def test_empty_string(self):
        """Empty string returns empty string."""
        result = normalize_text("")
        assert result == ""

    def test_tabs_converted_to_space(self):
        """Tab characters replaced with spaces."""
        result = normalize_text("Name:\tJohn Doe")
        assert "\t" not in result
        assert "Name:" in result


class TestExtractNormalizedWords:
    def test_returns_set_of_tokens(self):
        result = extract_normalized_words("Python JavaScript React Node")
        assert isinstance(result, set)
        assert "python" in result
        assert "javascript" in result

    def test_empty_string(self):
        result = extract_normalized_words("")
        assert result == set()

    def test_special_chars_stripped(self):
        result = extract_normalized_words("C++ Python3 Node.js")
        assert "python3" in result


# ---------------------------------------------------------------------------
# parser tests
# ---------------------------------------------------------------------------

class TestParseResume:
    def test_parse_produces_expected_keys(self):
        """parse_resume returns all required keys."""
        result = parse_resume({"text": "Software Engineer with Python and React skills."})
        assert "rawText" in result
        assert "normalizedText" in result
        assert "charCount" in result
        assert "wordCount" in result
        assert "vocabularySize" in result
        assert "hasContent" in result

    def test_has_content_true_for_valid_text(self):
        result = parse_resume({"text": "John Doe Software Engineer"})
        assert result["hasContent"] is True

    def test_has_content_false_for_empty(self):
        result = parse_resume({})
        assert result["hasContent"] is False

    def test_word_count_accurate(self):
        result = parse_resume({"text": "one two three four five"})
        assert result["wordCount"] == 5
