---
title: Revenue model
---

# Revenue model

Grant monetizes the **transaction of trust**, not the movement of money. Every revenue line below charges the party
who gains the most from a credential existing — and none of them requires a token.

## Revenue lines, in rollout order

| # | Line | Who pays | Mechanism | When |
|---|---|---|---|---|
| 1 | **Verification API** | Merchants & platforms | Metered receipt-verification calls ("was this action authorized by a live mandate?") — free tier, then per-call pricing like any infra API | Wave 3 → post-hackathon |
| 2 | **Agent listing & certification** | Agent builders | Free to list; paid tier for certified listings (manifest review, staked good behavior, priority placement) | Wave 2 SDK → Wave 3 |
| 3 | **Authorization fee** | Agents (passed into their service pricing) | Basis-point fee on authorized amounts at the moment of proof — the "interchange of the agent economy" | Post-hackathon, with settlement |
| 4 | **Enterprise delegation** | Companies deploying internal agent fleets | Seat/volume licensing of the credential rails (issue, monitor, revoke at org scale, compliance exports) | Post-hackathon |

## Why these are the right lines

**The verification API is the wedge.** Merchants are the party with a compliance budget and a fraud problem today;
"prove this bot was authorized, learn nothing else" is a line item they already know how to buy (they buy fraud
scoring the same way). It monetizes reads, which cost us nearly nothing.

**Certification converts trust into margin.** Receipts make an agent's track record verifiable for free — but
*placement* next to that record is scarce. Builders pay for distribution in every marketplace ever built; here the
thing being ranked is provable conduct, not ad spend, which keeps the ranking honest and defensible.

**The authorization fee scales with the economy we enable.** At maturity, a few basis points on agent-authorized
commerce is the same shape as card interchange — and analysts size agent-mediated commerce in the hundreds of
billions by 2030 (see [market analysis](../overview/market-analysis.md)). We take this fee only once settlement
rides our receipts, because charging for authorization before enabling payment would tax the demo, not the value.

## What we will not do

No token, no yield, no fee on user funds, no selling of behavioral data — the last one being structurally impossible
by design, since the interesting data (caps, scopes, identities) never exists anywhere we could sell it. Privacy is
the product; the revenue model is designed so we are never tempted to un-build it.
