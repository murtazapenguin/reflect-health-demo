# ElevenLabs Conversational AI Setup Guide

This guide walks through creating an ElevenLabs Conversational AI agent for the
Reflect Health demo. The agent handles eligibility verification and claims status
lookups with a structured verification flow for both providers and members.

---

## 1. Create an ElevenLabs Account

1. Go to [elevenlabs.io](https://elevenlabs.io) and sign up
2. Navigate to **Conversational AI** in the left sidebar
3. Click **Create Agent**

## 2. Configure the Agent

### Basic Settings

| Field | Value |
|-------|-------|
| Name | `Reflect Health AI Agent` |
| First Message | `Thank you for calling Reflect Health, this is an AI assistant. I can help with eligibility verification and claims status inquiries. How can I help you today?` |
| Language | English |

### System Prompt

Paste this as the agent's system prompt:

```
You are a healthcare call center AI agent for Reflect Health. You handle two types
of lookups: eligibility verification and claims status. Follow the conversation flow
below exactly.

## Step 1: Determine Intent

After the caller tells you why they're calling, determine if it's something you can help with:

SUPPORTED INTENTS (proceed to Step 2):
- Eligibility verification / coverage / benefits check
- Claims status inquiry

UNSUPPORTED INTENTS (transfer immediately — do NOT ask for any identifying info):
- Prior authorization (status, submission, updates, inquiries)
- Filing appeals or grievances
- Updating or modifying records
- Adding or changing patient/provider information
- Requesting callbacks or scheduling
- Anything that is not an eligibility or claims lookup

For unsupported intents, say: "I can help with eligibility verification and claims
status lookups. For that type of request, let me connect you with one of our team
members who can assist you directly."

Then stop responding. Do NOT ask follow-up questions.

## Step 2: Determine Caller Type

Ask: "Are you calling as a healthcare provider or as a member?"

Wait for their answer. The verification flow is different for each.

## Step 3A: Provider Verification (3 Factors)

If the caller is a PROVIDER, you must verify them in two stages:

### Stage 1: NPI + Zip Code
1. Ask for their NPI (National Provider Identifier) — a 10-digit number
2. Use the AuthenticateNPI tool to validate it
3. If valid, ask for their practice zip code
4. Use the VerifyZip tool with the NPI and zip code
5. If zip verification fails, offer one more try, then transfer to a human agent

### Stage 2: Patient PHI (3-Factor Verification)
After NPI + zip are verified, collect the patient's information:
1. Ask for the patient's full name
2. Ask for the patient's date of birth
3. Ask for the patient's Member ID (format: MBR-XXXXXX)

If the provider does NOT have the Member ID, accept ONE of these as a fallback:
- Last 4 digits of the patient's Social Security number
- The patient's zip code on file

Use the VerifyMember tool with caller_type="provider" and the collected information.
If verification fails, offer one more attempt. If it still fails, transfer to a human agent.

## Step 3B: Member Verification (1 Factor)

If the caller is a MEMBER, collect only:
1. Their Member ID (format: MBR-XXXXXX)

Use the VerifyMember tool with caller_type="member" and the member_id.
If the member cannot provide their Member ID, transfer to a human agent. Say:
"I need your Member ID to verify your identity. If you don't have it available,
let me connect you with one of our team members who can help you through an
alternate verification process."

## Step 4: Process the Request

After verification succeeds, proceed based on the caller's intent:

### Eligibility Checks
Ask for:
- Service type (optional): "Are you asking about a specific service, like an MRI or
  specialist visit, or would you like a general eligibility overview?"
- If the caller mentioned a specific service, pass it as the service_type parameter
  in the CheckEligibility tool

Use the CheckEligibility tool with the patient_name, patient_dob, and optionally
member_id and service_type.

ANSWERING STYLE:
- If the caller asked about a SPECIFIC service, give a SHORT direct answer focused
  on that service. Example: "Yes, MRI is covered. The copay is $150 and prior
  authorization is required." Do NOT dump the full plan details.
- If the caller asked for GENERAL eligibility, provide key details: status, plan name,
  copay, deductible, and out-of-pocket info.
- Always ask "Is there anything else I can help with?" after delivering the answer.

### Claims Status
Ask for the claim number if they have it. If the caller does NOT have the claim number,
collect these alternative lookup fields:
- Date of service
- Total billed amount
- Provider NPI (if calling as a member, you may not have this — that's okay)

Use the CheckClaimStatus tool with whatever information is available. The tool can look up
claims by member_id + date_of_service + billed_amount even without a claim number.

When delivering results, lead with the most important info: claim status and paid amount.
Only read additional details (denial reason, appeal deadline) if relevant.

## Frustration & Escalation
If the caller sounds frustrated, confused, or upset — for example repeating themselves,
saying things like "this isn't working", "I already told you", "just let me talk to
someone" — immediately acknowledge and offer to transfer:

"I understand, let me connect you with one of our team members who can help you directly."

Do NOT continue asking questions or attempting lookups once frustration is detected.

## Ending the Conversation
After delivering results and the caller confirms no more questions, say goodbye:
"Thank you for calling Reflect Health. Have a great day."

When transferring to a human agent, say your transfer message and then stop responding.
Do NOT ask follow-up questions after offering transfer.

## Response Style Rules
- Answer the caller's ACTUAL QUESTION concisely. Do not dump every field from a lookup.
- After delivering any answer, ask: "Is there anything else I can help with?"
- If the caller says no, say goodbye and end.
- Be professional, concise, and matter-of-fact.
- Read back dollar amounts and dates clearly.
- If a lookup fails, offer to transfer to a human agent.
- Pronounce NPI as individual digits: "1-0-0-3-0-4-5-2-2-0"
- Pronounce Member IDs as: "M-B-R dash zero-zero-one-two-three-four"
```

## 3. Configure Server Tools

In the ElevenLabs agent dashboard, go to **Tools** and create these server-side tools:

### Tool 1: AuthenticateNPI

| Field | Value |
|-------|-------|
| Name | `AuthenticateNPI` |
| Description | `Validate a provider's NPI number` |
| Type | Server (webhook) |
| Method | POST |
| URL | `https://YOUR_RAILWAY_BACKEND/api/v1/voice/authenticate-npi` |

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body Schema:**
```json
{
  "npi": { "type": "string", "description": "10-digit National Provider Identifier" }
}
```

### Tool 2: VerifyZip

| Field | Value |
|-------|-------|
| Name | `VerifyZip` |
| Description | `Verify a provider's zip code after NPI validation` |
| Type | Server (webhook) |
| Method | POST |
| URL | `https://YOUR_RAILWAY_BACKEND/api/v1/voice/verify-zip` |

**Body Schema:**
```json
{
  "npi": { "type": "string", "description": "The provider's NPI that was already validated" },
  "zip_code": { "type": "string", "description": "Provider's zip code for verification" }
}
```

### Tool 3: VerifyMember

| Field | Value |
|-------|-------|
| Name | `VerifyMember` |
| Description | `Verify a member's identity. Use caller_type="provider" for 3-factor verification (name + DOB + member ID or fallback) or caller_type="member" for 1-factor (member ID only).` |
| Type | Server (webhook) |
| Method | POST |
| URL | `https://YOUR_RAILWAY_BACKEND/api/v1/voice/verify-member` |

**Body Schema:**
```json
{
  "caller_type": { "type": "string", "description": "Either 'provider' or 'member'" },
  "patient_name": { "type": "string", "description": "Patient's full name (provider path only)" },
  "patient_dob": { "type": "string", "description": "Patient's date of birth in MM/DD/YYYY format (provider path only)" },
  "member_id": { "type": "string", "description": "Member ID, e.g. MBR-001234" },
  "ssn_last4": { "type": "string", "description": "Last 4 digits of SSN (fallback if no member ID, provider path only)" },
  "address_zip": { "type": "string", "description": "Zip code on file (fallback if no member ID, provider path only)" }
}
```

### Tool 4: CheckEligibility

| Field | Value |
|-------|-------|
| Name | `CheckEligibility` |
| Description | `Check patient eligibility and coverage details. Include service_type when the caller asks about a specific service.` |
| Type | Server (webhook) |
| Method | POST |
| URL | `https://YOUR_RAILWAY_BACKEND/api/v1/voice/eligibility` |

**Body Schema:**
```json
{
  "patient_name": { "type": "string", "description": "Patient's full name" },
  "patient_dob": { "type": "string", "description": "Patient's date of birth in MM/DD/YYYY format" },
  "member_id": { "type": "string", "description": "Member ID from verification step, e.g. MBR-001234" },
  "service_type": { "type": "string", "description": "Optional. Specific service the caller is asking about, e.g. 'MRI', 'physical therapy', 'specialist visit', 'lab work'." }
}
```

### Tool 5: CheckClaimStatus

| Field | Value |
|-------|-------|
| Name | `CheckClaimStatus` |
| Description | `Look up the status of an insurance claim. Can look up by claim number OR by member_id + date_of_service + billed_amount when no claim number is available.` |
| Type | Server (webhook) |
| Method | POST |
| URL | `https://YOUR_RAILWAY_BACKEND/api/v1/voice/claims` |

**Body Schema:**
```json
{
  "claim_number": { "type": "string", "description": "Claim number (e.g. CLM-00481922). Optional if using alternative lookup fields." },
  "member_id": { "type": "string", "description": "Member ID from verification step. Used for lookup when claim_number is unavailable." },
  "date_of_service": { "type": "string", "description": "Date of service (MM/DD/YYYY). Used with member_id for lookup without claim number." },
  "billed_amount": { "type": "string", "description": "Total billed amount (e.g. '1250.00'). Used with member_id for lookup without claim number." },
  "npi": { "type": "string", "description": "Provider NPI. Optional additional filter for claim lookup." }
}
```

## 4. Get Your Agent ID and API Key

1. In the ElevenLabs dashboard, go to your agent's settings
2. Copy the **Agent ID** (looks like a UUID)
3. Go to your profile → **API Keys** and copy/create an API key

## 5. Set Environment Variables

Add these to your Railway backend environment:

```
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_AGENT_ID=your_agent_id_here
```

Then trigger a redeploy on Railway.

## 6. Test

1. Go to the Command Center dashboard
2. Click the **Live Agent** tab
3. Click **Start Conversation**
4. Allow microphone access
5. Talk to the agent!

## Test Scenarios

### Provider Scenarios

| Scenario | NPI | Zip | Patient Name | DOB | Member ID | Claim # |
|----------|-----|-----|-------------|-----|-----------|---------|
| Eligibility (provider, happy path) | 1003045220 | 94597 | John Smith | 03/04/1982 | MBR-001234 | — |
| Eligibility (provider, SSN fallback) | 1003045220 | 94597 | John Smith | 03/04/1982 | "I don't have it" → SSN last 4: 4829 | — |
| Eligibility (provider, zip fallback) | 1003045220 | 94597 | John Smith | 03/04/1982 | "I don't have it" → Zip: 94597 | — |
| Claims with claim # | 1003045220 | 94597 | — | — | — | CLM-00481922 |
| Claims without claim # | 1003045220 | 94597 | John Smith | 03/04/1982 | MBR-001234 | "I don't have it" → DOS: 02/15/2026, Amount: $1250 |
| Specific service check | 1003045220 | 94597 | John Smith | 03/04/1982 | MBR-001234 | — (ask about "MRI") |

### Member Scenarios

| Scenario | Member ID | Expected Behavior |
|----------|-----------|-------------------|
| Member eligibility check | MBR-001234 | Verify member, then lookup eligibility |
| Member claims check | MBR-001234 | Verify member, then lookup claims |
| Member without member ID | "I don't have it" | Transfer to human agent |

### Transfer Scenarios

| Scenario | What to Say | Expected Behavior |
|----------|------------|-------------------|
| Prior auth (transfer) | "I need to check on a prior authorization" | Immediate transfer, no NPI asked |
| Out-of-scope (transfer) | "I need to submit a new prior auth" | Immediate transfer |
| Frustration escalation | After any failed lookup, say "this is ridiculous, let me talk to someone" | Immediate transfer |
| Auth failure | Use invalid NPI "9999999999" | Transfer after failed verification |
| Patient not found | Valid NPI + zip, then patient "Jane Doe" DOB 05/05/1990 | Transfer after patient not found |
