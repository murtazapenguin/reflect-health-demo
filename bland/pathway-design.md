# Bland AI Conversational Pathway Design

## Overview

This document defines the complete conversational pathway for the Reflect Health Voice AI agent.
Build this pathway in the Bland AI developer portal at https://app.bland.ai/dashboard?page=convo-pathways

## Global Prompt (Apply to All Nodes)

```
You are a professional AI assistant for Reflect Health provider services. You handle calls from healthcare providers who need to check patient eligibility, claim status, or benefits information. You also handle calls from plan members checking their own coverage.

Rules:
- Be concise, professional, and helpful
- Speak clearly and at a moderate pace
- Use natural language, not robotic phrasing
- Never disclose which authentication field failed
- If you don't understand something, ask for clarification once, then offer to transfer
- Always confirm data back to the caller before looking it up
- Pronounce dollar amounts naturally (e.g., "five hundred seventy dollars")
- Pronounce dates naturally (e.g., "January first, twenty twenty-five")
- For NPI numbers, read digits in groups of 3-3-4 (e.g., "one two three, four five six, seven eight nine zero")
- If a caller asks about prior authorization status or requests a new prior authorization, do not attempt to look it up — immediately offer to transfer them to the prior authorization team
```

## Voice Configuration

- Voice: "Paige" (or another natural US English female voice)
- Language: English
- Model: base (supports transfers and all features)

---

## Node Definitions

### START NODE: Greeting
- **Type**: Default Node
- **Prompt**: "Thank you for calling Reflect Health provider services. I'm an AI assistant and can help with patient eligibility verification, claim status, or benefits questions. Are you calling as a healthcare provider, or are you a plan member?"
- **Extract Variables**:
  - `call_intent` (string): Description: "The caller's intent. Extract 'eligibility' if they mention eligibility, coverage, benefits, or if a patient has insurance. Extract 'claims' if they mention claim, payment, denial, or check status. Extract 'other' for anything else."
  - `caller_type` (string): Description: "Who is calling. Extract 'provider' if they identify as a doctor, office, billing staff, or healthcare provider. Extract 'member' if they identify as a patient or plan member. Extract 'unknown' if unclear."
- **Pathways**:
  - "Caller is a provider AND wants eligibility/coverage/claims/benefits" → NPI Authentication
  - "Caller is a member" → Member Authentication
  - "Caller mentions prior authorization" → Transfer to Prior Auth Team
  - "Caller wants something else (billing dispute, general question, etc.)" → Transfer to Human
  - "Intent is unclear after two attempts" → Transfer to Human

---

### NODE: NPI Authentication
- **Type**: Wait for Response
- **Prompt**: "To verify your identity, could you please provide your 10-digit National Provider Identifier?"
- **Extract Variables**:
  - `npi` (string): Description: "The 10-digit NPI number. Should be exactly 10 digits. Remove any spaces or dashes."
- **Condition**: "You must get a 10-digit number before proceeding."
- **Webhook**: Call `AuthenticateProvider` tool after extracting NPI
- **Pathways**:
  - "NPI is valid (webhook returned valid=true)" → Zip Code Verification
  - "NPI is invalid or not found" → NPI Retry

---

### NODE: NPI Retry
- **Type**: Wait for Response
- **Prompt**: "That didn't come through right. Could you give me the 10-digit NPI one more time?"
- **Extract Variables**:
  - `npi` (string): Description: "The NPI number provided on retry. Must be exactly 10 digits."
- **Webhook**: Call `AuthenticateProvider` tool
- **Pathways**:
  - "NPI is valid (webhook returned valid=true)" → Zip Code Verification
  - "NPI is still invalid or not found" → Authentication Failure

---

### NODE: Zip Code Verification
- **Type**: Wait for Response
- **Prompt**: "Thank you, {{provider_name}}. To complete verification, could you confirm the zip code of your primary practice location?"
- **Extract Variables**:
  - `zip_code` (string): Description: "The 5-digit zip code of the provider's practice"
- **Webhook**: Call `VerifyZipCode` tool with npi and zip_code
- **Pathways**:
  - "Zip code verified" → PHI Verification
  - "Zip code mismatch" → Zip Retry

---

