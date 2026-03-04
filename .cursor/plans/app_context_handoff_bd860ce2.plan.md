---
name: App Context Handoff
overview: A comprehensive context document about the Reflect Health Demo app, covering architecture, tech stack, features, integrations, deployment, data models, and current state — designed to be passed to a new chat session.
todos: []
isProject: false
---

# Reflect Health Demo — Full App Context

## What This App Is

A healthcare AI call deflection demo for **Reflect Health** (by Penguin AI). It demonstrates how an AI voice agent can handle inbound provider/member calls for **eligibility verification**, **claims status**, and **prior authorization lookups** — deflecting calls that would otherwise go to human agents. The demo includes a rich command center dashboard showing real-time metrics, call logs, transcripts, escalation tracking, and ROI modeling.

---

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui (Radix), React Router v6, TanStack React Query, Recharts
- **Backend**: Python FastAPI, Beanie ODM (MongoDB), PyJWT, httpx, Loguru
- **Database**: MongoDB (hosted on Railway or local)
- **Voice AI**:
  - **Bland AI** — phone-based inbound call deflection (provider calls a real number)
  - **ElevenLabs Conversational AI** — in-browser voice agent (talks directly in the dashboard via `@elevenlabs/react` SDK)
- **Deployment**: Frontend on **Vercel**, Backend on **Railway** (Docker/Procfile)

---

## Repository Structure

```
reflect_health_demo/
├── frontend/                     # React SPA (Vite)
│   ├── src/
│   │   ├── App.tsx               # Routes: /login, /, /calls, /calls/:callId
│   │   ├── pages/                # Login, Index (dashboard), CallLog, CallDetail
│   │   ├── components/dashboard/ # ~38 components + embedded/ + opyn/ subdirs
│   │   ├── contexts/             # DashboardContext, SimulationContext, AudioEngineContext
│   │   ├── hooks/use-api.ts      # React Query hooks for all API calls
│   │   └── lib/api.ts            # API client (all endpoint definitions)
│   ├── .env                      # VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
│   └── vercel.json               # SPA rewrites
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app, route registration, lifespan
│   │   ├── config.py             # Settings (env vars via pydantic-settings)
│   │   ├── database.py           # MongoDB/Beanie init
│   │   ├── models/               # 6 Beanie models (see below)
│   │   └── modules/
│   │       ├── auth/             # JWT login, /me endpoint
│   │       ├── admin/            # Reseed endpoint
│   │       ├── dashboard/        # KPIs, call log, call detail, tags, flags
│   │       ├── voice/            # NPI auth, zip verify, eligibility, claims, prior auth
│   │       ├── elevenlabs/       # Signed URL, config, save-conversation
│   │       ├── webhooks/         # Bland AI webhook handler
│   │       └── health/           # Health check
│   ├── seed_data.py              # Populates DB with demo data
│   ├── Dockerfile                # Python 3.11-slim, uvicorn
│   ├── Procfile                  # Railway/Heroku web process
│   └── requirements.txt          # FastAPI, Beanie, httpx, PyJWT, etc.
├── bland/                        # Documentation for voice AI setup
│   ├── elevenlabs-setup.md       # Full ElevenLabs agent config guide + system prompt
│   ├── demo-script.md            # Live demo script with test scenarios
│   ├── pathway-design.md         # Bland AI pathway design
│   └── custom-tools.json         # Bland AI custom tool definitions
└── reflecthealth-command-center-main/  # Colleague's original frontend (reference only)
```

---

## Backend API Routes

All prefixed with `/api/v1`:

- **Auth**: `POST /auth/login`, `GET /auth/me`
- **Dashboard**: `GET /dashboard/calls`, `GET /dashboard/calls/{id}`, `PATCH .../tags`, `PATCH .../flag`, `GET /dashboard/kpis`, `GET /dashboard/kpis/trend`
- **Voice** (used by Bland AI and ElevenLabs tools):
  - `POST /voice/authenticate-npi`
  - `POST /voice/verify-zip`
  - `POST /voice/eligibility` (supports `service_type` param)
  - `POST /voice/claims`
  - `POST /voice/prior-auth`
- **ElevenLabs**: `GET /elevenlabs/token`, `GET /elevenlabs/config`, `POST /elevenlabs/save-conversation`
- **Admin**: `POST /admin/reseed` (re-populates DB with seed data)
- **Webhooks**: `POST /webhooks/bland` (Bland AI call completion webhook)

---

## Data Models (MongoDB via Beanie)

1. **Provider** — `npi` (unique), name, practice_name, zip_code, zip_codes[], specialty, cms_sourced
2. **Member** — `member_id` (unique), first/last name, dob, plan_name, status, copays, deductibles, OOP, `benefits: Dict[str, ServiceBenefit]` (per-service coverage details)
3. **Claim** — `claim_number` (unique), member_id, provider_npi, status (paid/denied/pending), amounts, denial info
4. **PriorAuth** — `pa_id` (unique), member_id, provider_npi, status (approved/denied/pending_review/in_review/expired), urgency, dates
5. **CallRecord** — `call_id` (unique), phone_from/to, timestamps, duration, intent, outcome, provider/patient info, transcript[], tags[], flagged, transferred, transfer_reason, `source` (bland/elevenlabs), auth_success, extracted_data{}
6. **User** — email, display_name, hashed_password, roles

---

## Seed Data

The `seed_data.py` script populates:

