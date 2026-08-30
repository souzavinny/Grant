---
id: index
title: Grant — hire AI agents with permissions, not passwords
slug: /
---

# Grant — hire AI agents with *permissions*, not passwords

**Grant lets people safely delegate real tasks to AI agents.** Instead of handing an agent your passwords, cards, or
API keys, you grant it a **private, revocable credential** on the Midnight network — enforced by zero-knowledge
cryptography, not promises.

*Documentation for the Midnight Buildathon 2026.*

## Executive summary

2025 shipped the payment rails for the agent economy — Visa Intelligent Commerce, Mastercard Agent Pay, Google's AP2,
Stripe/OpenAI's checkout protocol. None of them has a privacy layer: authorizing an agent today means revealing who
you are and everything you allow it to do. Grant closes that gap with the most familiar trust gesture in computing:
an app-style **permission sheet**. Tapping *Allow* issues the agent a scoped credential (spend cap, action
categories, expiry). Every task the agent performs is a zero-knowledge proof that the action was inside those limits,
leaving a verifiable public receipt. Anything outside the limits is blocked *before it happens* — no valid proof can
exist for an action you never allowed. One tap fires the agent: its credential is revoked on-chain, everywhere,
forever.

## Two layers, one product

We deliberately built this as **infrastructure plus an app on top**, because each solves a different problem:

| Layer | What it is | Why it exists |
|---|---|---|
| **AgentPass** (infrastructure) | Private delegation credentials on Midnight: a Compact smart contract (issue / prove-authorized / revoke), a TypeScript API, and verification tooling | The credential rails are reusable by *any* agent platform — the "Know Your Agent" layer the 2025 payment rails are missing. Infrastructure is what the ecosystem adopts. |
| **Grant** (application) | A consumer dApp: agent directory, permission sheets, dashboard, receipts — connected to the user's own Midnight wallet | Infrastructure alone doesn't recruit users. Networks grow through apps people understand in one screen. Grant is the proof that the rails carry a real product. |

See [System architecture](architecture/system-architecture.md) for the full rationale.

## The problem

- **Delegation today is all-or-nothing.** Letting an agent shop, book, or manage subscriptions means giving it
  credentials with total access, no limits, and no undo.
- **The new agent-payment rails identify you.** AP2 mandates are signed credentials shared with merchants;
  virtual-card flows tie every action to your identity.
- **Trust in third-party agents has no substrate.** Reviews can be written by anyone; there is no verifiable track
  record for an agent's behavior.

## The solution

- **Permission sheets → credentials.** The grant is capped, scoped, expiring, and revocable — issued by the user's
  own wallet.
- **Proof-time enforcement.** Limits are checked inside a ZK circuit; out-of-scope actions cannot produce a proof and
  therefore cannot execute.
- **Receipts, not reviews.** Every task posts a pseudonymous, verifiable receipt — an agent's track record becomes
  math anyone can check.
- **The grantor stays anonymous.** Merchants and agents see valid authorization, never the human behind it.

## Midnight integration

Grant is native to Midnight's core capability — *prove facts, not data*. Mandate terms live on the user's device; the
chain holds only hiding commitments, pseudonymous ids, spend totals, receipts, and revocations. The contract compiles
with the official Compact toolchain, all three proof circuits are accepted by the network's PLONK checker, and the
full protocol runs end-to-end on a local devnet with real proofs. Details in
[Why Midnight](midnight/overview.md) and [Advanced integration & verification](midnight/advanced-integration.md).

## Core features (working today)

- Agent directory with category filters, search, permission manifests, and receipt-backed track records
- OS-style permission sheet with a user-editable spending cap
- Bring-your-own-wallet: any Midnight DApp-connector wallet (Lace, Gero, 1AM) signs every credential
- Browse without a wallet; connect-on-demand resumes your hire exactly where it paused; sessions persist locally
- Live dashboard: spend rings, receipts, **Test the limits** (watch a forbidden action die at proof time), one-tap Fire
- Receipt anatomy view: exactly what the world sees — and what is deliberately absent
- Walletless demo mode, an engineer console, two scripted e2e suites, a one-command devnet and faucet — all sharing
  the same contract

:::tip Verification status
15 adversarial contract tests · witness pipeline **Confirmed** with Midnight's official verify tooling · all 3
circuits **PLONK-accepted** (with a tamper negative-control rejected) · two scripted end-to-end suites green on a
live devnet · full wallet flow exercised with a real 1AM wallet.
:::

## Where to go next

- New to the project? Start with the [value proposition](overview/value-proposition.md) and the
  [user journey](ux/user-journey.md).
- Evaluating the market? [Market analysis](overview/market-analysis.md) and the
  [business model](business/revenue-model.md).
- Technical reviewer? [Architecture](architecture/system-architecture.md),
  [contracts](architecture/smart-contracts.md), and [security](architecture/security.md).