### NODE: Zip Retry
- **Type**: Wait for Response
- **Prompt**: "Hmm, that zip code didn't match what we have on file. Could you try again?"
- **Extract Variables**:
  - `zip_code` (string): Description: "The 5-digit zip code on retry"
- **Webhook**: Call `VerifyZipCode` tool
- **Pathways**:
  - "Zip code verified" → PHI Verification
  - "Zip code still doesn't match" → Authentication Failure

---

### NODE: PHI Verification
- **Type**: Wait for Response
- **Prompt**: "Almost done. I'll need to verify the patient. Please provide the patient's full name, date of birth, and Member ID."
- **Extract Variables**:
  - `patient_name` (string): Description: "The patient's full name (first and last)"
  - `patient_dob` (string): Description: "The patient's date of birth in YYYY-MM-DD format. Convert spoken dates like 'March 4th 1982' to '1982-03-04'"
  - `member_id` (string): Description: "The member ID, typically in format MBR-XXXXXX. May also be stated as just digits."
- **Condition**: "You must collect patient name and date of birth. Member ID is strongly preferred — if the caller doesn't have it, ask for SSN or address as a fallback."
- **Rules**:
  - If caller provides name + DOB + member_id → route to PHI Verified
  - If caller provides name + DOB but NO member_id → collect fallback (SSN or address)
  - If caller cannot provide name + DOB → Authentication Failure
- **Pathways**:
  - "Got name + DOB + member_id" → PHI Verified
  - "Got name + DOB but no member_id" → PHI Fallback
  - "Cannot provide sufficient info" → Authentication Failure

---

### NODE: PHI Fallback
- **Type**: Wait for Response
- **Prompt**: "No problem. If you don't have the Member ID, I can accept the patient's Social Security Number or their address on file instead."
- **Extract Variables**:
  - `patient_ssn` (string): Description: "The patient's Social Security Number (last 4 digits or full SSN)"
  - `patient_address` (string): Description: "The patient's home address"
- **Rules**:
  - If either SSN or address is provided → route to PHI Verified (use name + DOB as primary lookup, SSN/address noted)
  - If caller cannot provide either → Authentication Failure
- **Pathways**:
  - "Got SSN or address" → PHI Verified
  - "Cannot provide fallback" → Authentication Failure

---

### NODE: PHI Verified
- **Type**: Default Node
- **Prompt**: "Got it. Let me pull that up for you."
- **Pathways**:
  - "call_intent is eligibility or benefits" → Eligibility: Lookup
  - "call_intent is claims" → Claims: Get Claim Number
  - "call_intent is unclear" → Intent Clarification

---

### NODE: Intent Clarification
- **Type**: Wait for Response
- **Prompt**: "What can I help you with today? I can check eligibility and coverage, or look up a claim status."
- **Extract Variables**:
  - `call_intent` (string): Description: "Extract 'eligibility' for coverage/benefits questions, 'claims' for claim status questions."
- **Pathways**:
  - "call_intent is eligibility" → Eligibility: Lookup
  - "call_intent is claims" → Claims: Get Claim Number
  - "Unclear after two attempts" → Transfer to Human

---

### NODE: Authentication Failure
- **Type**: Wait for Response
- **Prompt**: "I'm having trouble verifying your information, and I don't want to hold you up. I can connect you with a team member who can sort this out and get you where you need to go. Would you like me to transfer you now, or would you like to try one more time?"
- **Extract Variables**:
  - `npi` (string): Description: "A new NPI number if the caller wants to retry"
  - `zip_code` (string): Description: "A new zip code if the caller wants to retry"
- **Rules**:
  - If the caller wants to try again with a new NPI, call `AuthenticateProvider` webhook. If valid, route to Zip Code Verification.
  - If the caller wants to try again with a new zip code, call `VerifyZipCode` webhook. If valid, route to PHI Verification.
  - If the caller wants to be transferred, or if this is the third overall failure, transfer immediately.
  - Do not cycle back to this node more than once — if the caller already visited Authentication Failure and still can't verify, go straight to Transfer to Human.
- **Pathways**:
  - "Caller retries NPI and it's valid" → Zip Code Verification
  - "Caller retries zip code and it's valid" → PHI Verification
  - "Caller wants to be transferred" → Transfer to Human
  - "Third failure or caller gives up" → Transfer to Human

