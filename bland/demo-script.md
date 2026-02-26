# Demo Script — February 26 Presentation

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

## Test Scenarios

### SCENARIO 1 — Eligibility: Happy Path (Active Member)
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Patient:** John Smith — DOB: March 4, 1982
**Expected Result:**
- Status: **Active** on Reflect Gold PPO
- Copay: $20 PCP / $50 specialist
- Deductible: $1,500 ($420 met)
- OOP Max: $6,000 ($1,200 met)

### SCENARIO 2 — Eligibility: Service-Specific (MRI)
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Patient:** John Smith — DOB: March 4, 1982
**Service:** "MRI"
**Expected Result:**
- MRI: **Covered**, $150 copay, **no prior auth required** (Gold PPO)

### SCENARIO 3 — Eligibility: Service Requiring Prior Auth (HMO)
**Provider:** Dr. Kali Tileston — NPI `1003045683`, Zip `95128` or `95148`
**Patient:** Mary Johnson — DOB: August 15, 1975
**Service:** "physical therapy"
**Expected Result:**
- Physical Therapy: **Covered**, $50 copay, **prior auth required**, 20 visits/year (Silver HMO)

### SCENARIO 4 — Eligibility: Termed Member (Edge Case)
**Provider:** Dr. Kyle Edmonds — NPI `1003044728`, Zip `92103`
**Patient:** Linda Garcia — DOB: September 8, 1980
**Expected Result:**
- Status: **Termed** — term date Dec 31, 2025
- Agent should inform provider the member's coverage has ended

### SCENARIO 5 — Eligibility: Inactive Member (Edge Case)
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Patient:** David Miller — DOB: April 18, 1972
**Expected Result:**
- Status: **Inactive** — term date June 30, 2025

### SCENARIO 6 — Eligibility: Service Not Covered (Edge Case)
**Provider:** Dr. Kali Tileston — NPI `1003045683`, Zip `95148`
**Patient:** Mary Johnson — DOB: August 15, 1975
**Service:** "chiropractic"
**Expected Result:**
- Chiropractic: **Not covered** under Silver HMO plan

### SCENARIO 7 — Eligibility: Member Near OOP Max
**Provider:** Dr. Ardalan Enkeshafi — NPI `1003000126`, Zip `20032`
**Patient:** Patricia Brown — DOB: May 30, 1968
**Expected Result:**
- Status: **Active** on Reflect Platinum PPO
- OOP Max: $4,000 ($2,800 met — only $1,200 remaining)
- Deductible: fully met

---

### SCENARIO 8 — Claims: Paid Claim
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Patient:** John Smith
**Claim #:** `CLM-00481922`
**Expected Result:**
- Status: **Paid**
- Billed: $850 → Allowed: $620 → Paid: $570
- Check: CHK-0018472, processed Dec 1, 2025

### SCENARIO 9 — Claims: Denied Claim
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Patient:** John Smith
**Claim #:** `CLM-00519833`
**Expected Result:**
- Status: **Denied**, code CO-97
- Reason: "Payment adjusted — service not covered by this plan benefit"
- Appeal deadline: July 24, 2026

### SCENARIO 10 — Claims: Pending Claim
**Provider:** Dr. Kali Tileston — NPI `1003045683`, Zip `95128`
**Patient:** Robert Williams
**Claim #:** `CLM-00520200`
**Expected Result:**
- Status: **Pending** — joint injection, received Jan 23, 2026
- No payment info yet

### SCENARIO 11 — Claims: Paid Surgical Claim
**Provider:** Dr. Kali Tileston — NPI `1003045683`, Zip `95148`
**Patient:** Mary Johnson
**Claim #:** `CLM-00520100`
**Expected Result:**
- Status: **Paid** — total knee replacement
- Billed: $42,000 → Paid: $30,500
- Check: CHK-0019200

### SCENARIO 12 — Claims: Denied Claim (Different Provider)
**Provider:** Dr. Kyle Edmonds — NPI `1003044728`, Zip `92103`
**Patient:** Michael Jones
**Claim #:** `CLM-00520400`
**Expected Result:**
- Status: **Denied**, code CO-11
- Reason: "Diagnosis inconsistent with procedure"
- Appeal deadline: Aug 17, 2026

