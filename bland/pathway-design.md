# Bland AI Conversational Pathway Design

## Overview

This document defines the complete conversational pathway for the Reflect Health Voice AI agent.
Build this pathway in the Bland AI developer portal at https://app.bland.ai/dashboard?page=convo-pathways

## Global Prompt (Apply to All Nodes)

```
You are a professional AI assistant for Reflect Health provider services. You handle calls from healthcare providers who need to check patient eligibility or claim status.

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
```

## Voice Configuration

- Voice: "Paige" (or another natural US English female voice)
- Language: English
- Model: base (supports transfers and all features)

---

## Node Definitions

### START NODE: Greeting
- **Type**: Default Node
- **Prompt**: "Thank you for calling Reflect Health provider services. I'm an AI assistant and can help with patient eligibility verification or claim status inquiries. Which one brings you in today?"
- **Extract Variables**:
  - `call_intent` (string): Description: "The caller's intent. Extract 'eligibility' if they mention eligibility, coverage, benefits, or if a patient has insurance. Extract 'claims' if they mention claim, payment, denial, or check status. Extract 'other' for anything else."
- **Pathways**:
  - "Caller wants eligibility/coverage check" → NPI Authentication
  - "Caller wants claim/payment status" → NPI Authentication
  - "Caller wants something else (prior auth, billing dispute, etc.)" → Transfer to Human
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
- **Prompt**: "I wasn't able to verify that NPI. Could you please try again? You can also provide your Tax Identification Number instead."
- **Extract Variables**:
  - `npi` (string): Description: "The NPI or TIN number provided on retry"
- **Webhook**: Call `AuthenticateProvider` tool
- **Pathways**:
  - "NPI/TIN is valid" → Zip Code Verification
  - "Second failure" → Transfer to Human

---

### NODE: Zip Code Verification
- **Type**: Wait for Response
- **Prompt**: "Thank you, {{provider_name}}. To complete verification, could you confirm the zip code of your primary practice location?"
- **Extract Variables**:
  - `zip_code` (string): Description: "The 5-digit zip code of the provider's practice"
- **Webhook**: Call `VerifyZipCode` tool with npi and zip_code
- **Pathways**:
  - "Zip code verified AND call_intent is eligibility" → Eligibility: Collect Patient Info
  - "Zip code verified AND call_intent is claims" → Claims: Collect Patient Info
  - "Zip code mismatch" → Zip Retry

---

### NODE: Zip Retry
- **Type**: Wait for Response
- **Prompt**: "That zip code didn't match our records. Could you try again?"
- **Extract Variables**:
  - `zip_code` (string)
- **Webhook**: Call `VerifyZipCode` tool
- **Pathways**:
  - "Zip code verified" → Route based on call_intent (Eligibility or Claims)
  - "Second failure" → Transfer to Human

---

### NODE: Eligibility: Collect Patient Info
- **Type**: Wait for Response
- **Prompt**: "You're verified. I can look up patient eligibility for you. What is the patient's first and last name, and date of birth?"
- **Extract Variables**:
  - `patient_name` (string): Description: "The patient's full name (first and last)"
  - `patient_dob` (string): Description: "The patient's date of birth in YYYY-MM-DD format. Convert spoken dates like 'March 4th 1982' to '1982-03-04'"
- **Condition**: "You must get both the patient's name and date of birth."
- **Post-extraction speech**: "I have {{patient_name}}, born {{patient_dob}}. Let me look that up for you."
- **Webhook**: Call `LookupEligibility` tool with npi, patient_name, patient_dob
- **Pathways**:
  - "Patient found and status is 'active'" → Eligibility: Active
  - "Patient found and status is 'inactive' or 'termed'" → Eligibility: Inactive
  - "Patient not found" → Eligibility: Not Found

---

### NODE: Eligibility: Active
- **Type**: Default Node
- **Prompt**: "{{patient_name}} IS active on the {{plan_name}} plan. Coverage effective {{effective_date}}. Copay: ${{copay_primary}} primary care, ${{copay_specialist}} specialist. Deductible: ${{deductible}} with ${{deductible_met}} met so far. Coordination of benefits status: {{cob_status}}. Is there anything else I can help you with?"
- **Pathways**:
  - "Caller wants to check another patient" → Eligibility: Collect Patient Info
  - "Caller is done" → End Call
  - "Caller wants to check a claim" → Claims: Collect Patient Info

---

### NODE: Eligibility: Inactive
- **Type**: Default Node
- **Prompt**: "{{patient_name}}'s coverage was terminated on {{term_date}}. The plan was {{plan_name}}. Would you like me to transfer you to a specialist who can assist with reinstatement or billing questions?"
- **Pathways**:
  - "Caller wants transfer" → Transfer to Human
  - "Caller is done" → End Call
  - "Caller wants to check another patient" → Eligibility: Collect Patient Info