---

### NODE: Member Authentication
- **Type**: Wait for Response
- **Prompt**: "I can help you with that. Please provide your Member ID to verify your identity. Your Member ID usually starts with MBR followed by some digits."
- **Extract Variables**:
  - `member_id` (string): Description: "The member's Member ID, typically in format MBR-XXXXXX."
  - `caller_type` (string): Description: "Set to 'member' since the caller identified as a plan member."
- **Condition**: "You must get a Member ID before proceeding."
- **Webhook**: Call `LookupEligibility` tool with member_id only (no patient_name or npi)
- **Pathways**:
  - "Member found (found=true and status is active)" → Member: Eligibility Result
  - "Member found but status is inactive or termed" → Eligibility: Inactive
  - "Member not found" → Member Auth Failure

---

### NODE: Member Auth Failure
- **Type**: Wait for Response
- **Prompt**: "I wasn't able to locate that Member ID. Could you double-check the number and try again? Or I can transfer you to a team member."
- **Extract Variables**:
  - `member_id` (string): Description: "A corrected Member ID"
- **Pathways**:
  - "Caller provides corrected member_id" → Member Authentication
  - "Caller wants transfer" → Transfer to Human

---

### NODE: Member: Eligibility Result
- **Type**: Default Node
- **Prompt**: "I found your account. You're on the {{plan_name}} plan, currently {{status}}. Your coverage effective date is {{effective_date}}. Primary care copay: ${{copay_primary}}. Specialist copay: ${{copay_specialist}}. Deductible: ${{deductible}} with ${{deductible_met}} met so far. Is there anything specific you'd like to check?"
- **Rules**:
  - Only read fields that have values.
  - If the member asks about a specific service, proceed to Eligibility: Collect Service.
- **Pathways**:
  - "Member wants to check a specific service" → Eligibility: Collect Service
  - "Member is done" → End Call
  - "Member wants more help" → Transfer to Human

---

### NODE: Eligibility: Lookup
- **Type**: Default Node
- **Prompt**: "Let me look that up for you."
- **Webhook**: Call `LookupEligibility` tool with npi, patient_name, patient_dob, member_id, service_type (if available)
- **Pathways**:
  - "Patient found, status is 'active', and service_covered is true" → Eligibility: Service Covered
  - "Patient found, status is 'active', and service_covered is false" → Eligibility: Service Not Covered
  - "Patient found, status is 'active', but service_covered is null (no service requested or unrecognized)" → Eligibility: Active
  - "Patient found and status is 'inactive' or 'termed'" → Eligibility: Inactive
  - "Patient not found" → Eligibility: Not Found

---

### NODE: Eligibility: Collect Service
- **Type**: Wait for Response
- **Prompt**: "What service or procedure are you checking coverage for? For example, an MRI, physical therapy, specialist visit, or lab work."
- **Extract Variables**:
  - `service_type` (string): Description: "The medical service or procedure. Examples: MRI, physical therapy, lab work, specialist visit, surgery, chiropractic, mental health, CT scan, x-ray, urgent care, emergency room, prescription."
- **Condition**: "You must get a service type before proceeding."
- **Webhook**: Call `LookupEligibility` tool with npi, patient_name, patient_dob, member_id, service_type
- **Pathways**:
  - "service_covered is true" → Eligibility: Service Covered
  - "service_covered is false" → Eligibility: Service Not Covered
  - "service_covered is null" → Eligibility: Active

---

### NODE: Eligibility: Service Covered
- **Type**: Default Node
- **Prompt**: "{{patient_name}} IS active on the {{plan_name}} plan. {{service_type}} IS covered. Copay: ${{service_copay}}. Coinsurance: {{service_coinsurance}}%. Prior authorization required: {{service_prior_auth}}. Visit limit: {{service_visit_limit}}. {{service_notes}}. Deductible: ${{deductible}} with ${{deductible_met}} met so far. Is there anything else I can help you with?"
- **Rules**:
  - Only read out fields that have values. If copay is null, skip it. If coinsurance is null, skip it. Same for visit_limit and notes.
  - Pronounce dollar amounts naturally.
  - For prior_auth, say "Prior authorization IS required" or "No prior authorization needed."
