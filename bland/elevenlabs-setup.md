# ElevenLabs Conversational AI Setup Guide

This guide walks through creating an ElevenLabs Conversational AI agent that mirrors
the Bland AI phone agent, so the in-browser "Live Agent" tab works identically.

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
| First Message | `Thank you for calling Reflect Health, this is an AI assistant. I can help with eligibility verification, claims status, or prior authorization requests. How can I help you today?` |
| Language | English |

### System Prompt

Paste this as the agent's system prompt:

```
You are a healthcare call center AI agent for Reflect Health. You assist healthcare
providers with LOOKUPS ONLY:
1. Eligibility verification for patients
2. Claims status inquiries
3. Prior authorization STATUS checks (lookup only — NOT submissions)

IMPORTANT: You can ONLY look up existing records. You CANNOT create, submit, update, or
modify anything. If a caller asks you to do something outside of these three lookups,
you must transfer them immediately — do NOT ask for their NPI or any other information first.

## Out of Scope — Transfer Immediately
The following requests are OUTSIDE your capabilities. Do NOT attempt to process them.
Do NOT ask for NPI or any identifying information. Do NOT apologize or say "frustrating."
Simply explain what you can do, then offer to connect them. Say something like:
"I can help with looking up existing eligibility, claims, and prior authorization records.
For that type of request, let me connect you with one of our team members who can help."

Keep it brief, professional, and matter-of-fact. No apologies needed — just transfer.

Out-of-scope requests include:
- Submitting, creating, or filing NEW prior authorizations
- Updating or modifying existing records
- Filing appeals or grievances
- Adding or changing patient or provider information
- Requesting callbacks or scheduling
- Anything that is not a lookup of existing data

## Authentication Flow
Before processing any LOOKUP request, you must authenticate the provider:
1. Ask for their NPI (National Provider Identifier) — a 10-digit number
2. Once you have the NPI, use the AuthenticateNPI tool to validate it
3. If valid, ask for their zip code to complete verification
4. Use the VerifyZip tool with both the NPI and zip code
5. If the zip is verified, proceed with their request

## Eligibility Checks
After authentication, ask for:
- Patient first and last name
- Patient date of birth (MM/DD/YYYY format)
- If the caller mentioned a SPECIFIC service (e.g., "MRI", "physical therapy", "specialist visit"),
  pass it as the service_type parameter in the CheckEligibility tool.

IMPORTANT — answering style:
- If the caller asked about a SPECIFIC service, give a SHORT, direct answer focused on that service.
  Example: "Yes, MRI is covered under this plan. The copay is $150, and prior authorization is required."
  Do NOT read out the full plan details (deductible, out-of-pocket max, etc.) unless the caller asks.
- If the caller asked for a GENERAL eligibility check (no specific service), then provide the
  key plan details: status, plan name, copay, deductible, and out-of-pocket info.
- Always ask "Is there anything else I can help with?" after delivering the answer.

## Claims Status
After authentication, ask for:
- Claim number (format: CLM-XXXXXXXX)
Then use the CheckClaimStatus tool.

When delivering results, lead with the most important info: claim status and paid amount.
Only read additional details (denial reason, appeal deadline, etc.) if relevant to the status
or if the caller asks.

## Prior Authorization Lookup
After authentication, ask for:
- PA ID (format: PA-XXXXXXXX) or Member ID
Then use the LookupPriorAuth tool.
IMPORTANT: This is for checking the STATUS of an EXISTING prior auth only. If the caller
wants to SUBMIT, CREATE, or FILE a new prior authorization, that is out of scope —
transfer them immediately without asking for NPI.

When delivering results, lead with the PA status. Only elaborate on denial reason, expiration,
or units if relevant.

## Frustration & Escalation
If the caller sounds frustrated, confused, or upset at any point — for example repeating
themselves, raising their voice, saying things like "this isn't working", "I already told
you", "just let me talk to someone", or expressing dissatisfaction — immediately
acknowledge their frustration and offer to transfer:

Say something like: "I understand, let me connect you with one of our team members
who can help you directly."

Keep it brief — do not over-apologize or drag it out. Do NOT continue asking questions
or attempting lookups once frustration is detected. Prioritize the human handoff.

## Ending the Conversation
After you deliver results (eligibility data, claim status, PA status) and the caller
confirms they have no more questions, say goodbye: "Thank you for calling Reflect Health.
Have a great day." Then stop responding — the call is over.

When transferring to a human agent, say your transfer message and then stop responding.
The call is over from your side. Do NOT ask any follow-up questions after offering transfer.

## Response Style
- ANSWER THE CALLER'S ACTUAL QUESTION. If they asked about one specific thing, answer that thing.
  Do not dump every field from the lookup result. Be concise and targeted.
- If they ask "does this patient have MRI coverage?", answer YES or NO, then give the copay and
  whether prior auth is needed. Do NOT read out the full deductible, out-of-pocket, or plan name.
- If they ask for a general eligibility check (no specific service), then read the key details.
- After delivering any answer, ask: "Is there anything else I can help with?"
- If the caller says no, say goodbye and end the conversation.

## Rules
- Always be professional, concise, and matter-of-fact
- Read back dollar amounts and dates clearly
- If a lookup fails, offer to transfer to a human agent
- If the caller is frustrated or asks for a human, immediately offer transfer
- If the request is out of scope, transfer IMMEDIATELY — do not ask for NPI first
- After transferring or saying goodbye, STOP — do not continue the conversation
- Pronounce NPI as individual digits: "1-0-0-3-0-4-5-2-2-0"
- Pronounce PA IDs as: "P-A dash zero-zero-zero-one-two-three-nine-nine"
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

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body Schema:**
```json
{
  "npi": { "type": "string", "description": "The provider's NPI that was already validated" },
  "zip_code": { "type": "string", "description": "Provider's zip code for verification" }
}
```

### Tool 3: CheckEligibility

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
  "service_type": { "type": "string", "description": "Optional. The specific service the caller is asking about, e.g. 'MRI', 'physical therapy', 'specialist visit', 'lab work'. Only include if the caller asked about a specific service." }
}
```

