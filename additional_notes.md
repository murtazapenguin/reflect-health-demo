# Requirements Changes — Reflect Health Client Call

These changes should be applied to the existing Reflect Health voice AI system (pathway design, backend, and seed data).

---

## 1. Remove Prior Authorization Workflow

The prior authorization workflow is no longer needed. Remove it entirely.

- Remove the prior auth intent routing from the Greeting node (`call_intent = 'prior_auth'`).
- Remove all PA-related pathway nodes: PA: Collect Info, PA: Lookup, PA: Approved, PA: Denied, PA: Pending, PA: Expired, PA: Not Found.
- Remove any PA-related backend routes, seed data, and demo scenarios.
- If a caller asks about prior authorization, **immediately transfer them** to `(800) 555-7284`.

---

## 2. Provider Verification (3 Factors)

When a **provider** calls, collect and verify **3 pieces of identifying information**:

1. **Name**
2. **DOB**
3. **Member ID**

**Fallback:** If the provider does not have the Member ID, accept **one** of the following as a substitute:
- SSN
- Address

If the provider cannot provide Name + DOB + (Member ID or a fallback), **transfer to a human agent**.

---

## 3. Member Verification (1 Factor)

When a **member** calls, collect and verify **1 piece of identifying information**:

- `Member ID`

If the member cannot provide this, **transfer to a human agent**.

---

## 4. Claims Lookup Without Claim ID

Callers will typically **not** have the claim ID. When the claim ID is unavailable, look up the claim using a combination of:

- Date of service
- Total billed amount
- Provider information
- Member ID

---

## Placeholders to Fill In

| Placeholder | Description |
|---|---|
| `(800) 555-7284` | The phone number to transfer prior auth callers to |
| `Member ID` | Which single piece of info is required for member verification |