- **Pathways**:
  - "Caller wants to check another service for the same patient" → Eligibility: Collect Service
  - "Caller wants to check another patient" → PHI Verification
  - "Caller is done" → End Call
  - "Caller wants to check a claim" → Claims: Get Claim Number

---

### NODE: Eligibility: Service Not Covered
- **Type**: Default Node
- **Prompt**: "{{patient_name}} IS active on the {{plan_name}} plan, however {{service_type}} is NOT covered under this plan. {{service_notes}}. Would you like me to check a different service, or transfer you to a team member for more details?"
- **Pathways**:
  - "Caller wants to check a different service" → Eligibility: Collect Service
  - "Caller wants transfer" → Transfer to Human
  - "Caller is done" → End Call

---

### NODE: Eligibility: Active
- **Type**: Default Node
- **Prompt**: "{{patient_name}} IS active on the {{plan_name}} plan. Coverage effective {{effective_date}}. Copay: ${{copay_primary}} primary care, ${{copay_specialist}} specialist. Deductible: ${{deductible}} with ${{deductible_met}} met so far. Coordination of benefits status: {{cob_status}}. Is there anything else I can help you with?"
- **Pathways**:
  - "Caller wants to check a specific service" → Eligibility: Collect Service
  - "Caller wants to check another patient" → PHI Verification
  - "Caller is done" → End Call
  - "Caller wants to check a claim" → Claims: Get Claim Number

---

### NODE: Eligibility: Inactive
- **Type**: Default Node
- **Prompt**: "{{patient_name}}'s coverage was terminated on {{term_date}}. The plan was {{plan_name}}. Would you like me to transfer you to a specialist who can assist with reinstatement or billing questions?"
- **Pathways**:
  - "Caller wants transfer" → Transfer to Human
  - "Caller is done" → End Call
  - "Caller wants to check another patient" → PHI Verification

---

### NODE: Eligibility: Not Found
- **Type**: Wait for Response
- **Prompt**: "I wasn't able to find that patient. Please double-check the name, date of birth, and Member ID and try again, or I can transfer you to a team member."
- **Pathways**:
  - "Caller wants to retry with corrected info" → PHI Verification
  - "Caller wants transfer" → Transfer to Human

---

### NODE: Claims: Get Claim Number
- **Type**: Wait for Response
- **Prompt**: "I can look up a claim for you. Do you have the claim number? It usually starts with CLM followed by a dash and some digits. If you don't have it, I can search by date of service and total billed amount."
- **Extract Variables**:
  - `claim_number` (string): Description: "The claim number, typically in format CLM-XXXXXXXX. Could also be spoken as just digits."
  - `date_of_service` (string): Description: "The date of service in YYYY-MM-DD format, only if no claim number is provided."
  - `billed_amount` (string): Description: "The total billed amount in dollars, only if no claim number is provided. Example: '850' or '850 dollars'."
- **Condition**: "You must get either a claim number OR a date of service before calling the webhook."
- **Post-extraction speech**: "One moment while I look that up."

> **IMPORTANT**: This is the ONLY claims node that calls the LookupClaim webhook.

- **Webhook**: Call `LookupClaim` tool with npi, claim_number, patient_name, patient_dob, member_id, date_of_service, billed_amount
- **Pathways**:
  - "Claim found and status is 'paid'" → Claims: Paid
  - "Claim found and status is 'denied'" → Claims: Denied
  - "Claim found and status is 'pending'" → Claims: Pending
  - "Webhook returned found=false AND message contains 'No patient found'" → Claims: Patient Not Found
  - "Webhook returned found=false AND message contains 'no claims on file'" → Claims: No Claims
  - "Webhook returned found=false AND message contains claim number" → Claims: Claim Not Found

---

### NODE: Claims: Paid
- **Type**: Default Node
- **Prompt**: "Claim {{claim_number}} was processed on {{process_date}}. Billed: ${{billed_amount}}. Paid: ${{paid_amount}}. Check number: {{check_number}}. Patient responsibility: ${{patient_responsibility}}. Is there anything else I can help you with?"
- **Pathways**:
  - "Caller wants another claim" → Claims: Get Claim Number
  - "Caller wants eligibility" → PHI Verification
  - "Caller is done" → End Call

