"""PHI/PII redaction for logs and stored transcripts."""

import re
from typing import Any, Dict, List

# SSN: 123-45-6789 -> ***-**-6789
_SSN_FULL = re.compile(r"\b(\d{3})-(\d{2})-(\d{4})\b")
# SSN last 4 standalone: redact only if preceded by known label
_SSN_LAST4 = re.compile(r'(?<=["\s:])(\d{4})(?=["\s,}])')

# DOB: MM/DD/YYYY or MM-DD-YYYY -> **/**/YYYY
_DOB = re.compile(r"\b(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})\b")

# NPI: 10-digit number -> ******XXXX
_NPI = re.compile(r"\b(\d{6})(\d{4})\b")

# Member ID: MBR-XXXXXX -> MBR-***XXX (keep last 3)
_MEMBER_ID = re.compile(r"\b(MBR-)\d{3}(\d{3})\b", re.IGNORECASE)

# Known PHI field labels in JSON-style log output
_LABELED_FIELDS = re.compile(
    r"""(['"](?:patient_name|first_name|last_name|address|ssn_last4)['"])\s*:\s*(['"][^'"]+['"])""",
    re.IGNORECASE,
)


def redact_phi(text: str) -> str:
    """Mask PHI patterns in a string. Biased toward false positives (safer)."""
    text = _SSN_FULL.sub(r"***-**-\3", text)
    text = _DOB.sub(r"**/**/\3", text)
    text = _NPI.sub(r"******\2", text)
    text = _MEMBER_ID.sub(r"\g<1>***\2", text)
    text = _LABELED_FIELDS.sub(r"\1: '[REDACTED]'", text)
    return text


def redact_transcript(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Return a copy of transcript entries with PHI redacted from text fields."""
    redacted = []
    for entry in entries:
        copy = dict(entry)
        if "text" in copy and isinstance(copy["text"], str):
            copy["text"] = redact_phi(copy["text"])
        redacted.append(copy)
    return redacted
