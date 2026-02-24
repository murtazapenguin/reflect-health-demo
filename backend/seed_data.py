"""
Seed script for Reflect Health demo.

Populates MongoDB with:
- 1 admin user
- 10 providers
- 25 members (mix of active/inactive/termed)
- 40 claims (mix of paid/denied/pending)
- 50 historical call records

Usage:
    cd backend
    python -m seed_data
"""

import asyncio
import os
import random
from datetime import datetime, timedelta, timezone

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.models.call_record import CallRecord
from app.models.claim import Claim
from app.models.member import Member
from app.models.provider import Provider
from app.models.user import User

MONGODB_URL = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "reflect_health")

# ---------- PROVIDERS ----------

PROVIDERS = [
    {
        "npi": "1234567890",
        "name": "Dr. Sarah Chen",
        "practice_name": "Valley Medical Group",
        "zip_code": "90210",
        "tin": "12-3456789",
        "fax_number": "310-555-0101",
        "specialty": "Internal Medicine",
        "phone": "310-555-0100",
    },
    {
        "npi": "2345678901",
        "name": "Dr. James Wilson",
        "practice_name": "Pacific Coast Family Medicine",
        "zip_code": "90245",
        "tin": "23-4567890",
        "fax_number": "310-555-0202",
        "specialty": "Family Medicine",
        "phone": "310-555-0200",
    },
    {
        "npi": "3456789012",
        "name": "Dr. Maria Rodriguez",
        "practice_name": "Sunset Cardiology Associates",
        "zip_code": "90028",
        "tin": "34-5678901",
        "fax_number": "323-555-0303",
        "specialty": "Cardiology",
        "phone": "323-555-0300",
    },
    {
        "npi": "4567890123",
        "name": "Dr. Robert Kim",
        "practice_name": "Westside Orthopedic Center",
        "zip_code": "90401",
        "tin": "45-6789012",
        "fax_number": "310-555-0404",
        "specialty": "Orthopedic Surgery",
        "phone": "310-555-0400",
    },
    {
        "npi": "5678901234",
        "name": "Dr. Lisa Thompson",
        "practice_name": "Beverly Hills Dermatology",
        "zip_code": "90212",
        "tin": "56-7890123",
        "fax_number": "310-555-0505",
        "specialty": "Dermatology",
        "phone": "310-555-0500",
    },
    {
        "npi": "6789012345",
        "name": "Dr. Michael Chang",
        "practice_name": "Harbor Pulmonary Care",
        "zip_code": "90710",
        "tin": "67-8901234",
        "fax_number": "310-555-0606",
        "specialty": "Pulmonology",
        "phone": "310-555-0600",
    },
    {
        "npi": "7890123456",
        "name": "Dr. Emily Davis",
        "practice_name": "South Bay Pediatrics",
        "zip_code": "90254",
        "tin": "78-9012345",
        "fax_number": "310-555-0707",
        "specialty": "Pediatrics",
        "phone": "310-555-0700",
    },
    {
        "npi": "8901234567",
        "name": "Dr. David Martinez",
        "practice_name": "Glendale Neurology Institute",
        "zip_code": "91201",
        "tin": "89-0123456",
        "fax_number": "818-555-0808",
        "specialty": "Neurology",
        "phone": "818-555-0800",
    },
    {
        "npi": "9012345678",
        "name": "Dr. Jennifer Park",
        "practice_name": "Pasadena Women's Health",
        "zip_code": "91101",
        "tin": "90-1234567",
        "fax_number": "626-555-0909",
        "specialty": "OB/GYN",
        "phone": "626-555-0900",
    },
    {
        "npi": "0123456789",
        "name": "Dr. William Harris",
        "practice_name": "Downtown Urgent Care",
        "zip_code": "90015",
        "tin": "01-2345678",
        "fax_number": "213-555-1010",
        "specialty": "Emergency Medicine",
        "phone": "213-555-1000",
    },
]

# ---------- PLAN BENEFITS ----------

