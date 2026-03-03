# Demo Script — Reflect Health

## Pre-Demo Checklist

- [ ] Backend running (`uvicorn app.main:app --reload`)
- [ ] MongoDB running with seeded data
- [ ] Frontend running (`npm run dev`)
- [ ] Ngrok tunnel active, URL configured in Bland custom tools
- [ ] Bland pathway tested with at least 1 test call
- [ ] Demo phone ready (separate from presentation device)
- [ ] Dashboard open in browser, logged in
- [ ] ElevenLabs agent configured (see `elevenlabs-setup.md`)

---

## Provider Directory (Authentication)

All four CMS-verified providers below are pre-loaded for instant authentication.
**Each provider accepts two zip codes** (primary + satellite).

| # | NPI | Name | Zip (Primary) | Zip (Alt) | Specialty | City |
|---|-----|------|---------------|-----------|-----------|------|
| 1 | `1003045220` | Dr. Jasleen Sohal | `94597` | `94598` | Family Practice | Walnut Creek, CA |
| 2 | `1003045683` | Dr. Kali Tileston | `95128` | `95148` | Orthopedic Surgery | San Jose, CA |
| 3 | `1003044728` | Dr. Kyle Edmonds | `92103` | `92104` | Palliative Care | San Diego, CA |
| 4 | `1003000126` | Dr. Ardalan Enkeshafi | `20032` | `20024` | Hospitalist | Washington, DC |

> **Tip:** Any real NPI will work (the backend queries CMS), but these four are pre-loaded for < 1s response time.

---

## Patient Directory

| Member ID | Name | DOB | Plan | Status | Key Details |
|-----------|------|-----|------|--------|-------------|
| MBR-001234 | John Smith | 1982-03-04 | Reflect Gold PPO | Active | $20 PCP copay, $1,500 deductible ($420 met) |
| MBR-001235 | Mary Johnson | 1975-08-15 | Reflect Silver HMO | Active | $30 PCP copay, $2,500 deductible ($800 met) |
| MBR-001236 | Robert Williams | 1990-11-22 | Reflect Gold PPO | Active | Secondary COB, deductible fully met |
| MBR-001237 | Patricia Brown | 1968-05-30 | Reflect Platinum PPO | Active | $10 PCP copay, deductible fully met, near OOP max |
| MBR-001238 | Michael Jones | 1955-01-12 | Reflect Gold PPO | Active | Low deductible met ($200) |
| MBR-001239 | Linda Garcia | 1980-09-08 | Reflect Silver HMO | **Termed** | Term date: 2025-12-31 |
| MBR-001240 | David Miller | 1972-04-18 | Reflect Gold PPO | **Inactive** | Term date: 2025-06-30 |

---

## Authentication Flow (All Provider Scenarios)

Every provider call now follows a 3-step verification:
1. **NPI** — 10-digit National Provider Identifier
2. **Zip Code** — primary practice location zip
3. **Patient PHI (3 factors)** — patient Name + DOB + **Member ID** (required); if no Member ID, accept SSN or address as fallback

---

## Test Scenarios

### SCENARIO 1 — Eligibility: Happy Path (Active Member)
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Patient PHI:** John Smith, DOB March 4 1982, Member ID MBR-001234
**Expected Result:**
- Status: **Active** on Reflect Gold PPO
- Copay: $20 PCP / $50 specialist
- Deductible: $1,500 ($420 met)
- OOP Max: $6,000 ($1,200 met)

### SCENARIO 2 — Eligibility: Service-Specific (MRI)
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Patient PHI:** John Smith, DOB March 4 1982, Member ID MBR-001234
**Service:** "MRI"
**Expected Result:**
- MRI: **Covered**, $150 copay, **no prior auth required** (Gold PPO)

### SCENARIO 3 — Eligibility: Service Requiring Prior Auth (HMO)
**Provider:** Dr. Kali Tileston — NPI `1003045683`, Zip `95128` or `95148`
**Patient PHI:** Mary Johnson, DOB August 15 1975, Member ID MBR-001235
**Service:** "physical therapy"
**Expected Result:**
- Physical Therapy: **Covered**, $50 copay, **prior auth required**, 20 visits/year (Silver HMO)

### SCENARIO 4 — Eligibility: Termed Member (Edge Case)
**Provider:** Dr. Kyle Edmonds — NPI `1003044728`, Zip `92103`
**Patient PHI:** Linda Garcia, DOB September 8 1980, Member ID MBR-001239
**Expected Result:**
- Status: **Termed** — term date Dec 31, 2025

### SCENARIO 5 — Eligibility: Inactive Member (Edge Case)
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Patient PHI:** David Miller, DOB April 18 1972, Member ID MBR-001240
**Expected Result:**
- Status: **Inactive** — term date June 30, 2025

### SCENARIO 6 — Eligibility: Service Not Covered (Edge Case)
**Provider:** Dr. Kali Tileston — NPI `1003045683`, Zip `95148`
**Patient PHI:** Mary Johnson, DOB August 15 1975, Member ID MBR-001235
**Service:** "chiropractic"
**Expected Result:**
- Chiropractic: **Not covered** under Silver HMO plan

