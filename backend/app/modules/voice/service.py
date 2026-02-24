import re
from typing import List, Optional

from loguru import logger

from app.models.claim import Claim
from app.models.member import Member
from app.models.provider import Provider
from app.modules.voice.cms_client import lookup_npi_from_cms
from app.modules.voice.schemas import (
    AuthenticateNPIResponse,
    ClaimsResponse,
    EligibilityResponse,
    VerifyZipResponse,
)

WORD_TO_DIGIT = {
    "zero": "0", "oh": "0", "o": "0",
    "one": "1", "won": "1",
    "two": "2", "to": "2", "too": "2",
    "three": "3", "tree": "3",
    "four": "4", "for": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9", "niner": "9",
}

ORDINAL_TO_NUM = {
    "first": "1", "second": "2", "third": "3", "fourth": "4", "fifth": "5",
    "sixth": "6", "seventh": "7", "eighth": "8", "ninth": "9", "tenth": "10",
    "eleventh": "11", "twelfth": "12", "thirteenth": "13", "fourteenth": "14",
    "fifteenth": "15", "sixteenth": "16", "seventeenth": "17", "eighteenth": "18",
    "nineteenth": "19", "twentieth": "20", "twenty-first": "21", "twenty-second": "22",
    "twenty-third": "23", "twenty-fourth": "24", "twenty-fifth": "25",
    "twenty-sixth": "26", "twenty-seventh": "27", "twenty-eighth": "28",
    "twenty-ninth": "29", "thirtieth": "30", "thirty-first": "31",
}

MONTH_MAP = {
    "january": "01", "february": "02", "march": "03", "april": "04",
    "may": "05", "june": "06", "july": "07", "august": "08",
    "september": "09", "october": "10", "november": "11", "december": "12",
    "jan": "01", "feb": "02", "mar": "03", "apr": "04",
    "jun": "06", "jul": "07", "aug": "08", "sep": "09",
    "oct": "10", "nov": "11", "dec": "12",
}

NICKNAME_MAP = {
    "bob": "robert", "bobby": "robert", "rob": "robert",
    "bill": "william", "billy": "william", "will": "william",
    "mike": "michael", "mikey": "michael",
    "pat": "patricia", "patty": "patricia",
    "tom": "thomas", "tommy": "thomas",
    "sue": "susan", "suzy": "susan",
    "dave": "david",
    "liz": "elizabeth", "beth": "elizabeth", "lizzy": "elizabeth",
    "jim": "james", "jimmy": "james", "jamie": "james",
    "jen": "jennifer", "jenny": "jennifer",
    "dan": "daniel", "danny": "daniel",
    "dick": "richard", "rick": "richard", "rich": "richard",
    "joe": "joseph", "joey": "joseph",
    "chris": "christopher",
    "matt": "matthew", "matty": "matthew",
    "nick": "nicholas",
    "steve": "steven", "stevie": "steven",
    "tony": "anthony",
    "chuck": "charles", "charlie": "charles",
    "larry": "lawrence",
    "terry": "terence",
    "debbie": "deborah", "deb": "deborah",
    "kathy": "katherine", "kate": "katherine", "katie": "katherine",
    "maggie": "margaret", "meg": "margaret", "peggy": "margaret",
    "nancy": "ann",
    "sandy": "sandra",
}

# STT often converts spoken letters to words: "J" -> "Jay", "K" -> "Kay", etc.
LETTER_SOUND_MAP = {
    "ay": "a", "aye": "a",
    "bee": "b",
    "cee": "c", "see": "c", "sea": "c",
    "dee": "d",
    "ee": "e",
    "eff": "f",
    "gee": "g",
    "aitch": "h",
    "eye": "i",
    "jay": "j",
    "kay": "k",
    "el": "l", "elle": "l",
    "em": "m",
    "en": "n",
    "oh": "o",
    "pee": "p",
    "que": "q", "cue": "q",
    "are": "r", "ar": "r",
    "es": "s", "ess": "s",
    "tee": "t",
    "you": "u",
    "vee": "v",
    "double you": "w",
    "ex": "x",
    "why": "y",
    "zee": "z", "zed": "z",
}