---

### NODE: Claims: Denied
- **Type**: Default Node
- **Prompt**: "Claim {{claim_number}} was denied on {{process_date}}. Reason: {{denial_code}} — {{denial_reason}}. You have until {{appeal_deadline}} to file an appeal. Would you like me to transfer you to the appeals team?"
- **Pathways**:
  - "Caller wants transfer to appeals" → Transfer to Human
  - "Caller wants another claim" → Claims: Get Claim Number
  - "Caller is done" → End Call

---

### NODE: Claims: Pending
- **Type**: Default Node
- **Prompt**: "Claim {{claim_number}} is still being processed. It was received on {{received_date}}. Expected processing window is 30 days from receipt. Would you like me to send a fax confirmation of the current status?"
- **Pathways**:
  - "Caller wants fax or another claim" → Claims: Get Claim Number
  - "Caller is done" → End Call

---

### NODE: Claims: Patient Not Found
- **Type**: Wait for Response
- **Prompt**: "I wasn't able to find a patient matching that information. Would you like to re-verify the patient details, or I can transfer you to a team member."
- **Pathways**:
  - "Caller wants to retry" → PHI Verification
  - "Caller wants transfer" → Transfer to Human

---

### NODE: Claims: No Claims
- **Type**: Wait for Response
- **Prompt**: "I found the patient, but there are no claims on file matching that information. Would you like to try a different claim number, date of service, or billed amount? Or I can transfer you to someone who can dig into this further."
- **Pathways**:
  - "Caller wants to try again" → Claims: Get Claim Number
  - "Caller wants transfer" → Transfer to Human

---

### NODE: Claims: Claim Not Found
- **Type**: Wait for Response
- **Prompt**: "I wasn't able to find a claim matching that information. Would you like to try a different claim number, or search by date of service and billed amount instead? I can also transfer you to a team member who can help."
- **Pathways**:
  - "Caller provides new info" → Claims: Get Claim Number
  - "Caller wants transfer" → Transfer to Human

---

### NODE: Transfer to Prior Auth Team
- **Type**: Transfer Call
- **Transfer Number**: 1-555-000-0150
- **Prompt**: "Prior authorization requests and status checks are handled by our dedicated team. Let me connect you now. One moment please."

---

### NODE: Transfer to Human
- **Type**: Transfer Call
- **Transfer Number**: [Configure with team member's phone number for demo]
- **Prompt**: "Let me connect you with a team member who can assist. One moment please."

---

### NODE: End Call
- **Type**: End Call
- **Prompt**: "Thank you for calling Reflect Health provider services. Have a great day."

---

### GLOBAL NODE: FAQ / Off-Topic
- **Global Label**: "Caller asks a question unrelated to the current flow, such as business hours, fax number, or general questions"
- **Type**: Knowledge Base
- **Knowledge Base**:
  ```
  Reflect Health Provider Services
  - Business hours: Monday-Friday, 8:00 AM - 6:00 PM Eastern Time
  - Fax number for claims: 1-800-555-0199
  - Mailing address: PO Box 12345, Atlanta, GA 30301
  - Website: www.reflecthealth.com/providers
  - For prior authorizations, please call 1-555-000-0150
  - Appeal deadline: 180 days from denial date
  - Claims processing time: typically 30 business days
  ```
- **After answering**: Returns to previous node

---

## Post-Call Webhook Configuration

In the Inbound Phone Number settings:
- **Webhook URL**: `{YOUR_BACKEND_URL}/api/v1/webhooks/bland/call-complete`
- Remove the `https://` prefix when entering in Bland's webhook field

## Variable Extraction for Post-Call Analysis

Configure the following in the pathway's analysis settings:
- `call_intent`: "What was the caller's primary intent? (eligibility, claims, or other)"
- `caller_type`: "Was the caller a provider or a member? (provider/member)"
- `call_successful`: "Was the call resolved without needing a human transfer? (true/false)"
- `transferred`: "Was the call transferred to a human agent? (true/false)"
- `auth_success`: "Was the caller successfully authenticated? (true/false)"
