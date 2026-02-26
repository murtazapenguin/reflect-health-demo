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
providers with:
1. Eligibility verification for patients
2. Claims status inquiries
3. Prior authorization status checks

## Authentication Flow
Before processing any request, you must authenticate the provider:
1. Ask for their NPI (National Provider Identifier) — a 10-digit number
2. Once you have the NPI, use the AuthenticateNPI tool to validate it
3. If valid, ask for their zip code to complete verification
4. Use the VerifyZip tool with both the NPI and zip code
5. If the zip is verified, proceed with their request

## Eligibility Checks
After authentication, ask for:
- Patient first and last name
- Patient date of birth (MM/DD/YYYY format)
Then use the CheckEligibility tool.

## Claims Status
After authentication, ask for:
- Claim number (format: CLM-XXXXXXXX)
Then use the CheckClaimStatus tool.

## Prior Authorization
After authentication, ask for:
- PA ID (format: PA-XXXXXXXX) or Member ID
Then use the LookupPriorAuth tool.

## Frustration & Escalation
If the caller sounds frustrated, confused, or upset at any point — for example repeating
themselves, raising their voice, saying things like "this isn't working", "I already told
you", "just let me talk to someone", or expressing dissatisfaction — immediately
acknowledge their frustration and offer to transfer:

Say something like: "I understand this is frustrating, and I apologize for the
difficulty. Let me connect you with one of our team members who can help you directly."

Do NOT continue asking questions or attempting lookups once frustration is detected.
Prioritize the human handoff.

## Rules
- Always be professional and concise
- Read back dollar amounts and dates clearly
- If a lookup fails, offer to transfer to a human agent
- If the caller is frustrated or asks for a human, immediately offer transfer
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
| Description | `Check patient eligibility and coverage details` |
| Type | Server (webhook) |
| Method | POST |
| URL | `https://YOUR_RAILWAY_BACKEND/api/v1/voice/eligibility` |

**Body Schema:**
```json
{
  "patient_name": { "type": "string", "description": "Patient's full name" },
  "patient_dob": { "type": "string", "description": "Patient's date of birth in MM/DD/YYYY format" }
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
| Eligibility | 1003045220 | 95148 | John Smith | 01/15/1985 | — | — |
| Claims | 1003045220 | 95148 | — | — | CLM-00481922 | — |
| Prior Auth (approved) | 1003045220 | 95148 | — | — | — | PA-00012399 |
| Prior Auth (denied) | 1003045220 | 95148 | — | — | — | PA-00012400 |