### SCENARIO 7 — Eligibility: Member Near OOP Max
**Provider:** Dr. Ardalan Enkeshafi — NPI `1003000126`, Zip `20032`
**Patient PHI:** Patricia Brown, DOB May 30 1968, Member ID MBR-001237
**Expected Result:**
- Status: **Active** on Reflect Platinum PPO
- OOP Max: $4,000 ($2,800 met — only $1,200 remaining)
- Deductible: fully met

---

### SCENARIO 8 — Claims: Paid Claim
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Patient PHI:** John Smith, DOB March 4 1982, Member ID MBR-001234
**Claim #:** `CLM-00481922`
**Expected Result:**
- Status: **Paid**
- Billed: $850 → Allowed: $620 → Paid: $570
- Check: CHK-0018472, processed Dec 1, 2025

### SCENARIO 9 — Claims: Denied Claim
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Patient PHI:** John Smith, DOB March 4 1982, Member ID MBR-001234
**Claim #:** `CLM-00519833`
**Expected Result:**
- Status: **Denied**, code CO-97
- Reason: "Payment adjusted — service not covered by this plan benefit"
- Appeal deadline: July 24, 2026

### SCENARIO 10 — Claims: Pending Claim
**Provider:** Dr. Kali Tileston — NPI `1003045683`, Zip `95128`
**Patient PHI:** Robert Williams, DOB November 22 1990, Member ID MBR-001236
**Claim #:** `CLM-00520200`
**Expected Result:**
- Status: **Pending** — joint injection, received Jan 23, 2026

### SCENARIO 11 — Claims: Paid Surgical Claim
**Provider:** Dr. Kali Tileston — NPI `1003045683`, Zip `95148`
**Patient PHI:** Mary Johnson, DOB August 15 1975, Member ID MBR-001235
**Claim #:** `CLM-00520100`
**Expected Result:**
- Status: **Paid** — total knee replacement
- Billed: $42,000 → Paid: $30,500
- Check: CHK-0019200

### SCENARIO 12 — Claims: Denied Claim (Different Provider)
**Provider:** Dr. Kyle Edmonds — NPI `1003044728`, Zip `92103`
**Patient PHI:** Michael Jones, DOB January 12 1955, Member ID MBR-001238
**Claim #:** `CLM-00520400`
**Expected Result:**
- Status: **Denied**, code CO-11
- Reason: "Diagnosis inconsistent with procedure"
- Appeal deadline: Aug 17, 2026

### SCENARIO 13 — Claims: No Claim Number (Key Demo Scenario)
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Patient PHI:** John Smith, DOB March 4 1982, Member ID MBR-001234
**Action:** Say "I don't have the claim number" → provide Date of Service + Billed Amount
**Expected Result:**
- AI prompts for DOS and billed amount
- AI locates the claim using member ID + DOS + billed amount
- Returns claim status without ever requiring the claim number

### SCENARIO 14 — Claims: Claim Not Found (Edge Case)
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Claim #:** `CLM-99999999`
**Expected Result:**
- "No claim found" — agent offers to search by DOS and billed amount

---

### SCENARIO 15 — Prior Auth: Immediate Transfer
**Action:** After authentication, say "I need to check on a prior authorization"
**Expected Result:**
- AI recognizes prior auth request
- Immediately offers transfer to PA team at 1-555-000-0150
- Does NOT attempt to look up any PA data
- Demo point: clean, fast routing — no dead ends

---

### SCENARIO 16 — Auth Failure: Wrong Zip Code (Edge Case)
**Provider:** NPI `1003045220`, Zip `90210` (wrong zip for Dr. Sohal)
**Expected Result:**
- Zip verification **fails**
- Agent asks to re-enter or offers transfer

### SCENARIO 17 — Auth Failure: Invalid NPI (Edge Case)
**Provider:** NPI `0000000000`
**Expected Result:**
- NPI not found in local DB or CMS
- Agent asks to re-enter

### SCENARIO 18 — Auth Failure: Cannot Provide Member ID
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Action:** Refuse to provide Member ID or SSN/address fallback
**Expected Result:**
- AI fails PHI verification
- Immediately transfers to human

### SCENARIO 19 — Member Call: Self-Service Eligibility
**Action:** Call in as a member — say "I'm a plan member, I want to check my coverage"
**Member ID:** `MBR-001234`
**Expected Result:**
- AI routes to member auth path (no NPI required)
- Prompts for Member ID only
- Returns coverage summary for John Smith
- Demo point: same AI handles both provider and member calls

### SCENARIO 20 — Patient Not Found (Edge Case)
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Patient:** "Jane Doe, DOB January 1, 2000, Member ID MBR-999999"
**Expected Result:**
- No member found
- Agent offers retry or transfer

---

## Demo Flow (15-20 minutes)

