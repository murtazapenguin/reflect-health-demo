# Demo Script — February 26 Presentation

## Pre-Demo Checklist

- [ ] Backend running (`uvicorn app.main:app --reload`)
- [ ] MongoDB running with seeded data
- [ ] Frontend running (`npm run dev`)
- [ ] Ngrok tunnel active, URL configured in Bland custom tools
- [ ] Bland pathway tested with at least 1 test call
- [ ] Demo phone ready (separate from presentation device)
- [ ] Dashboard open in browser, logged in

## Demo Data for Live Calls

**Provider credentials (for authentication):**
- NPI: `1234567890`
- Name: Dr. Sarah Chen
- Zip code: `90210`

**Patient for eligibility check:**
- Name: John Smith
- DOB: March 4, 1982
- Status: Active, Reflect Gold PPO
- Expected response: $20 copay, $1,500 deductible ($420 met)

**Claim for paid claim check:**
- Claim number: CLM-00481922
- Patient: John Smith
- Status: Paid, $570 of $850 billed
- Check: CHK-0018472

**Claim for denied claim check:**
- Claim number: CLM-00519833
- Patient: John Smith
- Status: Denied, CO-97 (not covered by plan)
- Appeal deadline: July 24, 2026

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

**Say:** "Now let me show you what happens when a provider actually calls in. I'm going to call the AI right now."

**On the phone (speaker):**
1. Call the Bland inbound number
2. AI answers: "Thank you for calling Reflect Health..."
3. Say: "I need to check if a patient has coverage"
4. AI asks for NPI → Say: "1234567890"
5. AI asks for zip → Say: "90210"
6. AI confirms: "Dr. Chen" → confirms
7. AI asks for patient info → Say: "John Smith, born March 4th, 1982"
8. AI confirms the data and delivers eligibility info

**After the call, switch to dashboard:**
- Refresh the call log
- Show the new call appearing
- Click into it: show transcript, extracted data, tags
- "Every call is logged automatically with a full transcript, all the data that was looked up, and tags for categorization"

### 3. Live Claims Call (3 min)

**On the phone:**
1. Call the Bland inbound number again
2. Say: "I need to check on a claim"
3. Authenticate with same NPI + zip
4. Say: "John Smith, March 4th 1982"
5. Provide claim number: "CLM-00481922"
6. AI delivers payment details

**Key point:** "Notice the AI correctly pulled the exact payment amount, check number, and processing date — all from your data."

### 4. Transfer Demo (2 min)

**On the phone:**
1. Call the inbound number one more time
2. Say: "I need to submit a prior authorization"
3. AI recognizes this is out of scope and offers to transfer
4. Call transfers to a human (or rings out in demo)

**Key point:** "For anything outside eligibility and claims — like prior auth — the AI doesn't guess. It immediately offers a warm transfer with full context."

### 5. Dashboard Deep Dive (3 min)

- Show the call log with all three calls now visible
- Filter by intent: show only eligibility calls
- Filter by outcome: show only transferred calls
- "Your ops team can use this to identify training opportunities, audit AI accuracy, and track performance in real time"
- Show the flag feature: "If a supervisor spots something concerning, they can flag it for review"
- Show tags: "Calls are automatically tagged, and your team can add custom tags"

### 6. ROI Summary (2 min)

- "Based on the $600K addressable call center cost and the 65%+ deflection rate we're seeing..."
- "At $5K/month, that's $380K in projected annual savings — a 63% ROI"
- "And this is Phase 1. Phase 2 opens the door to AI-assisted claims adjudication"

---

## Backup Plan

If Bland AI has issues during the live demo:
1. Show the pre-recorded test calls in the dashboard
2. Walk through the transcripts to demonstrate the conversation flow
3. Explain: "We've pre-tested this extensively — here are recordings from our test runs"
4. Play any available call recordings from the dashboard

## Key Differentiators to Emphasize

1. **Natural conversation, not IVR**: "Notice there's no 'press 1 for eligibility' — the provider just talks naturally"
2. **Real data integration**: "This isn't a scripted demo — it's pulling from your actual data structure"
3. **Instant visibility**: "Every call is logged in real time — no waiting for reports"
4. **Smart escalation**: "The AI knows its limits and transfers gracefully"
5. **Speed**: "Average call under 90 seconds vs. 4-5 minutes with a human agent"