SERVICE_ALIASES = {
    "primary care": "primary_care", "pcp": "primary_care", "pcp visit": "primary_care",
    "office visit": "primary_care", "doctor visit": "primary_care", "checkup": "primary_care",
    "annual physical": "primary_care", "wellness visit": "primary_care",
    "specialist": "specialist_visit", "specialist visit": "specialist_visit",
    "referral": "specialist_visit", "consultation": "specialist_visit",
    "urgent care": "urgent_care", "walk-in": "urgent_care", "walk in": "urgent_care",
    "emergency": "emergency_room", "emergency room": "emergency_room", "er": "emergency_room",
    "er visit": "emergency_room", "e.r.": "emergency_room",
    "lab": "lab_work", "labs": "lab_work", "lab work": "lab_work", "blood work": "lab_work",
    "bloodwork": "lab_work", "blood test": "lab_work", "laboratory": "lab_work",
    "x-ray": "xray", "xray": "xray", "x ray": "xray",
    "mri": "mri", "m.r.i.": "mri", "magnetic resonance": "mri",
    "ct scan": "ct_scan", "ct": "ct_scan", "cat scan": "ct_scan", "c.t.": "ct_scan",
    "physical therapy": "physical_therapy", "pt": "physical_therapy", "physio": "physical_therapy",
    "physiotherapy": "physical_therapy", "rehab": "physical_therapy", "rehabilitation": "physical_therapy",
    "mental health": "mental_health", "counseling": "mental_health", "therapy": "mental_health",
    "behavioral health": "mental_health", "psychiatry": "mental_health", "psychologist": "mental_health",
    "therapist": "mental_health",
    "chiropractic": "chiropractic", "chiropractor": "chiropractic", "chiro": "chiropractic",
    "outpatient surgery": "surgery_outpatient", "ambulatory surgery": "surgery_outpatient",
    "day surgery": "surgery_outpatient",
    "inpatient surgery": "surgery_inpatient", "hospital surgery": "surgery_inpatient",
    "surgery": "surgery_outpatient",
    "generic prescription": "prescription_generic", "generic": "prescription_generic",
    "generic drug": "prescription_generic", "generic medication": "prescription_generic",
    "brand prescription": "prescription_brand", "brand name": "prescription_brand",
    "brand drug": "prescription_brand", "brand medication": "prescription_brand",
    "prescription": "prescription_generic", "medication": "prescription_generic",
    "rx": "prescription_generic",
}

SERVICE_DISPLAY_NAMES = {
    "primary_care": "Primary Care Visit",
    "specialist_visit": "Specialist Visit",
    "urgent_care": "Urgent Care",
    "emergency_room": "Emergency Room",
    "lab_work": "Lab Work / Blood Tests",
    "xray": "X-Ray",
    "mri": "MRI",
    "ct_scan": "CT Scan",
    "physical_therapy": "Physical Therapy",
    "mental_health": "Mental / Behavioral Health",
    "chiropractic": "Chiropractic Care",
    "surgery_outpatient": "Outpatient Surgery",
    "surgery_inpatient": "Inpatient Surgery",
    "prescription_generic": "Prescription (Generic)",
    "prescription_brand": "Prescription (Brand Name)",
}


def _normalize_service(raw: str) -> Optional[str]:
    """Map a spoken service description to a canonical service key."""
    if not raw:
        return None
    lower = raw.strip().lower()
    # Exact match first
    if lower in SERVICE_ALIASES:
        return SERVICE_ALIASES[lower]
    # Substring match -- longest alias first to avoid partial mismatches
    for alias in sorted(SERVICE_ALIASES.keys(), key=len, reverse=True):
        if alias in lower:
            return SERVICE_ALIASES[alias]
    return None


def _normalize_dob(raw: str) -> Optional[str]:
    """Parse spoken/typed DOB into YYYY-MM-DD. Returns None if unparseable."""
    if not raw:
        return None
    cleaned = raw.strip()
    logger.info("DOB normalize: raw='{}'", cleaned)

    # Already ISO: 1982-03-04
    if re.match(r"^\d{4}-\d{2}-\d{2}$", cleaned):
        return cleaned

    # US numeric: MM/DD/YYYY or MM-DD-YYYY or MM.DD.YYYY
    m = re.match(r"^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$", cleaned)
    if m:
        month, day, year = m.group(1), m.group(2), m.group(3)
        if len(year) == 2:
            year = ("19" if int(year) > 30 else "20") + year
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"

    # Spoken month format: "March 4th 1982", "mar 4, 1982", "March fourth 1982"
    lower = cleaned.lower()
    lower = re.sub(r"[,.]", " ", lower)
    lower = re.sub(r"\s+", " ", lower).strip()

    for month_name, month_num in sorted(MONTH_MAP.items(), key=lambda x: -len(x[0])):
        if month_name in lower:
            rest = lower.replace(month_name, "").strip()
            tokens = rest.split()
            day_str = None
            year_str = None
            for tok in tokens:
                tok_clean = re.sub(r"(st|nd|rd|th)$", "", tok)
                if tok_clean in ORDINAL_TO_NUM:
                    day_str = ORDINAL_TO_NUM[tok_clean]
                elif tok in ORDINAL_TO_NUM:
                    day_str = ORDINAL_TO_NUM[tok]
                elif tok_clean in WORD_TO_DIGIT:
                    if not day_str:
                        day_str = WORD_TO_DIGIT[tok_clean]
                elif tok_clean.isdigit():
                    num = int(tok_clean)
                    if num > 31:
                        year_str = tok_clean
                    elif not day_str:
                        day_str = tok_clean
                    else:
                        year_str = tok_clean

            if day_str and year_str:
                if len(year_str) == 2:
                    year_str = ("19" if int(year_str) > 30 else "20") + year_str
                return f"{year_str}-{month_num}-{day_str.zfill(2)}"
            break

    logger.warning("DOB normalize failed for: '{}'", raw)
    return None


