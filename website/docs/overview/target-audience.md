---
title: Target audience & use cases
---

# Target audience and use cases

Grant serves three audiences whose incentives interlock: people who want to delegate safely, developers who want
their agents to be trustable, and merchants who need to know an agent is authorized without doing KYC on its human.

## Primary audiences

### 1 · Consumers delegating to agents

Early adopters of assistant products who already ask software to shop, book, and manage recurring services — and
everyone who currently refuses to because the only option is handing over credentials. They don't know or care what
a zero-knowledge proof is; they know what a permission prompt is. Grant meets them at that gesture.

### 2 · Agent developers

Builders of task agents (subscription managers, fare watchers, procurement bots) whose biggest adoption blocker is
the trust question: *"why would I give your bot my card?"* Listing on Grant answers it structurally — the agent
requests a scoped credential instead of credentials, and its track record accrues as verifiable receipts. The
Wave-2 SDK makes listing a manifest file, not an integration project.

### 3 · Merchants and verifiers

Any checkout or API that wants to accept agent-initiated actions safely. Verification is a ledger lookup: the
receipt proves the action was authorized by a live, funded mandate — with no personal data to store, secure, or
leak, and no chargeback ambiguity about whether the human approved.

## Secondary audience (roadmap)

### Teams and enterprises

Departments issuing budgeted credentials to workplace agents — the Ramp/Brex virtual-card pattern applied to AI
assistants, with audit-ready receipts that don't expose internal budget structures to vendors. This is a Wave-3
surface; the credential mechanics it needs already exist.

## Use cases

| Use case | Grant primitive used | Status |
|---|---|---|
| Subscription management (renew/cancel under a monthly cap) | scope = subscribe, cap, expiry | Working demo (SubManager) |
| Travel booking within a budget window | scope = book + purchase, cap, expiry | Working demo (TravelBooker) |
| Recurring grocery restock | scope = purchase, weekly cap | Working demo (GroceryRunner) |
| Agent-to-merchant checkout ("paid by an authorized agent") | receipt verification | Verifier flow working; merchant SDK on roadmap |
| Bill negotiation / energy shifting / expense filing | same primitives, new manifests | Directory candidates via Wave-2 SDK |
| Department procurement agents with quarterly budgets | caps + receipts as audit trail | Wave 3 |
| Scoped one-time data disclosure (e.g. passenger name to an airline) | data-access category + selective disclosure | Wave 3 — Midnight-native |

## Who this is not for (yet)

High-frequency trading agents (proof latency), flows that legally require full KYC of the buyer at the merchant
(until the selective-disclosure grant ships), and fully autonomous agents with no human principal — Grant's model is
deliberately *human-anchored* delegation.
