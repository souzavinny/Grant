---
title: Value proposition
---

# Value proposition and problems solved

## Core value proposition

**Delegation without surrender.** Grant turns "give the agent my password" into "grant the agent a permission":
capped, scoped, expiring, revocable, and cryptographically enforced, while the human stays anonymous.

## The problems Grant solves

### 1 · The all-or-nothing access problem

Today, an AI agent that shops or books for you needs your credentials: a card number, an account password, an API
key. Each of those is *total* access: the agent (and its operator, and anyone who compromises either) can do
everything you can do, for as long as the credential lives, with no built-in undo. The rational response is the one
most people choose: do not delegate at all.

### 2 · The identity-leak problem in agent payments

The 2025 agent-payment rails (Google AP2, Visa Intelligent Commerce, Mastercard Agent Pay, Stripe/OpenAI ACP) solved
settlement but not privacy: their mandates and tokens tie every agent action to an identified human. A merchant
receiving an AP2 cart mandate learns who you are; a processor accumulates your agent's entire behavioral trail.
"Know Your Agent" compliance is emerging with no privacy counterweight.

### 3 · The agent-trust problem

Hiring a third-party agent means trusting its developer's promises. App-store reviews are unverifiable; permission
prompts in Web2 are enforced by policy, not physics. There is no neutral substrate on which an agent can *prove* its
record or a user can bound its behavior.

## How Grant answers each

| Problem | Grant's mechanism | Guarantee class |
|---|---|---|
| All-or-nothing access | Scoped credential: spend cap (user-editable at grant time), action categories, expiry, one-tap revocation | Enforced in a zero-knowledge circuit: an out-of-scope action cannot produce a valid proof, so it cannot execute |
| Identity leakage | Pseudonymous mandate ids + hiding commitments; receipts disclose only action and amount | Cryptographic: the chain never holds the principal's identity, caps, scopes, or expiries |
| Agent trust | Receipts, not reviews: every completed task is a verifiable public record bound to the agent's credential | Publicly auditable by anyone, forgeable by no one |

## Why this is different in kind, not degree

Web2 permission systems (OAuth scopes, virtual cards, API-key restrictions) are **promises kept by the enforcing
company**: revocation is a support flow, scopes are checked by the same party that profits from ignoring them, and
every grant identifies you. Grant's permissions are **mathematical objects**: the limit is part of the proof the
agent must produce, revocation is a ledger fact no one can un-write, and the grantor is a pseudonym. The user-facing
gesture stays identical (a permission sheet and an Allow button), which is exactly the point: familiar UX, upgraded
guarantee.

:::info One-line pitch
App permissions are promises. Grant's permissions are proofs.
:::
