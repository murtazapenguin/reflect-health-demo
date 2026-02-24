"""
Pre-load CMS provider data into MongoDB for faster first-call experience.

Usage:
    cd backend
    python -m scripts.preload_cms_providers --state CA --max-providers 500

Environment variables:
    MONGODB_URL       (default: mongodb://localhost:27017)
    MONGODB_DB_NAME   (default: reflect_health)
"""

import argparse
import asyncio
import os
from typing import Dict, List, Optional

import httpx
from beanie import init_beanie
from loguru import logger
from motor.motor_asyncio import AsyncIOMotorClient

from app.models.provider import Provider

CMS_API_URL = (
    "https://data.cms.gov/provider-data/api/1/datastore/query/mj5m-pzi6/0"
)
PAGE_SIZE = 500
CMS_TIMEOUT = 30.0

MONGODB_URL = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "reflect_health")


def _title(s: str) -> str:
    return s.strip().title() if s else ""


def _deduplicate(rows: List[dict]) -> Dict[str, dict]:
    """Group rows by NPI, pick the best row per NPI, collect all zips."""
    by_npi: Dict[str, List[dict]] = {}
    for r in rows:
        npi = r.get("npi", "").strip()
        if npi:
            by_npi.setdefault(npi, []).append(r)

    result = {}
    for npi, npi_rows in by_npi.items():
        def _score(r: dict) -> int:
            s = 0
            if r.get("facility_name", "").strip():
                s += 3
            if r.get("zip_code", "").strip():
                s += 2
            if r.get("telephone_number", "").strip():
                s += 1
            return s

        best = max(npi_rows, key=_score)
        all_zips = sorted({r.get("zip_code", "")[:5] for r in npi_rows if r.get("zip_code", "").strip()})

        first = _title(best.get("provider_first_name", ""))
        last = _title(best.get("provider_last_name", ""))
        cred = (best.get("cred") or "").strip().upper()
        prefix = "Dr." if cred in ("MD", "DO", "DPM", "OD", "DDS", "DMD") else ""
        name = f"{prefix} {first} {last}".strip() if prefix else f"{first} {last}"

        result[npi] = {
            "npi": npi,
            "name": name,
            "practice_name": _title(best.get("facility_name", "")) or f"{name} Practice",
            "zip_code": (best.get("zip_code") or "")[:5],
            "zip_codes": all_zips,
            "specialty": _title(best.get("pri_spec", "")),
            "phone": (best.get("telephone_number") or "").strip() or None,
            "credential": cred or None,
            "city": _title(best.get("citytown", "")),
            "state": (best.get("state") or "").strip().upper() or None,
            "cms_sourced": True,
        }

    return result


async def fetch_cms_page(
    client: httpx.AsyncClient,
    state: Optional[str],
    offset: int,
) -> List[dict]:
    params = {"limit": PAGE_SIZE, "offset": offset}
    cond_idx = 0
    if state:
        params[f"conditions[{cond_idx}][property]"] = "state"
        params[f"conditions[{cond_idx}][value]"] = state.upper()
        cond_idx += 1

    resp = await client.get(CMS_API_URL, params=params)
    resp.raise_for_status()
    data = resp.json()
    return data.get("results", [])


async def run(state: Optional[str], max_providers: int):
    mongo_client = AsyncIOMotorClient(MONGODB_URL)
    db = mongo_client[MONGODB_DB_NAME]
    await init_beanie(database=db, document_models=[Provider])

    all_rows: List[dict] = []
    offset = 0

    async with httpx.AsyncClient(timeout=CMS_TIMEOUT) as client:
        while True:
            logger.info("Fetching CMS page offset={} state={}", offset, state)
            rows = await fetch_cms_page(client, state, offset)
            if not rows:
                break
            all_rows.extend(rows)
            deduped = _deduplicate(all_rows)
            logger.info("  ... {} rows fetched, {} unique NPIs so far", len(all_rows), len(deduped))
            if len(deduped) >= max_providers:
                break
            offset += PAGE_SIZE

    deduped = _deduplicate(all_rows)
    providers = list(deduped.values())[:max_providers]
    logger.info("Upserting {} providers into MongoDB", len(providers))

    upserted = 0
    for p in providers:
        npi = p.pop("npi")
        existing = await Provider.find_one(Provider.npi == npi)
        if existing:
            if existing.cms_sourced:
                await existing.set(p)
                upserted += 1
        else:
            await Provider(npi=npi, **p).insert()
            upserted += 1

    logger.info("Done: {} providers upserted", upserted)
    mongo_client.close()


def main():
    parser = argparse.ArgumentParser(description="Pre-load CMS providers")
    parser.add_argument("--state", type=str, default=None, help="Filter by US state (e.g., CA, NY)")
    parser.add_argument("--max-providers", type=int, default=500, help="Max unique providers to load")
    args = parser.parse_args()
    asyncio.run(run(args.state, args.max_providers))


if __name__ == "__main__":
    main()