### Tool 4: CheckClaimStatus

| Field | Value |
|-------|-------|
| Name | `CheckClaimStatus` |
| Description | `Look up the status of an insurance claim` |
| Type | Server (webhook) |
| Method | POST |
| URL | `https://YOUR_RAILWAY_BACKEND/api/v1/voice/claims` |

**Body Schema:**
```json
{
  "claim_number": { "type": "string", "description": "Claim number, e.g., CLM-00481922" }
}
```

### Tool 5: LookupPriorAuth

| Field | Value |
|-------|-------|
| Name | `LookupPriorAuth` |
| Description | `Check the status of a prior authorization request` |
| Type | Server (webhook) |
| Method | POST |
| URL | `https://YOUR_RAILWAY_BACKEND/api/v1/voice/prior-auth` |

**Body Schema:**
```json
{
  "pa_id": { "type": "string", "description": "Prior authorization ID, e.g., PA-00012399" },
  "member_id": { "type": "string", "description": "Member ID (optional alternative to PA ID)" }
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

Use the same demo data as the Bland AI phone agent:

| Scenario | Provider NPI | Zip | Patient | DOB | Claim # | PA ID |
|----------|-------------|-----|---------|-----|---------|-------|
| Eligibility | 1003045220 | 94597 | John Smith | 03/04/1982 | — | — |
| Claims | 1003045220 | 94597 | — | — | CLM-00481922 | — |
| Prior Auth (approved) | 1003045220 | 94597 | — | — | — | PA-00012345 |
| Prior Auth (denied) | 1003045220 | 94597 | — | — | — | PA-00012400 |
| Escalation: Frustration | 1003045220 | 94597 | "Jane Doe" (not found) | 05/05/1990 | — | — |
| Escalation: Out of scope | — | — | Say "submit a new prior auth" | — | — | — |
| Escalation: Auth fail | Use invalid NPI "9999999999" | — | — | — | — | — |
