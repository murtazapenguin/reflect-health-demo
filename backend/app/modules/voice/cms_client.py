from typing import Dict, List, Optional

import httpx
from loguru import logger

CMS_API_URL = (
    "https://data.cms.gov/provider-data/api/1/datastore/query/mj5m-pzi6/0"
)
CMS_TIMEOUT = 12.0


def _title(s: str) -> str:
    return s.strip().title() if s else ""


def _pick_best_row(rows: List[dict]) -> dict:
    """Pick the most complete row when a provider has multiple entries."""
    def _score(r: dict) -> int:
        s = 0
        if r.get("facility_name", "").strip():
            s += 3
        if r.get("zip_code", "").strip():
            s += 2
        if r.get("telephone_number", "").strip():
            s += 1
        return s

    return max(rows, key=_score)


def _collect_zip_codes(rows: List[dict]) -> List[str]:
    """Gather all unique 5-digit zip codes across every row for this NPI."""
    zips = set()
    for r in rows:
        raw = (r.get("zip_code") or "").strip()
        if raw:
            zips.add(raw[:5])
    return sorted(zips)


def _map_to_provider(best: dict, all_zips: List[str]) -> Dict:
    """Map a CMS result row to fields compatible with our Provider model."""
    first = _title(best.get("provider_first_name", ""))
    last = _title(best.get("provider_last_name", ""))
    cred = (best.get("cred") or "").strip().upper()
    prefix = "Dr." if cred in ("MD", "DO", "DPM", "OD", "DDS", "DMD") else ""
    name = f"{prefix} {first} {last}".strip() if prefix else f"{first} {last}"

    primary_zip = (best.get("zip_code") or "")[:5]

    return {
        "name": name,
        "practice_name": _title(best.get("facility_name", "")) or f"{name} Practice",
        "zip_code": primary_zip,
        "zip_codes": all_zips,
        "specialty": _title(best.get("pri_spec", "")),
        "phone": (best.get("telephone_number") or "").strip() or None,
        "credential": cred or None,
        "city": _title(best.get("citytown", "")),
        "state": (best.get("state") or "").strip().upper() or None,
        "cms_sourced": True,
    }


async def lookup_npi_from_cms(npi: str) -> Optional[Dict]:
    """Query the CMS national provider file by NPI. Returns mapped dict or None."""
    params = {
        "conditions[0][property]": "npi",
        "conditions[0][value]": npi,
        "limit": 20,
    }
    try:
        async with httpx.AsyncClient(timeout=CMS_TIMEOUT) as client:
            resp = await client.get(CMS_API_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.warning("CMS API timeout for NPI {}", npi)
        return None
    except Exception as e:
        logger.warning("CMS API error for NPI {}: {}", npi, e)
        return None

    rows = data.get("results", [])
    if not rows:
        logger.info("CMS API: NPI {} not found", npi)
        return None

    logger.info("CMS API: NPI {} returned {} rows", npi, len(rows))
    best = _pick_best_row(rows)
    all_zips = _collect_zip_codes(rows)
    return _map_to_provider(best, all_zips)
