# Reflect Health Voice AI Call Deflection — Demo

AI-powered voice agent that handles inbound provider calls for eligibility verification and claims status, plus an admin dashboard for monitoring all call activity.

## Architecture

```
Provider Phone Call
        ↓
  Bland AI (Inbound Number)
  ├── Conversational Pathway (NLU-driven call flow)
  ├── Custom Tools → FastAPI Backend (mid-call data lookups)
  └── Post-Call Webhook → FastAPI Backend (call record ingestion)
        ↓
     MongoDB (providers, members, claims, call_records)
        ↓
  React Admin Dashboard (KPIs, call log, transcripts, tags)
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB (local or Atlas)
- Bland AI account (for voice agent)

### 1. Start MongoDB

```bash
# Using Docker:
docker run -d -p 27017:27017 --name mongodb mongo:7

# Or use MongoDB Atlas free tier
```

### 2. Backend Setup

```bash
cd backend
pip install -e ".[dev]"
# Seed the database with demo data
python -m seed_data
# Start the server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Dashboard available at http://localhost:5173
- Login: `admin@reflecthealth.com` / `demo2026`

### 4. Bland AI Setup

1. Create account at https://app.bland.ai
2. Purchase an inbound phone number
3. Create a Conversational Pathway using the design in `bland/pathway-design.md`
4. Configure custom tools using `bland/custom-tools.json` (replace `YOUR_BACKEND_URL`)
5. Set the post-call webhook URL to `{YOUR_BACKEND_URL}/api/v1/webhooks/bland/call-complete`

### 5. Expose Backend (for Bland webhooks)

If running locally, use ngrok to create a public URL:

```bash
ngrok http 8000
```

Update the Bland custom tools and webhook with the ngrok URL.

## Demo Credentials

| What | Value |
|------|-------|
| Dashboard login | `admin@reflecthealth.com` / `demo2026` |
| Demo provider NPI | `1234567890` |
| Demo provider zip | `90210` |
| Demo patient | John Smith, DOB 1982-03-04 |
| Paid claim | CLM-00481922 |
| Denied claim | CLM-00519833 |

## Project Structure

```
├── backend/          FastAPI backend (voice APIs, webhooks, dashboard APIs)
├── frontend/         React admin dashboard
├── bland/            Bland AI configuration (pathway design, custom tools, demo script)
└── README.md
```

## API Endpoints

### Voice APIs (called by Bland mid-call)
- `POST /api/v1/voice/authenticate-npi` — Validate provider NPI
- `POST /api/v1/voice/verify-zip` — Verify provider zip code
- `POST /api/v1/voice/eligibility` — Look up patient eligibility
- `POST /api/v1/voice/claims` — Look up claim status

### Webhook
- `POST /api/v1/webhooks/bland/call-complete` — Ingest post-call data

### Dashboard APIs
- `GET /api/v1/dashboard/calls` — Paginated call log with filters
- `GET /api/v1/dashboard/calls/{call_id}` — Call detail with transcript
- `GET /api/v1/dashboard/kpis` — Aggregated KPI metrics
- `GET /api/v1/dashboard/kpis/trend` — KPI trends over time
- `PATCH /api/v1/dashboard/calls/{call_id}/tags` — Update call tags
- `PATCH /api/v1/dashboard/calls/{call_id}/flag` — Flag call for review