def _fuzzy_name_query(patient_name: str) -> Optional[dict]:
    """Build a MongoDB query that handles name variations from STT."""
    if not patient_name:
        return None
    parts = patient_name.strip().split()
    if len(parts) < 2:
        return None

    first_raw = parts[0].lower().rstrip(".")
    last_raw = parts[-1].lower()

    query = {"last_name": {"$regex": f"^{re.escape(last_raw)}$", "$options": "i"}}

    # Check if STT turned a spoken letter into a word (e.g., "J" -> "Jay")
    letter_initial = LETTER_SOUND_MAP.get(first_raw)

    if len(first_raw) == 1 or letter_initial:
        # Single initial or letter-sound: prefix match on that letter
        initial = letter_initial or first_raw
        query["first_name"] = {"$regex": f"^{re.escape(initial)}", "$options": "i"}
        logger.info("Fuzzy name query (initial '{}' from '{}'): {}", initial, first_raw, query)
        return query

    first_options = [re.escape(first_raw)]

    if first_raw in NICKNAME_MAP:
        first_options.append(re.escape(NICKNAME_MAP[first_raw]))

    for nick, canonical in NICKNAME_MAP.items():
        if canonical == first_raw and re.escape(nick) not in first_options:
            first_options.append(re.escape(nick))

    pattern = "|".join(f"^{opt}$" for opt in first_options)
    query["first_name"] = {"$regex": pattern, "$options": "i"}

    logger.info("Fuzzy name query: input='{}' -> {}", patient_name, query)
    return query


async def _find_members_fuzzy(
    patient_name: Optional[str],
    patient_dob: Optional[str],
) -> List[Member]:
    """Find members with fuzzy name matching and normalized DOB, with fallback."""
    query = _fuzzy_name_query(patient_name)
    if not query:
        return []

    dob_normalized = _normalize_dob(patient_dob) if patient_dob else None

    # Try with DOB first for precise match
    if dob_normalized:
        query_with_dob = {**query, "dob": dob_normalized}
        members = await Member.find(query_with_dob).to_list()
        if members:
            logger.info("Fuzzy match with DOB found {} members", len(members))
            return members

    # Fallback: name-only match (no DOB or DOB didn't match)
    members = await Member.find(query).to_list()
    if members:
        logger.info("Fuzzy match name-only found {} members (DOB was '{}')", len(members), patient_dob)
    return members


def _normalize_digits(raw: str) -> str:
    raw = raw.strip().lower()
    if re.match(r"^\d+$", raw.replace("-", "").replace(" ", "")):
        return raw.replace("-", "").replace(" ", "")
    words = re.split(r"[\s,\-]+", raw)
    digits = []
    for w in words:
        w = w.strip().rstrip(".")
        if w.isdigit():
            digits.append(w)
        elif w in WORD_TO_DIGIT:
            digits.append(WORD_TO_DIGIT[w])
    return "".join(digits)


STT_CLAIM_PREFIX_FIXES = {
    "CLN": "CLM", "CL M": "CLM", "C LM": "CLM", "CLAM": "CLM",
    "CIM": "CLM", "CLW": "CLM", "CRM": "CLM", "KLM": "CLM",
    "CLAIM": "CLM", "CLIM": "CLM", "CLEM": "CLM", "CLN-": "CLM-",
}