PLAN_BENEFITS = {
    "Reflect Gold PPO": {
        "primary_care": {"covered": True, "copay": 20, "prior_auth_required": False},
        "specialist_visit": {"covered": True, "copay": 50, "prior_auth_required": False},
        "urgent_care": {"covered": True, "copay": 75, "prior_auth_required": False},
        "emergency_room": {"covered": True, "copay": 250, "prior_auth_required": False, "notes": "Waived if admitted"},
        "lab_work": {"covered": True, "copay": 0, "prior_auth_required": False, "notes": "Covered at 100% in-network"},
        "xray": {"covered": True, "copay": 25, "prior_auth_required": False},
        "mri": {"covered": True, "copay": 150, "prior_auth_required": False},
        "ct_scan": {"covered": True, "copay": 150, "prior_auth_required": False},
        "physical_therapy": {"covered": True, "copay": 40, "prior_auth_required": False, "visit_limit": "40 visits/year"},
        "mental_health": {"covered": True, "copay": 30, "prior_auth_required": False, "visit_limit": "52 visits/year"},
        "chiropractic": {"covered": True, "copay": 40, "prior_auth_required": False, "visit_limit": "24 visits/year"},
        "surgery_outpatient": {"covered": True, "coinsurance": 20, "prior_auth_required": True},
        "surgery_inpatient": {"covered": True, "coinsurance": 20, "prior_auth_required": True, "notes": "$500 facility copay"},
        "prescription_generic": {"covered": True, "copay": 10, "prior_auth_required": False},
        "prescription_brand": {"covered": True, "copay": 40, "prior_auth_required": False},
    },
    "Reflect Silver HMO": {
        "primary_care": {"covered": True, "copay": 30, "prior_auth_required": False},
        "specialist_visit": {"covered": True, "copay": 65, "prior_auth_required": True, "notes": "PCP referral required"},
        "urgent_care": {"covered": True, "copay": 100, "prior_auth_required": False},
        "emergency_room": {"covered": True, "copay": 350, "prior_auth_required": False, "notes": "Waived if admitted"},
        "lab_work": {"covered": True, "copay": 10, "prior_auth_required": False},
        "xray": {"covered": True, "copay": 40, "prior_auth_required": False},
        "mri": {"covered": True, "coinsurance": 30, "prior_auth_required": True},
        "ct_scan": {"covered": True, "coinsurance": 30, "prior_auth_required": True},
        "physical_therapy": {"covered": True, "copay": 50, "prior_auth_required": True, "visit_limit": "20 visits/year"},
        "mental_health": {"covered": True, "copay": 40, "prior_auth_required": False, "visit_limit": "30 visits/year"},
        "chiropractic": {"covered": False, "notes": "Not covered under HMO plan"},
        "surgery_outpatient": {"covered": True, "coinsurance": 30, "prior_auth_required": True},
        "surgery_inpatient": {"covered": True, "coinsurance": 30, "prior_auth_required": True, "notes": "$750 facility copay"},
        "prescription_generic": {"covered": True, "copay": 15, "prior_auth_required": False},
        "prescription_brand": {"covered": True, "copay": 60, "prior_auth_required": True},
    },
    "Reflect Platinum PPO": {
        "primary_care": {"covered": True, "copay": 10, "prior_auth_required": False},
        "specialist_visit": {"covered": True, "copay": 30, "prior_auth_required": False},
        "urgent_care": {"covered": True, "copay": 50, "prior_auth_required": False},
        "emergency_room": {"covered": True, "copay": 150, "prior_auth_required": False, "notes": "Waived if admitted"},
        "lab_work": {"covered": True, "copay": 0, "prior_auth_required": False, "notes": "Covered at 100%"},
        "xray": {"covered": True, "copay": 0, "prior_auth_required": False},
        "mri": {"covered": True, "copay": 75, "prior_auth_required": False},
        "ct_scan": {"covered": True, "copay": 75, "prior_auth_required": False},
        "physical_therapy": {"covered": True, "copay": 25, "prior_auth_required": False, "visit_limit": "60 visits/year"},
        "mental_health": {"covered": True, "copay": 20, "prior_auth_required": False, "visit_limit": "Unlimited"},
        "chiropractic": {"covered": True, "copay": 25, "prior_auth_required": False, "visit_limit": "36 visits/year"},
        "surgery_outpatient": {"covered": True, "coinsurance": 10, "prior_auth_required": True},
        "surgery_inpatient": {"covered": True, "coinsurance": 10, "prior_auth_required": True, "notes": "$250 facility copay"},
        "prescription_generic": {"covered": True, "copay": 5, "prior_auth_required": False},
        "prescription_brand": {"covered": True, "copay": 25, "prior_auth_required": False},
    },
}

# ---------- MEMBERS ----------