### SCENARIO 13 — Claims: Claim Not Found (Edge Case)
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Claim #:** `CLM-99999999`
**Expected Result:**
- "No claim found" — agent should offer to search by patient name/DOS

---

### SCENARIO 14 — Prior Auth: Approved
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**PA ID:** `PA-00012345`
**Expected Result:**
- Status: **Approved**
- Patient: John Smith (MBR-001234)
- Service: MRI Lumbar Spine (CPT 72148)
- Approved for 1 procedure, expires July 18, 2026

### SCENARIO 15 — Prior Auth: Denied
**Provider:** Dr. Kali Tileston — NPI `1003045683`, Zip `95128`
**PA ID:** `PA-00012400`
**Expected Result:**
- Status: **Denied**
- Patient: John Smith
- Service: Knee Arthroscopy
- Reason: "Medical necessity not met — conservative treatment not exhausted"
- Notes: Recommend 6 weeks PT before resubmission

### SCENARIO 16 — Prior Auth: Pending Review
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**PA ID:** `PA-00012500`
**Expected Result:**
- Status: **Pending Review**
- Service: Physical Therapy (12 visits)

### SCENARIO 17 — Prior Auth: Lookup by Member ID
**Provider:** Dr. Kali Tileston — NPI `1003045683`, Zip `95148`
**Member ID:** `MBR-001235`
**Expected Result:**
- Returns most recent PA for Mary Johnson
- PA-00012510: Total Knee Replacement — **Approved**

### SCENARIO 18 — Prior Auth: Denied (Different Provider)
**Provider:** Dr. Ardalan Enkeshafi — NPI `1003000126`, Zip `20032`
**PA ID:** `PA-00012540`
**Expected Result:**
- Status: **Denied**
- Service: Inpatient Admission — Pneumonia
- Reason: "Does not meet inpatient criteria — recommend observation status"

### SCENARIO 19 — Prior Auth: Expired (Edge Case)
**Provider:** Any authenticated provider
**PA ID:** `PA-00012900`
**Expected Result:**
- Status: **Expired**
- Service: Cardiac Stress Test
- Note: "Authorization expired — procedure was not completed within window"

---

### SCENARIO 20 — Auth Failure: Wrong Zip Code (Edge Case)
**Provider:** NPI `1003045220`, Zip `90210` (wrong zip for Dr. Sohal)
**Expected Result:**
- Zip verification **fails**
- Agent should ask to re-enter or offer transfer

### SCENARIO 21 — Auth Failure: Invalid NPI (Edge Case)
**Provider:** NPI `0000000000`
**Expected Result:**
- NPI not found in local DB or CMS
- Agent should ask to re-enter

### SCENARIO 22 — Transfer: Out-of-Scope Request
**Action:** Say "I need to submit a new prior authorization"
**Expected Result:**
- Agent recognizes this is a submission (not a status check)
- Offers to transfer to a human representative

### SCENARIO 23 — Patient Not Found (Edge Case)
**Provider:** Dr. Jasleen Sohal — NPI `1003045220`, Zip `94597`
**Patient:** "Jane Doe, DOB January 1, 2000"
**Expected Result:**
- No member found
- Agent should ask to verify spelling/information

---

## Demo Flow (15-20 minutes)

### 1. Dashboard Overview (3 min)

**Talking points:**
- "This is the Reflect Health AI Operations Center — the real-time command center for your voice AI program."
- Walk through the KPI cards: deflection rate, avg handle time, transfer rate, auth success rate
- Show the call volume trend chart: "You can see call patterns over the last 30 days"
- Show the intent/outcome breakdown: "Most calls are eligibility and claims, which is exactly what we automate"
- Click into a historical call to show the detail view briefly

### 2. Live Eligibility Call (4 min)

**Say:** "Now let me show you what happens when a provider actually calls in."

**On the phone (speaker):**
1. Call the Bland inbound number
2. AI answers: "Thank you for calling Reflect Health..."
3. Say: "I need to check if a patient has coverage"
4. AI asks for NPI → Say: "1003045220"
5. AI asks for zip → Say: "94597"
6. AI confirms: "Dr. Sohal" → confirms
7. AI asks for patient info → Say: "John Smith, born March 4th, 1982"
8. AI asks for service type → Say: "primary care" (or "MRI", "physical therapy")
9. AI delivers eligibility info with service-specific coverage