def _normalize_claim_number(raw: str) -> str:
    """Normalize claim numbers from various spoken/STT formats."""
    cleaned = raw.strip().upper().replace(" ", "")
    logger.info("Claim normalize: raw='{}' cleaned='{}'", raw, cleaned)

    for wrong, right in STT_CLAIM_PREFIX_FIXES.items():
        if cleaned.startswith(wrong):
            cleaned = right + cleaned[len(wrong):]
            break

    if re.match(r"^CLM-?\d+$", cleaned):
        if "-" not in cleaned:
            cleaned = cleaned[:3] + "-" + cleaned[3:]
        return cleaned

    digits = re.sub(r"[^0-9]", "", cleaned)
    if digits:
        return f"CLM-{digits.zfill(8)}"
    return cleaned


async def authenticate_npi(npi: Optional[str] = None) -> AuthenticateNPIResponse:
    if not npi:
        logger.info("NPI is null/empty")
        return AuthenticateNPIResponse(valid=False)
    npi_clean = _normalize_digits(npi)
    logger.info("NPI raw='{}' normalized='{}'", npi, npi_clean)
    if not npi_clean:
        return AuthenticateNPIResponse(valid=False)

    provider = await Provider.find_one(Provider.npi == npi_clean)

    if provider is None:
        logger.info("NPI {} not in local DB, querying CMS API...", npi_clean)
        cms_data = await lookup_npi_from_cms(npi_clean)
        if cms_data:
            provider = Provider(npi=npi_clean, **cms_data)
            await provider.insert()
            logger.info("Cached CMS provider: {} ({})", provider.name, npi_clean)
        else:
            logger.info("NPI {} not found in CMS either", npi_clean)
            return AuthenticateNPIResponse(valid=False)

    return AuthenticateNPIResponse(
        valid=True,
        provider_name=provider.name,
        practice_name=provider.practice_name,
        fax_number=provider.fax_number,
    )


async def verify_zip(npi: Optional[str] = None, zip_code: Optional[str] = None) -> VerifyZipResponse:
    if not npi or not zip_code:
        logger.info("Zip verify missing data: npi='{}' zip='{}'", npi, zip_code)
        return VerifyZipResponse(verified=False)
    npi_clean = _normalize_digits(npi)
    zip_clean = _normalize_digits(zip_code)[:5]
    logger.info("Zip verify raw npi='{}' zip='{}' normalized npi='{}' zip='{}'", npi, zip_code, npi_clean, zip_clean)
    if not npi_clean or not zip_clean:
        return VerifyZipResponse(verified=False)
    provider = await Provider.find_one(Provider.npi == npi_clean)
    if provider is None:
        return VerifyZipResponse(verified=False)

    known_zips = set()
    known_zips.add(provider.zip_code)
    if provider.zip_codes:
        known_zips.update(provider.zip_codes)

    if zip_clean in known_zips:
        return VerifyZipResponse(verified=True, provider_name=provider.name)

    logger.info("Zip {} not in known zips {} for NPI {}", zip_clean, known_zips, npi_clean)
    return VerifyZipResponse(verified=False)


async def lookup_eligibility(
    npi: Optional[str] = None,
    patient_name: Optional[str] = None,
    patient_dob: Optional[str] = None,
    member_id: Optional[str] = None,
    service_type: Optional[str] = None,
) -> EligibilityResponse:
    if not patient_name and not member_id:
        logger.info("Eligibility lookup missing patient_name and member_id")
        return EligibilityResponse(
            found=False,
            message="Missing patient name and member ID. Please provide at least one.",
        )
    if member_id:
        member = await Member.find_one(Member.member_id == member_id.strip().upper())
        if member:
            return _member_to_eligibility(member, service_type)
        return EligibilityResponse(
            found=False,
            message=f"No member found with ID {member_id}.",
        )

    members = await _find_members_fuzzy(patient_name, patient_dob)

    if len(members) == 0:
        logger.info("Eligibility lookup failed: {} / {}", patient_name, patient_dob)
        return EligibilityResponse(
            found=False,
            message=f"No patient found matching name '{patient_name}'"
            + (f" and DOB '{patient_dob}'" if patient_dob else "")
            + ". Please verify spelling and try again.",
        )

    if len(members) == 1:
        return _member_to_eligibility(members[0], service_type)

    logger.warning("Multiple member matches for {} / {}: {}", patient_name, patient_dob, len(members))
    return _member_to_eligibility(members[0], service_type)