### 1. Dashboard Overview (3 min)

**Talking points:**
- "This is the Reflect Health AI Operations Center — the real-time command center for your voice AI program."
- Walk through the KPI cards: deflection rate, avg handle time, transfer rate, auth success rate
- Show the call volume trend chart
- Show the intent/outcome breakdown: "Most calls are eligibility and claims, which is exactly what we automate"
- Click into a historical call to show the detail view briefly

### 2. Live Eligibility Call with 3-Factor Auth (4 min)

**Say:** "Now let me show you what happens when a provider calls in — including the new 3-factor patient verification."

**On the phone (speaker):**
1. Call the Bland inbound number
2. AI answers: "Thank you for calling Reflect Health..."
3. Say: "I'm a provider, I need to check if a patient has coverage"
4. AI asks for NPI → Say: "1003045220"
5. AI asks for zip → Say: "94597"
6. AI confirms: "Dr. Sohal" and asks for patient PHI
7. Say: "John Smith, born March 4th 1982, Member ID MBR dash 001234"
8. AI verifies all three factors and confirms
9. AI asks what service → Say: "MRI"
10. AI delivers eligibility info with service-specific coverage

**After the call, switch to dashboard:**
- Refresh the call log — show the new call appearing
- Click into it: transcript, extracted data, tags
- "Every call is logged automatically — notice the 3-factor auth is captured in the extracted data"

### 3. Live Claims Call — No Claim Number (3 min)

**Say:** "Now here's the scenario your team described: a provider calls about a claim but doesn't have the claim number. Watch how the AI handles it."

**On the phone:**
1. Call the Bland inbound number again
2. Authenticate (NPI `1003045220`, zip `94597`, patient John Smith, MBR-001234)
3. Say: "I need to check on a claim status but I don't have the claim number"
4. AI prompts for date of service and billed amount
5. Provide DOS + billed amount
6. AI locates the claim using member ID + DOS + billed amount
7. AI delivers payment details

**Key talking point:** "Providers never have claim numbers — they have dates and amounts. The AI works the way they actually work."

### 4. Prior Auth Transfer Demo (2 min)

**Say:** "Prior auth is handled by a dedicated team. Let me show you how the AI routes those calls — fast and clean."

**On the phone:**
1. Call the Bland inbound number
2. Authenticate briefly
3. Say: "I need to check on a prior authorization"
4. AI immediately routes to PA team — no lookup attempted, no hold, no dead end

**Key talking point:** "This is clean, deliberate routing. The AI knows its lane."

### 5. In-Browser Agent Demo (3 min)

**Say:** "We can also embed this directly in your platform."

1. Click **Live Agent** tab
2. Click **Start Conversation**
3. Run the same eligibility scenario via voice in the browser
4. Show transcript updating in real time
5. End the call — show it appears in the Call Log alongside the phone calls

### 6. Escalation / Transfer Demo (3 min)

**Say:** "Now let me show you what happens when the AI reaches its limits."

**Scenario A — Auth failure (can't provide Member ID):**
1. Start a call
2. Give NPI and zip, then refuse to provide any member PHI
3. AI attempts fallback (SSN, address), then transfers gracefully
4. Show the escalation in the dashboard with reason: "Auth Failed"

**Scenario B — Caller frustration:**
1. Start a new call
2. Authenticate fully
3. Give a patient name NOT in the system
4. When AI says it can't find the patient, say: "I already told you the name. This is ridiculous."
5. AI detects frustration → immediately offers human transfer

**After the calls:**
- Click the **Escalations** tab — all transferred calls with reason categories
- Click into any escalated call for full transcript, transfer reason, and extracted data

### 7. Dashboard Deep Dive (3 min)

- Show the **Call Log** — all calls with source indicator (Phone vs In-Browser)
- Filter by intent, outcome, or search by provider
- Click into a call: transcript, extracted data, tags
- Show the **Escalations** tab with transfer reasons
- Show flag feature and tag management

---

## Backup Plan

If Bland AI has issues during the live demo:
1. Show the pre-recorded test calls in the dashboard
2. Walk through transcripts to demonstrate conversation flow
3. Use the **Live Agent** (ElevenLabs) tab as an alternative live demo
4. Play any available call recordings from the dashboard
5. Show the **Escalations** tab with pre-seeded escalation data

## Key Differentiators

1. **3-factor PHI verification**: HIPAA-grade authentication matching Reflect Health's security requirements
2. **No claim number needed**: Searches by member ID + date of service + billed amount — the way providers actually work
3. **Clean PA routing**: Prior auth goes straight to the right team — no lookups, no dead ends
4. **Natural conversation, not IVR**: Providers just talk naturally
5. **Real data integration**: Pulls from your actual data structure — not a scripted demo
6. **Instant visibility**: Every call logged in real time — no waiting for reports
7. **Smart escalation**: AI knows its limits, detects frustration, transfers gracefully
8. **Multi-channel**: Same AI available over phone (Bland) and in-browser (ElevenLabs)