---

### NODE: Eligibility: Not Found
- **Type**: Wait for Response
- **Prompt**: "I wasn't able to find that patient. Do you have their Member ID? I can try looking them up that way."
- **Extract Variables**:
  - `member_id` (string): Description: "The member ID, typically in format MBR-XXXXXX"
- **Webhook**: Call `LookupEligibility` tool with member_id
- **Pathways**:
  - "Patient found" → Eligibility: Active or Inactive based on status
  - "Still not found" → Transfer to Human

---

### NODE: Claims: Collect Patient Info
- **Type**: Wait for Response
- **Prompt**: "I can look up a claim for you. What is the patient's first and last name, and date of birth?"
- **Extract Variables**:
  - `patient_name` (string): Description: "The patient's full name (first and last)"
  - `patient_dob` (string): Description: "The patient's date of birth in YYYY-MM-DD format. Convert spoken dates like 'March 4th 1982' to '1982-03-04'"
- **Condition**: "You must get both the patient's name and date of birth before proceeding."
- **Post-extraction speech**: "Got it, {{patient_name}}, born {{patient_dob}}."

> **IMPORTANT**: This node does NOT call any webhook. It only collects the patient name and DOB, then always routes to "Claims: Get Claim Number". Do not attach the LookupClaim webhook here.

- **Pathways**:
  - "Got patient name and date of birth" → Claims: Get Claim Number

---

### NODE: Claims: Get Claim Number
- **Type**: Wait for Response
- **Prompt**: "Do you have the claim number? It usually starts with CLM followed by a dash and some digits. If you don't have it, I can search by date of service instead."
- **Extract Variables**:
  - `claim_number` (string): Description: "The claim number, typically in format CLM-XXXXXXXX. Could also be spoken as just digits."
  - `date_of_service` (string): Description: "The date of service in YYYY-MM-DD format, only if no claim number is provided"
- **Condition**: "You must get either a claim number OR a date of service before calling the webhook."
- **Post-extraction speech**: "One moment while I look that up."

> **IMPORTANT**: This is the ONLY claims node that calls the LookupClaim webhook. It must always be reached before calling the webhook.

- **Webhook**: Call `LookupClaim` tool with npi, claim_number, patient_name, patient_dob, date_of_service
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
  - "Caller wants another claim" → Claims: Collect Patient Info
  - "Caller wants eligibility" → Eligibility: Collect Patient Info
  - "Caller is done" → End Call

---

### NODE: Claims: Denied
- **Type**: Default Node
- **Prompt**: "Claim {{claim_number}} was denied on {{process_date}}. Reason: {{denial_code}} — {{denial_reason}}. You have until {{appeal_deadline}} to file an appeal. Would you like me to transfer you to the appeals team?"
- **Pathways**:
  - "Caller wants transfer to appeals" → Transfer to Human
  - "Caller wants another claim" → Claims: Collect Patient Info
  - "Caller is done" → End Call

---

### NODE: Claims: Pending
- **Type**: Default Node
- **Prompt**: "Claim {{claim_number}} is still being processed. It was received on {{received_date}}. Expected processing window is 30 days from receipt. Would you like me to send a fax confirmation of the current status?"
- **Pathways**:
  - "Caller wants fax or another claim" → Claims: Collect Patient Info
  - "Caller is done" → End Call

---

### NODE: Claims: Patient Not Found
- **Type**: Wait for Response
- **Prompt**: "I wasn't able to find a patient matching that name and date of birth. Could you double-check the spelling and try again? Or I can transfer you to a team member."
- **Pathways**:
  - "Caller provides corrected info" → Claims: Collect Patient Info
  - "Caller wants transfer" → Transfer to Human

---

### NODE: Claims: No Claims
- **Type**: Wait for Response
- **Prompt**: "I found the patient, but there are no claims on file matching that information. Would you like to try a different claim number or date of service? Or I can transfer you to someone who can dig into this further."
- **Pathways**:
  - "Caller wants to try again" → Claims: Get Claim Number
  - "Caller wants transfer" → Transfer to Human

---

### NODE: Claims: Claim Not Found
- **Type**: Wait for Response
- **Prompt**: "I wasn't able to find a claim matching that number. It's possible the claim number was entered differently in our system. Would you like to try a different claim number, or I can search by date of service instead? I can also transfer you to a team member who can dig into this further."
- **Pathways**:
  - "Caller provides new info" → Claims: Get Claim Number
  - "Caller wants transfer" → Transfer to Human

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
  - For prior authorizations, please call 1-800-555-0150
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
- `call_successful`: "Was the call resolved without needing a human transfer? (true/false)"
- `transferred`: "Was the call transferred to a human agent? (true/false)"
- `auth_success`: "Was the provider successfully authenticated? (true/false)"