def _member_to_eligibility(
    member: Member, service_type: Optional[str] = None
) -> EligibilityResponse:
    resp = EligibilityResponse(
        found=True,
        status=member.status,
        member_id=member.member_id,
        patient_name=f"{member.first_name} {member.last_name}",
        plan_name=member.plan_name,
        effective_date=member.effective_date,
        term_date=member.term_date,
        copay_primary=member.copay_primary,
        copay_specialist=member.copay_specialist,
        deductible=member.deductible,
        deductible_met=member.deductible_met,
        cob_status=member.cob_status,
        out_of_pocket_max=member.out_of_pocket_max,
        out_of_pocket_met=member.out_of_pocket_met,
    )

    if service_type:
        svc_key = _normalize_service(service_type)
        logger.info("Service lookup: raw='{}' normalized='{}'", service_type, svc_key)
        if svc_key and member.benefits:
            benefit = member.benefits.get(svc_key)
            if benefit:
                resp.service_type = SERVICE_DISPLAY_NAMES.get(svc_key, svc_key)
                resp.service_covered = benefit.covered
                resp.service_copay = benefit.copay
                resp.service_coinsurance = benefit.coinsurance
                resp.service_prior_auth = benefit.prior_auth_required
                resp.service_visit_limit = benefit.visit_limit
                resp.service_notes = benefit.notes
            else:
                resp.service_type = service_type
                resp.service_covered = None
                resp.message = f"Service '{service_type}' is not a recognized benefit category for this plan."
        elif svc_key and not member.benefits:
            resp.service_type = service_type
            resp.message = "Benefit details are not available for this member's plan."
        else:
            resp.service_type = service_type
            resp.service_covered = None
            resp.message = f"Could not identify the service '{service_type}'. Please try a more specific term."

    return resp


async def lookup_claims(
    npi: str,
    claim_number: Optional[str] = None,
    patient_name: Optional[str] = None,
    patient_dob: Optional[str] = None,
    date_of_service: Optional[str] = None,
) -> ClaimsResponse:
    if claim_number:
        claim_clean = _normalize_claim_number(claim_number)
        logger.info("Claim lookup raw='{}' normalized='{}'", claim_number, claim_clean)
        claim = await Claim.find_one(Claim.claim_number == claim_clean)
        if claim:
            return _claim_to_response(claim)
        digits_only = re.sub(r"[^0-9]", "", claim_clean)
        if digits_only:
            claim = await Claim.find_one(
                {"claim_number": {"$regex": digits_only, "$options": "i"}}
            )
            if claim:
                return _claim_to_response(claim)

        return ClaimsResponse(
            found=False,
            message=f"No claim found with number '{claim_number}' (searched as '{claim_clean}'). "
            "Please verify the claim number and try again.",
        )

    if patient_name:
        logger.info("Claims patient lookup: name='{}' dob='{}'", patient_name, patient_dob)
        members = await _find_members_fuzzy(patient_name, patient_dob)
        logger.info("Claims member search found {} members: {}", len(members), [m.member_id for m in members])
        if not members:
            return ClaimsResponse(
                found=False,
                message=f"No patient found matching name '{patient_name}'"
                + (f" and DOB '{patient_dob}'" if patient_dob else "")
                + ". Please verify the patient information.",
            )
        member_ids = [m.member_id for m in members]
        claim_query = {"member_id": {"$in": member_ids}}
        if date_of_service:
            dos_normalized = _normalize_dob(date_of_service)
            claim_query["date_of_service"] = dos_normalized or date_of_service.strip()

        claims = await Claim.find(claim_query).sort("-date_of_service").to_list()
        if claims:
            return _claim_to_response(claims[0])

        matched_name = f"{members[0].first_name} {members[0].last_name}"
        return ClaimsResponse(
            found=False,
            message=f"Patient '{matched_name}' found, but no claims on file"
            + (f" for date of service '{date_of_service}'" if date_of_service else "")
            + ".",
        )

    logger.info("Claims lookup failed: claim={} name={} dos={}", claim_number, patient_name, date_of_service)
    return ClaimsResponse(
        found=False,
        message="No claim number or patient name provided. Please provide at least one.",
    )


def _claim_to_response(claim: Claim) -> ClaimsResponse:
    return ClaimsResponse(
        found=True,
        claim_number=claim.claim_number,
        status=claim.status,
        date_of_service=claim.date_of_service,
        procedure_code=claim.procedure_code,
        procedure_desc=claim.procedure_desc,
        billed_amount=claim.billed_amount,
        allowed_amount=claim.allowed_amount,
        paid_amount=claim.paid_amount,
        patient_responsibility=claim.patient_responsibility,
        check_number=claim.check_number,
        process_date=claim.process_date,
        received_date=claim.received_date,
        denial_code=claim.denial_code,
        denial_reason=claim.denial_reason,
        appeal_deadline=claim.appeal_deadline,
    )