MEMBERS = [
    # Demo script patients
    {"member_id": "MBR-001234", "first_name": "John", "last_name": "Smith", "dob": "1982-03-04", "plan_name": "Reflect Gold PPO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 20, "copay_specialist": 50, "deductible": 1500, "deductible_met": 420, "cob_status": "primary", "out_of_pocket_max": 6000, "out_of_pocket_met": 1200},
    {"member_id": "MBR-001235", "first_name": "Mary", "last_name": "Johnson", "dob": "1975-08-15", "plan_name": "Reflect Silver HMO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 30, "copay_specialist": 65, "deductible": 2500, "deductible_met": 800, "cob_status": "primary", "out_of_pocket_max": 8000, "out_of_pocket_met": 2100},
    {"member_id": "MBR-001236", "first_name": "Robert", "last_name": "Williams", "dob": "1990-11-22", "plan_name": "Reflect Gold PPO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 20, "copay_specialist": 50, "deductible": 1500, "deductible_met": 1500, "cob_status": "secondary", "out_of_pocket_max": 6000, "out_of_pocket_met": 3400},
    {"member_id": "MBR-001237", "first_name": "Patricia", "last_name": "Brown", "dob": "1968-05-30", "plan_name": "Reflect Platinum PPO", "status": "active", "effective_date": "2024-07-01", "term_date": None, "copay_primary": 10, "copay_specialist": 30, "deductible": 750, "deductible_met": 750, "cob_status": "primary", "out_of_pocket_max": 4000, "out_of_pocket_met": 2800},
    {"member_id": "MBR-001238", "first_name": "Michael", "last_name": "Jones", "dob": "1955-01-12", "plan_name": "Reflect Gold PPO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 20, "copay_specialist": 50, "deductible": 1500, "deductible_met": 200, "cob_status": "primary", "out_of_pocket_max": 6000, "out_of_pocket_met": 450},
    # Inactive / termed members
    {"member_id": "MBR-001239", "first_name": "Linda", "last_name": "Garcia", "dob": "1980-09-08", "plan_name": "Reflect Silver HMO", "status": "termed", "effective_date": "2024-01-01", "term_date": "2025-12-31", "copay_primary": 30, "copay_specialist": 65, "deductible": 2500, "deductible_met": 2500, "cob_status": "primary", "out_of_pocket_max": 8000, "out_of_pocket_met": 5600},
    {"member_id": "MBR-001240", "first_name": "David", "last_name": "Miller", "dob": "1972-04-18", "plan_name": "Reflect Gold PPO", "status": "inactive", "effective_date": "2024-01-01", "term_date": "2025-06-30", "copay_primary": 20, "copay_specialist": 50, "deductible": 1500, "deductible_met": 900, "cob_status": "primary", "out_of_pocket_max": 6000, "out_of_pocket_met": 2200},
    # More active members
    {"member_id": "MBR-001241", "first_name": "Susan", "last_name": "Davis", "dob": "1988-12-03", "plan_name": "Reflect Platinum PPO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 10, "copay_specialist": 30, "deductible": 750, "deductible_met": 300, "cob_status": "primary", "out_of_pocket_max": 4000, "out_of_pocket_met": 800},
    {"member_id": "MBR-001242", "first_name": "Thomas", "last_name": "Anderson", "dob": "1965-07-25", "plan_name": "Reflect Gold PPO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 20, "copay_specialist": 50, "deductible": 1500, "deductible_met": 1100, "cob_status": "primary", "out_of_pocket_max": 6000, "out_of_pocket_met": 3100},
    {"member_id": "MBR-001243", "first_name": "Nancy", "last_name": "Taylor", "dob": "1993-02-14", "plan_name": "Reflect Silver HMO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 30, "copay_specialist": 65, "deductible": 2500, "deductible_met": 0, "cob_status": "primary", "out_of_pocket_max": 8000, "out_of_pocket_met": 0},
    {"member_id": "MBR-001244", "first_name": "Christopher", "last_name": "Thomas", "dob": "1978-06-19", "plan_name": "Reflect Gold PPO", "status": "active", "effective_date": "2024-07-01", "term_date": None, "copay_primary": 20, "copay_specialist": 50, "deductible": 1500, "deductible_met": 680, "cob_status": "secondary", "out_of_pocket_max": 6000, "out_of_pocket_met": 1500},
    {"member_id": "MBR-001245", "first_name": "Karen", "last_name": "Jackson", "dob": "1960-10-31", "plan_name": "Reflect Platinum PPO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 10, "copay_specialist": 30, "deductible": 750, "deductible_met": 750, "cob_status": "primary", "out_of_pocket_max": 4000, "out_of_pocket_met": 3900},
    {"member_id": "MBR-001246", "first_name": "Daniel", "last_name": "White", "dob": "1985-03-27", "plan_name": "Reflect Gold PPO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 20, "copay_specialist": 50, "deductible": 1500, "deductible_met": 450, "cob_status": "primary", "out_of_pocket_max": 6000, "out_of_pocket_met": 950},
    {"member_id": "MBR-001247", "first_name": "Jessica", "last_name": "Harris", "dob": "1995-08-09", "plan_name": "Reflect Silver HMO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 30, "copay_specialist": 65, "deductible": 2500, "deductible_met": 1200, "cob_status": "primary", "out_of_pocket_max": 8000, "out_of_pocket_met": 2800},
    {"member_id": "MBR-001248", "first_name": "Matthew", "last_name": "Martin", "dob": "1970-01-05", "plan_name": "Reflect Gold PPO", "status": "active", "effective_date": "2024-07-01", "term_date": None, "copay_primary": 20, "copay_specialist": 50, "deductible": 1500, "deductible_met": 1500, "cob_status": "primary", "out_of_pocket_max": 6000, "out_of_pocket_met": 4200},
    {"member_id": "MBR-001249", "first_name": "Sandra", "last_name": "Thompson", "dob": "1982-11-16", "plan_name": "Reflect Platinum PPO", "status": "termed", "effective_date": "2024-01-01", "term_date": "2025-09-30", "copay_primary": 10, "copay_specialist": 30, "deductible": 750, "deductible_met": 500, "cob_status": "primary", "out_of_pocket_max": 4000, "out_of_pocket_met": 1600},
    {"member_id": "MBR-001250", "first_name": "Andrew", "last_name": "Robinson", "dob": "1958-04-22", "plan_name": "Reflect Gold PPO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 20, "copay_specialist": 50, "deductible": 1500, "deductible_met": 900, "cob_status": "primary", "out_of_pocket_max": 6000, "out_of_pocket_met": 2400},
    {"member_id": "MBR-001251", "first_name": "Betty", "last_name": "Clark", "dob": "1974-09-12", "plan_name": "Reflect Silver HMO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 30, "copay_specialist": 65, "deductible": 2500, "deductible_met": 600, "cob_status": "primary", "out_of_pocket_max": 8000, "out_of_pocket_met": 1400},
    {"member_id": "MBR-001252", "first_name": "Steven", "last_name": "Lewis", "dob": "1987-06-07", "plan_name": "Reflect Gold PPO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 20, "copay_specialist": 50, "deductible": 1500, "deductible_met": 350, "cob_status": "primary", "out_of_pocket_max": 6000, "out_of_pocket_met": 700},
    {"member_id": "MBR-001253", "first_name": "Dorothy", "last_name": "Lee", "dob": "1963-12-28", "plan_name": "Reflect Platinum PPO", "status": "active", "effective_date": "2024-07-01", "term_date": None, "copay_primary": 10, "copay_specialist": 30, "deductible": 750, "deductible_met": 750, "cob_status": "primary", "out_of_pocket_max": 4000, "out_of_pocket_met": 3200},
    {"member_id": "MBR-001254", "first_name": "Anthony", "last_name": "Walker", "dob": "1991-05-14", "plan_name": "Reflect Gold PPO", "status": "inactive", "effective_date": "2024-01-01", "term_date": "2025-03-31", "copay_primary": 20, "copay_specialist": 50, "deductible": 1500, "deductible_met": 1200, "cob_status": "primary", "out_of_pocket_max": 6000, "out_of_pocket_met": 3800},
    {"member_id": "MBR-001255", "first_name": "Margaret", "last_name": "Hall", "dob": "1976-08-20", "plan_name": "Reflect Silver HMO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 30, "copay_specialist": 65, "deductible": 2500, "deductible_met": 1800, "cob_status": "primary", "out_of_pocket_max": 8000, "out_of_pocket_met": 4100},
    {"member_id": "MBR-001256", "first_name": "Richard", "last_name": "Allen", "dob": "1969-02-09", "plan_name": "Reflect Gold PPO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 20, "copay_specialist": 50, "deductible": 1500, "deductible_met": 0, "cob_status": "primary", "out_of_pocket_max": 6000, "out_of_pocket_met": 0},
    {"member_id": "MBR-001257", "first_name": "Ruth", "last_name": "Young", "dob": "1984-07-03", "plan_name": "Reflect Platinum PPO", "status": "active", "effective_date": "2025-01-01", "term_date": None, "copay_primary": 10, "copay_specialist": 30, "deductible": 750, "deductible_met": 150, "cob_status": "secondary", "out_of_pocket_max": 4000, "out_of_pocket_met": 400},
    {"member_id": "MBR-001258", "first_name": "Charles", "last_name": "King", "dob": "1953-10-17", "plan_name": "Reflect Gold PPO", "status": "active", "effective_date": "2024-07-01", "term_date": None, "copay_primary": 20, "copay_specialist": 50, "deductible": 1500, "deductible_met": 1500, "cob_status": "primary", "out_of_pocket_max": 6000, "out_of_pocket_met": 5800},
]

# ---------- CLAIMS ----------

CLAIMS = [
    # Demo script claims
    {"claim_number": "CLM-00481922", "member_id": "MBR-001234", "provider_npi": "1234567890", "date_of_service": "2025-11-15", "procedure_code": "99213", "procedure_desc": "Office visit, established patient", "status": "paid", "billed_amount": 850.00, "allowed_amount": 620.00, "paid_amount": 570.00, "patient_responsibility": 50.00, "check_number": "CHK-0018472", "process_date": "2025-12-01", "received_date": "2025-11-16", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00519833", "member_id": "MBR-001234", "provider_npi": "1234567890", "date_of_service": "2026-01-10", "procedure_code": "99215", "procedure_desc": "Office visit, high complexity", "status": "denied", "billed_amount": 1200.00, "allowed_amount": 0.00, "paid_amount": 0.00, "patient_responsibility": 0.00, "check_number": None, "process_date": "2026-01-25", "received_date": "2026-01-11", "denial_code": "CO-97", "denial_reason": "Payment adjusted — service not covered by this plan benefit", "appeal_deadline": "2026-07-24"},
    # Additional claims
    {"claim_number": "CLM-00482100", "member_id": "MBR-001235", "provider_npi": "2345678901", "date_of_service": "2025-10-20", "procedure_code": "99214", "procedure_desc": "Office visit, moderate complexity", "status": "paid", "billed_amount": 450.00, "allowed_amount": 380.00, "paid_amount": 315.00, "patient_responsibility": 65.00, "check_number": "CHK-0018501", "process_date": "2025-11-05", "received_date": "2025-10-21", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00482200", "member_id": "MBR-001236", "provider_npi": "3456789012", "date_of_service": "2025-11-01", "procedure_code": "93000", "procedure_desc": "Electrocardiogram, 12-lead", "status": "paid", "billed_amount": 320.00, "allowed_amount": 280.00, "paid_amount": 230.00, "patient_responsibility": 50.00, "check_number": "CHK-0018520", "process_date": "2025-11-18", "received_date": "2025-11-02", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00482300", "member_id": "MBR-001237", "provider_npi": "4567890123", "date_of_service": "2025-09-15", "procedure_code": "27447", "procedure_desc": "Total knee replacement", "status": "paid", "billed_amount": 45000.00, "allowed_amount": 32000.00, "paid_amount": 31700.00, "patient_responsibility": 300.00, "check_number": "CHK-0018540", "process_date": "2025-10-15", "received_date": "2025-09-16", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00482400", "member_id": "MBR-001238", "provider_npi": "1234567890", "date_of_service": "2025-12-05", "procedure_code": "99213", "procedure_desc": "Office visit, established patient", "status": "pending", "billed_amount": 380.00, "allowed_amount": 0.00, "paid_amount": 0.00, "patient_responsibility": 0.00, "check_number": None, "process_date": None, "received_date": "2025-12-06", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00482500", "member_id": "MBR-001241", "provider_npi": "5678901234", "date_of_service": "2025-11-10", "procedure_code": "11102", "procedure_desc": "Skin biopsy", "status": "paid", "billed_amount": 680.00, "allowed_amount": 520.00, "paid_amount": 490.00, "patient_responsibility": 30.00, "check_number": "CHK-0018580", "process_date": "2025-11-28", "received_date": "2025-11-11", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00482600", "member_id": "MBR-001242", "provider_npi": "6789012345", "date_of_service": "2025-10-25", "procedure_code": "94010", "procedure_desc": "Spirometry", "status": "paid", "billed_amount": 290.00, "allowed_amount": 245.00, "paid_amount": 195.00, "patient_responsibility": 50.00, "check_number": "CHK-0018600", "process_date": "2025-11-10", "received_date": "2025-10-26", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00482700", "member_id": "MBR-001243", "provider_npi": "7890123456", "date_of_service": "2025-12-01", "procedure_code": "99392", "procedure_desc": "Preventive visit, 1-4 years", "status": "paid", "billed_amount": 350.00, "allowed_amount": 350.00, "paid_amount": 350.00, "patient_responsibility": 0.00, "check_number": "CHK-0018620", "process_date": "2025-12-18", "received_date": "2025-12-02", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00482800", "member_id": "MBR-001244", "provider_npi": "8901234567", "date_of_service": "2025-11-18", "procedure_code": "95819", "procedure_desc": "Electroencephalogram (EEG)", "status": "denied", "billed_amount": 1800.00, "allowed_amount": 0.00, "paid_amount": 0.00, "patient_responsibility": 0.00, "check_number": None, "process_date": "2025-12-05", "received_date": "2025-11-19", "denial_code": "CO-4", "denial_reason": "Procedure code inconsistent with modifier or missing modifier", "appeal_deadline": "2026-06-03"},
    {"claim_number": "CLM-00482900", "member_id": "MBR-001245", "provider_npi": "9012345678", "date_of_service": "2025-10-08", "procedure_code": "76817", "procedure_desc": "Ultrasound, transvaginal", "status": "paid", "billed_amount": 420.00, "allowed_amount": 380.00, "paid_amount": 350.00, "patient_responsibility": 30.00, "check_number": "CHK-0018660", "process_date": "2025-10-25", "received_date": "2025-10-09", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00483000", "member_id": "MBR-001246", "provider_npi": "0123456789", "date_of_service": "2025-12-12", "procedure_code": "99283", "procedure_desc": "Emergency department visit, moderate", "status": "pending", "billed_amount": 2200.00, "allowed_amount": 0.00, "paid_amount": 0.00, "patient_responsibility": 0.00, "check_number": None, "process_date": None, "received_date": "2025-12-13", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00483100", "member_id": "MBR-001247", "provider_npi": "2345678901", "date_of_service": "2025-09-20", "procedure_code": "99213", "procedure_desc": "Office visit, established patient", "status": "paid", "billed_amount": 280.00, "allowed_amount": 240.00, "paid_amount": 175.00, "patient_responsibility": 65.00, "check_number": "CHK-0018700", "process_date": "2025-10-08", "received_date": "2025-09-21", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00483200", "member_id": "MBR-001248", "provider_npi": "3456789012", "date_of_service": "2025-11-05", "procedure_code": "93306", "procedure_desc": "Echocardiogram, complete", "status": "paid", "billed_amount": 1500.00, "allowed_amount": 1200.00, "paid_amount": 1150.00, "patient_responsibility": 50.00, "check_number": "CHK-0018720", "process_date": "2025-11-22", "received_date": "2025-11-06", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00483300", "member_id": "MBR-001250", "provider_npi": "1234567890", "date_of_service": "2025-10-30", "procedure_code": "99214", "procedure_desc": "Office visit, moderate complexity", "status": "paid", "billed_amount": 420.00, "allowed_amount": 360.00, "paid_amount": 310.00, "patient_responsibility": 50.00, "check_number": "CHK-0018740", "process_date": "2025-11-15", "received_date": "2025-10-31", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00483400", "member_id": "MBR-001251", "provider_npi": "4567890123", "date_of_service": "2025-12-08", "procedure_code": "20610", "procedure_desc": "Joint injection, major joint", "status": "denied", "billed_amount": 950.00, "allowed_amount": 0.00, "paid_amount": 0.00, "patient_responsibility": 0.00, "check_number": None, "process_date": "2025-12-22", "received_date": "2025-12-09", "denial_code": "CO-29", "denial_reason": "Timely filing limit has expired", "appeal_deadline": "2026-06-20"},
    {"claim_number": "CLM-00483500", "member_id": "MBR-001252", "provider_npi": "5678901234", "date_of_service": "2025-11-22", "procedure_code": "11102", "procedure_desc": "Skin biopsy", "status": "paid", "billed_amount": 580.00, "allowed_amount": 480.00, "paid_amount": 430.00, "patient_responsibility": 50.00, "check_number": "CHK-0018780", "process_date": "2025-12-10", "received_date": "2025-11-23", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00483600", "member_id": "MBR-001253", "provider_npi": "6789012345", "date_of_service": "2025-10-15", "procedure_code": "94060", "procedure_desc": "Bronchodilator response test", "status": "paid", "billed_amount": 380.00, "allowed_amount": 320.00, "paid_amount": 290.00, "patient_responsibility": 30.00, "check_number": "CHK-0018800", "process_date": "2025-11-01", "received_date": "2025-10-16", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00483700", "member_id": "MBR-001255", "provider_npi": "8901234567", "date_of_service": "2025-12-15", "procedure_code": "95816", "procedure_desc": "EEG with sleep", "status": "pending", "billed_amount": 2100.00, "allowed_amount": 0.00, "paid_amount": 0.00, "patient_responsibility": 0.00, "check_number": None, "process_date": None, "received_date": "2025-12-16", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00483800", "member_id": "MBR-001256", "provider_npi": "9012345678", "date_of_service": "2025-11-28", "procedure_code": "59400", "procedure_desc": "Routine obstetric care", "status": "paid", "billed_amount": 4500.00, "allowed_amount": 3800.00, "paid_amount": 3750.00, "patient_responsibility": 50.00, "check_number": "CHK-0018840", "process_date": "2025-12-15", "received_date": "2025-11-29", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00483900", "member_id": "MBR-001257", "provider_npi": "0123456789", "date_of_service": "2026-01-05", "procedure_code": "99284", "procedure_desc": "Emergency department visit, high", "status": "pending", "billed_amount": 3800.00, "allowed_amount": 0.00, "paid_amount": 0.00, "patient_responsibility": 0.00, "check_number": None, "process_date": None, "received_date": "2026-01-06", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00484000", "member_id": "MBR-001258", "provider_npi": "1234567890", "date_of_service": "2025-12-20", "procedure_code": "99215", "procedure_desc": "Office visit, high complexity", "status": "paid", "billed_amount": 680.00, "allowed_amount": 580.00, "paid_amount": 530.00, "patient_responsibility": 50.00, "check_number": "CHK-0018880", "process_date": "2026-01-08", "received_date": "2025-12-21", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00484100", "member_id": "MBR-001234", "provider_npi": "2345678901", "date_of_service": "2025-08-12", "procedure_code": "99213", "procedure_desc": "Office visit, established patient", "status": "paid", "billed_amount": 320.00, "allowed_amount": 280.00, "paid_amount": 260.00, "patient_responsibility": 20.00, "check_number": "CHK-0018900", "process_date": "2025-08-28", "received_date": "2025-08-13", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00484200", "member_id": "MBR-001235", "provider_npi": "3456789012", "date_of_service": "2025-07-18", "procedure_code": "93000", "procedure_desc": "Electrocardiogram, 12-lead", "status": "denied", "billed_amount": 350.00, "allowed_amount": 0.00, "paid_amount": 0.00, "patient_responsibility": 0.00, "check_number": None, "process_date": "2025-08-02", "received_date": "2025-07-19", "denial_code": "PR-1", "denial_reason": "Deductible not met", "appeal_deadline": "2026-01-29"},
    {"claim_number": "CLM-00484300", "member_id": "MBR-001236", "provider_npi": "4567890123", "date_of_service": "2026-01-15", "procedure_code": "99214", "procedure_desc": "Office visit, moderate complexity", "status": "pending", "billed_amount": 450.00, "allowed_amount": 0.00, "paid_amount": 0.00, "patient_responsibility": 0.00, "check_number": None, "process_date": None, "received_date": "2026-01-16", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00484400", "member_id": "MBR-001237", "provider_npi": "5678901234", "date_of_service": "2025-10-05", "procedure_code": "11102", "procedure_desc": "Skin biopsy", "status": "paid", "billed_amount": 620.00, "allowed_amount": 520.00, "paid_amount": 510.00, "patient_responsibility": 10.00, "check_number": "CHK-0018960", "process_date": "2025-10-22", "received_date": "2025-10-06", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00484500", "member_id": "MBR-001238", "provider_npi": "6789012345", "date_of_service": "2025-09-10", "procedure_code": "94010", "procedure_desc": "Spirometry", "status": "paid", "billed_amount": 260.00, "allowed_amount": 220.00, "paid_amount": 200.00, "patient_responsibility": 20.00, "check_number": "CHK-0018980", "process_date": "2025-09-28", "received_date": "2025-09-11", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00484600", "member_id": "MBR-001241", "provider_npi": "7890123456", "date_of_service": "2025-12-18", "procedure_code": "99213", "procedure_desc": "Office visit, established patient", "status": "paid", "billed_amount": 310.00, "allowed_amount": 280.00, "paid_amount": 250.00, "patient_responsibility": 30.00, "check_number": "CHK-0019000", "process_date": "2026-01-05", "received_date": "2025-12-19", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00484700", "member_id": "MBR-001242", "provider_npi": "8901234567", "date_of_service": "2025-11-25", "procedure_code": "95816", "procedure_desc": "EEG with sleep", "status": "denied", "billed_amount": 1950.00, "allowed_amount": 0.00, "paid_amount": 0.00, "patient_responsibility": 0.00, "check_number": None, "process_date": "2025-12-12", "received_date": "2025-11-26", "denial_code": "CO-16", "denial_reason": "Missing information — claim lacks required data", "appeal_deadline": "2026-06-10"},
    {"claim_number": "CLM-00484800", "member_id": "MBR-001243", "provider_npi": "9012345678", "date_of_service": "2026-01-20", "procedure_code": "76856", "procedure_desc": "Ultrasound, pelvic", "status": "pending", "billed_amount": 480.00, "allowed_amount": 0.00, "paid_amount": 0.00, "patient_responsibility": 0.00, "check_number": None, "process_date": None, "received_date": "2026-01-21", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00484900", "member_id": "MBR-001244", "provider_npi": "0123456789", "date_of_service": "2025-08-30", "procedure_code": "99285", "procedure_desc": "Emergency department visit, critical", "status": "paid", "billed_amount": 5200.00, "allowed_amount": 4200.00, "paid_amount": 4150.00, "patient_responsibility": 50.00, "check_number": "CHK-0019040", "process_date": "2025-09-18", "received_date": "2025-08-31", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00485000", "member_id": "MBR-001245", "provider_npi": "1234567890", "date_of_service": "2025-12-28", "procedure_code": "99214", "procedure_desc": "Office visit, moderate complexity", "status": "paid", "billed_amount": 410.00, "allowed_amount": 360.00, "paid_amount": 350.00, "patient_responsibility": 10.00, "check_number": "CHK-0019060", "process_date": "2026-01-12", "received_date": "2025-12-29", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00485100", "member_id": "MBR-001246", "provider_npi": "2345678901", "date_of_service": "2025-11-08", "procedure_code": "99213", "procedure_desc": "Office visit, established patient", "status": "paid", "billed_amount": 290.00, "allowed_amount": 250.00, "paid_amount": 200.00, "patient_responsibility": 50.00, "check_number": "CHK-0019080", "process_date": "2025-11-25", "received_date": "2025-11-09", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00485200", "member_id": "MBR-001247", "provider_npi": "3456789012", "date_of_service": "2026-02-01", "procedure_code": "93306", "procedure_desc": "Echocardiogram, complete", "status": "pending", "billed_amount": 1400.00, "allowed_amount": 0.00, "paid_amount": 0.00, "patient_responsibility": 0.00, "check_number": None, "process_date": None, "received_date": "2026-02-02", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00485300", "member_id": "MBR-001248", "provider_npi": "4567890123", "date_of_service": "2025-10-18", "procedure_code": "20610", "procedure_desc": "Joint injection, major joint", "status": "paid", "billed_amount": 820.00, "allowed_amount": 680.00, "paid_amount": 630.00, "patient_responsibility": 50.00, "check_number": "CHK-0019120", "process_date": "2025-11-05", "received_date": "2025-10-19", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00485400", "member_id": "MBR-001250", "provider_npi": "5678901234", "date_of_service": "2025-12-02", "procedure_code": "11102", "procedure_desc": "Skin biopsy", "status": "denied", "billed_amount": 720.00, "allowed_amount": 0.00, "paid_amount": 0.00, "patient_responsibility": 0.00, "check_number": None, "process_date": "2025-12-18", "received_date": "2025-12-03", "denial_code": "CO-50", "denial_reason": "Non-covered service — not a plan benefit", "appeal_deadline": "2026-06-16"},
    {"claim_number": "CLM-00485500", "member_id": "MBR-001251", "provider_npi": "6789012345", "date_of_service": "2025-09-25", "procedure_code": "94060", "procedure_desc": "Bronchodilator response test", "status": "paid", "billed_amount": 340.00, "allowed_amount": 290.00, "paid_amount": 225.00, "patient_responsibility": 65.00, "check_number": "CHK-0019160", "process_date": "2025-10-12", "received_date": "2025-09-26", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00485600", "member_id": "MBR-001252", "provider_npi": "7890123456", "date_of_service": "2026-01-25", "procedure_code": "99392", "procedure_desc": "Preventive visit, 1-4 years", "status": "pending", "billed_amount": 380.00, "allowed_amount": 0.00, "paid_amount": 0.00, "patient_responsibility": 0.00, "check_number": None, "process_date": None, "received_date": "2026-01-26", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
    {"claim_number": "CLM-00485700", "member_id": "MBR-001253", "provider_npi": "8901234567", "date_of_service": "2025-11-12", "procedure_code": "95819", "procedure_desc": "Electroencephalogram (EEG)", "status": "paid", "billed_amount": 1650.00, "allowed_amount": 1400.00, "paid_amount": 1370.00, "patient_responsibility": 30.00, "check_number": "CHK-0019200", "process_date": "2025-11-30", "received_date": "2025-11-13", "denial_code": None, "denial_reason": None, "appeal_deadline": None},
]

# ---------- HISTORICAL CALL RECORDS ----------

SAMPLE_TRANSCRIPTS = {
    "eligibility_resolved": [
        {"speaker": "AI", "text": "Thank you for calling Reflect Health provider services. I'm an AI assistant and can help with patient eligibility verification or claim status inquiries. Which one brings you in today?"},
        {"speaker": "Provider", "text": "Hi, I need to check eligibility for a patient."},
        {"speaker": "AI", "text": "I'd be happy to help with that. To verify your identity, could you please provide your 10-digit National Provider Identifier?"},
        {"speaker": "Provider", "text": "Sure, it's 1234567890."},
        {"speaker": "AI", "text": "Thank you, Dr. Chen. To complete verification, could you confirm the zip code of your primary practice location?"},
        {"speaker": "Provider", "text": "90210."},
        {"speaker": "AI", "text": "You're verified. What is the patient's first and last name, and date of birth?"},
        {"speaker": "Provider", "text": "John Smith, date of birth March 4th, 1982."},
        {"speaker": "AI", "text": "I have John Smith, March 4th 1982. Let me look that up for you... John Smith IS active on the Reflect Gold PPO plan. Coverage effective January 1st 2025. Copay: $20 primary care, $50 specialist. Deductible: $1,500 with $420 met so far. Is there anything else I can help with?"},
        {"speaker": "Provider", "text": "No, that's all I needed. Thank you."},
        {"speaker": "AI", "text": "You're welcome. Thank you for calling Reflect Health. Have a great day."},
    ],
    "claims_resolved": [
        {"speaker": "AI", "text": "Thank you for calling Reflect Health provider services. I'm an AI assistant and can help with patient eligibility verification or claim status inquiries. Which one brings you in today?"},
        {"speaker": "Provider", "text": "I need to check on a claim status."},
        {"speaker": "AI", "text": "I can help with that. To verify your identity, could you please provide your 10-digit National Provider Identifier?"},
        {"speaker": "Provider", "text": "2345678901."},
        {"speaker": "AI", "text": "Thank you, Dr. Wilson. Could you confirm the zip code of your primary practice location?"},
        {"speaker": "Provider", "text": "90245."},
        {"speaker": "AI", "text": "You're verified. What is the patient's name and date of birth?"},
        {"speaker": "Provider", "text": "Mary Johnson, born August 15, 1975."},
        {"speaker": "AI", "text": "Do you have the claim number, or should I look it up by date of service?"},
        {"speaker": "Provider", "text": "The claim number is CLM-00482100."},
        {"speaker": "AI", "text": "Claim CLM-00482100 was processed on November 5th. Billed: $450. Paid: $315. Check number CHK-0018501. Patient responsibility: $65. Is there anything else I can help with?"},
        {"speaker": "Provider", "text": "Nope, that's it. Thanks."},
        {"speaker": "AI", "text": "Thank you for calling Reflect Health. Have a great day."},
    ],
    "transferred": [
        {"speaker": "AI", "text": "Thank you for calling Reflect Health provider services. I'm an AI assistant and can help with patient eligibility verification or claim status inquiries. Which one brings you in today?"},
        {"speaker": "Provider", "text": "I need to submit a prior authorization for a patient."},
        {"speaker": "AI", "text": "I understand you need help with a prior authorization. Let me connect you with a team member who can assist with that. One moment please."},
    ],
}

PROVIDER_NAMES = [p["name"] for p in PROVIDERS]
MEMBER_NAMES = [f"{m['first_name']} {m['last_name']}" for m in MEMBERS]


def _generate_call_records(count: int):
    records = []
    now = datetime.now(timezone.utc)

    for i in range(count):
        days_ago = random.randint(1, 45)
        hour = random.randint(8, 17)
        minute = random.randint(0, 59)
        started = now - timedelta(days=days_ago, hours=random.randint(0, 5), minutes=minute)
        started = started.replace(hour=hour, minute=minute)

        roll = random.random()
        if roll < 0.45:
            intent = "eligibility"
            outcome = "resolved"
            duration = random.randint(45, 120)
            transcript = SAMPLE_TRANSCRIPTS["eligibility_resolved"]
            transferred = False
            tags = ["eligibility", "auto-resolved"]
        elif roll < 0.80:
            intent = "claims"
            outcome = "resolved"
            duration = random.randint(55, 140)
            transcript = SAMPLE_TRANSCRIPTS["claims_resolved"]
            transferred = False
            tags = ["claims", "auto-resolved"]
        elif roll < 0.92:
            intent = "other"
            outcome = "transferred"
            duration = random.randint(15, 40)
            transcript = SAMPLE_TRANSCRIPTS["transferred"]
            transferred = True
            tags = ["other", "transferred"]
        else:
            intent = random.choice(["eligibility", "claims"])
            outcome = "transferred"
            duration = random.randint(30, 80)
            transcript = SAMPLE_TRANSCRIPTS["transferred"]
            transferred = True
            tags = [intent, "transferred"]

        auth_success = not transferred or random.random() > 0.3
        provider = random.choice(PROVIDERS)
        patient = random.choice(MEMBER_NAMES) if not transferred else None

        ended = started + timedelta(seconds=duration)

        records.append({
            "call_id": f"bland_call_{1000 + i:04d}",
            "phone_from": f"+1555{random.randint(1000000, 9999999)}",
            "phone_to": "+15559876543",
            "started_at": started,
            "ended_at": ended,
            "duration_seconds": duration,
            "intent": intent,
            "outcome": outcome,
            "provider_npi": provider["npi"],
            "provider_name": provider["name"],
            "patient_name": patient,
            "patient_dob": None,
            "transcript": transcript,
            "recording_url": None,
            "tags": tags,
            "flagged": random.random() < 0.06,
            "transferred": transferred,
            "auth_success": auth_success,
            "extracted_data": {
                "npi": provider["npi"],
                "provider_name": provider["name"],
                "call_intent": intent,
            },
        })

    return records


async def seed():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[MONGODB_DB_NAME]

    await init_beanie(
        database=db,
        document_models=[User, Provider, Member, Claim, CallRecord],
    )

    # Clear existing data
    print("Clearing existing data...")
    await User.delete_all()
    await Provider.delete_all()
    await Member.delete_all()
    await Claim.delete_all()
    await CallRecord.delete_all()

    # Seed admin user
    print("Seeding admin user...")
    admin = User(
        email="admin@reflecthealth.com",
        display_name="Chris Griffith",
        hashed_password=User.hash_password("demo2026"),
        roles=["admin"],
    )
    await admin.insert()

    # Seed providers
    print(f"Seeding {len(PROVIDERS)} providers...")
    for p in PROVIDERS:
        await Provider(**p).insert()

    # Seed members
    print(f"Seeding {len(MEMBERS)} members...")
    for m in MEMBERS:
        plan_benefits = PLAN_BENEFITS.get(m["plan_name"], {})
        await Member(**m, benefits=plan_benefits).insert()

    # Seed claims
    print(f"Seeding {len(CLAIMS)} claims...")
    for c in CLAIMS:
        await Claim(**c).insert()

    # Seed call records
    call_records_data = _generate_call_records(50)
    print(f"Seeding {len(call_records_data)} call records...")
    for cr in call_records_data:
        await CallRecord(**cr).insert()

    print("\nSeed complete!")
    print(f"  Users: {await User.count()}")
    print(f"  Providers: {await Provider.count()}")
    print(f"  Members: {await Member.count()}")
    print(f"  Claims: {await Claim.count()}")
    print(f"  Call Records: {await CallRecord.count()}")
    print(f"\nDemo credentials: admin@reflecthealth.com / demo2026")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