- 1 admin user (admin/admin123)
- 10 providers (4 with real CMS-verified NPIs, 6 demo)
- 25 members across 3 plan types (Gold PPO, Silver HMO, Platinum PPO) with per-service benefits
- 40 claims (paid/denied/pending)
- 12 prior authorizations
- 50 historical call records (mix of resolved/transferred, bland/elevenlabs sources)

Key test provider: **Dr. Jasleen Sohal** — NPI `1003045220`, zip `94597` (also `95148`, `94598`)

Reseed via: `POST /api/v1/admin/reseed`

---

## Frontend Dashboard

### Deployment Modes (toggled in header)

- **White-Label** — Standard Reflect Health dashboard (default)
- **Five9 Voice** — Embedded Five9-style contact center UI with live call simulation (browser Speech Synthesis for TTS)
- **Opyn Health** — Alternative health plan layout

### Dashboard Tabs (white-label mode)

1. **Contact** (Intake & Identity) — Live event feed, pipeline stages, identity verification
2. **Claims** (Claims & Coverage) — Claims queue, adjudication simulation
3. **Network** (Network & Connectivity) — Network optimization events
4. **ROI** (Financial Impact) — ROI modeling and cost simulation
5. **Intelligence** (Call Intelligence) — Batch analysis, call recordings
6. **Live Agent** — In-browser ElevenLabs voice conversation with the AI agent
7. **Escalations** — Queue of calls transferred to human agents (frustration / auth failed / out of scope)

### Other Pages

- **Call Log** (`/calls`) — Paginated, filterable list of all calls with source badges (Phone/Browser)
- **Call Detail** (`/calls/:id`) — Full transcript, extracted data, auth status, tags, escalation details

---

## Voice AI Integration

### Bland AI (Phone)

- Provider calls a real phone number
- Bland AI pathway handles: NPI auth → zip verify → intent classification → data lookup
- Custom tools (webhooks) call the backend `/voice/*` endpoints
- On call completion, Bland sends a webhook to `/webhooks/bland` which creates a CallRecord

### ElevenLabs (In-Browser)

- User clicks "Start Conversation" in the Live Agent tab
- Frontend gets a signed URL via `GET /elevenlabs/token`
- Uses `@elevenlabs/react` SDK `useConversation` hook for WebSocket connection
- Agent has server-side tools (same `/voice/*` endpoints) configured in the ElevenLabs dashboard
- On call end, frontend sends transcript to `POST /elevenlabs/save-conversation`
- Backend fetches full conversation details from ElevenLabs API (tool call data), extracts provider/patient names, intent, outcome, auth status, and creates a CallRecord
- System prompt and tool config are documented in `bland/elevenlabs-setup.md`

### Call Record Processing (ElevenLabs save endpoint)

- Fetches conversation details from ElevenLabs API (up to 6 retries)
- Parses tool_call/tool_result entries for extracted data (NPI, provider name, patient name, etc.)
- Falls back to regex extraction from agent speech if tool calls not parsed
- Determines: intent (eligibility/claims/prior_auth), outcome (resolved/transferred/not_found), auth_success, transfer_reason
- Overrides `call_successful` based on own outcome determination (ElevenLabs analysis field is unreliable)

---

## Five9 Simulation (Embedded Mode)

- `LiveCallSimulation.tsx` runs scripted call scenarios with browser Speech Synthesis
- Different voices for caller (male) vs AI agent (female)
- Supports edge cases: wrong NPI, invalid member ID, DOB mismatch, claim not found, API timeout
- Phase progression visualized in `Five9AgentPanel`, `Five9TranscriptPanel`, `Five9AIPanel`
- Audio controls: LIVE/OFF toggle, Audio/Muted toggle, playback speed, confidence threshold
- Digit strings (NPIs, member IDs) are spelled out individually for natural speech
- `SimulationContext.tsx` generates background event feeds for all tabs (contact, claims, network, ROI)

---

## Environment Variables

### Backend (Railway)

- `MONGODB_URL` — MongoDB connection string
- `SECRET_KEY` / `JWT_SECRET_KEY` — App and JWT signing secrets
- `ELEVENLABS_API_KEY` — ElevenLabs API key
- `ELEVENLABS_AGENT_ID` — ElevenLabs agent UUID
- `BLAND_WEBHOOK_SECRET` — Bland AI webhook verification
- `PORT` — Railway sets this (default 8000)

### Frontend (Vercel)

- `VITE_API_BASE` — Backend URL (e.g., `https://reflect-health-demo-production.up.railway.app/api/v1`)
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — Legacy from colleague's demo (Supabase TTS replaced with browser Speech Synthesis)

---

## Known Decisions and Quirks

- **Auto-end removed**: The ElevenLabs voice agent no longer auto-ends calls. The user must click the End button. This was removed because auto-detection of goodbye/transfer phrases was unreliable and cut off the agent mid-sentence.
- **Fallback name extraction**: If ElevenLabs tool call data isn't parsed (format mismatch), provider/patient names are extracted via regex from the agent's spoken transcript.
- **call_successful override**: The `analysis.call_successful` field from ElevenLabs API is unreliable. The backend overrides it: resolved calls are marked successful.
- **auth_success inference**: If tool data doesn't explicitly say auth succeeded, auth is inferred from the agent delivering lookup results (auth is required before any lookup in the agent flow).
- **Browser Speech Synthesis**: The Five9 simulation uses the Web Speech API instead of ElevenLabs TTS (the original Supabase edge function wasn't working). Digits are pre-processed to be spoken individually.
- **Muted pacing**: When audio is muted in Five9 mode, delays are estimated from word count (~2.5 words/sec) to maintain realistic pacing.