**After the call, switch to dashboard:**
- Refresh the call log — show the new call appearing
- Click into it: transcript, extracted data, tags
- "Every call is logged automatically with full transcript, all data looked up, and tags"

### 3. Live Claims Call (3 min)

**On the phone:**
1. Call the Bland inbound number again
2. Say: "I need to check on a claim"
3. Authenticate with NPI "1003045220" + zip "94597"
4. Say: "John Smith, March 4th 1982"
5. Claim number: "CLM-00481922"
6. AI delivers payment details

### 4. Live Prior Auth Call (3 min)

**On the phone:**
1. Call the Bland inbound number again
2. Say: "I need to check on a prior authorization"
3. Authenticate with NPI "1003045220" + zip "94597"
4. PA ID: "PA-00012345"
5. AI delivers: Approved, MRI Lumbar Spine, expires July 18 2026

### 5. In-Browser Agent Demo (3 min)

**Say:** "We can also embed this directly in your platform. Let me show you the same experience — right in the browser."

1. Click **Live Agent** tab
2. Click **Start Conversation**
3. Run the same eligibility scenario (Scenario 1) via voice in the browser
4. Show transcript updating in real time
5. End the call — show it appears in the Call Log alongside the phone calls

### 6. Escalation / Transfer Demo (3 min)

**Say:** "Now let me show you what happens when the AI reaches its limits — or when a caller gets frustrated."

**Scenario A — Out-of-scope request:**
1. Call the inbound number (or use Live Agent in-browser)
2. Say: "I need to submit a brand new prior authorization"
3. AI recognizes it cannot create new PAs and offers transfer to human
4. End the call

**Scenario B — Caller frustration:**
1. Start a new call
2. Authenticate with NPI "1003045220" + zip "94597"
3. When asked for patient info, give a name NOT in the system: "Jane Doe, May 5th, 1990"
4. When the AI says it can't find the patient, express frustration: "I already told you the name. This is ridiculous."
5. AI detects frustration → immediately offers human transfer

**Scenario C — Auth failure:**
1. Start a new call
2. Give an invalid NPI: "9999999999"
3. When the AI says it's invalid, push back: "That's my NPI, I don't know why it's not working"
4. AI offers to transfer to a human agent

**After the calls, switch to the dashboard:**
- Click the **Escalations** tab — all transferred calls appear in a queue
- Show the reason categories: Frustration, Auth Failed, Out of Scope
- Click into any escalated call to see full transcript, transfer reason, and extracted data
- "Your supervisors see every escalation in real time with full context for the handoff"

### 7. Dashboard Deep Dive (3 min)

- Show the **Call Log** — all calls with source indicator (Phone vs In-Browser)
- Filter by intent, outcome, or search by provider
- Click into a call to see transcript, extracted data, and tags
- Show the **Escalations** tab — escalated calls with transfer reasons
- Show flag feature and tag management
- "Your ops team can audit AI accuracy, review escalations, and track performance in real time"

---

## Backup Plan

If Bland AI has issues during the live demo:
1. Show the pre-recorded test calls in the dashboard
2. Walk through transcripts to demonstrate conversation flow
3. Use the **Live Agent** (ElevenLabs) tab as an alternative live demo
4. Play any available call recordings from the dashboard
5. Show the **Escalations** tab with pre-seeded escalation data

## Key Differentiators

1. **Natural conversation, not IVR**: No "press 1 for eligibility" — providers just talk naturally
2. **Real data integration**: Pulls from your actual data structure — not a scripted demo
3. **Instant visibility**: Every call logged in real time — no waiting for reports
4. **Smart escalation**: AI knows its limits, detects frustration, and transfers gracefully
5. **Escalation audit trail**: Full transcript + context handed off to human agents
6. **Multi-channel**: Same AI available over phone (Bland) and in-browser (ElevenLabs)
7. **Speed**: Average call under 90 seconds vs. 4-5 minutes with a human agent
