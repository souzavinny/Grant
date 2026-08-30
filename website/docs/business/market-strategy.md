---
title: Market strategy
---

# Market strategy

The [market analysis](../overview/market-analysis.md) sizes the wave; this page says how Grant rides it: **enter
where trust is the whole purchase decision, expand along the rails everyone else is standing up.**

## Positioning

One sentence: *Grant is the permission layer of the agent economy — hire AI agents with cryptographic limits instead
of your passwords and cards.* We position against the two incumbent answers:

- **Against "just store the credentials" (OAuth tokens, saved cards, password vaults):** those grant *identity*,
  not *limits* — an agent with your card can spend anything; an agent with a mandate can spend $30 on subscriptions
  until October, provably.
- **Against the payment-rail mandates (Google AP2, Visa, Mastercard, Stripe/OpenAI ACP):** those are policy
  enforced by the platform, visible to the platform, and confined to that platform. Ours is math, private, and
  rail-agnostic — which is why the honest strategy is to *bridge* to them (an AgentPass receipt as the
  authorization evidence inside an AP2-style flow), not to fight them.

## Beachhead: subscription management

The first vertical is deliberately small-stakes and high-frequency: agents that manage subscriptions (cancel, renew,
switch). Losses are capped at tens of dollars, the pain is universal, the action category maps cleanly to one scope
bit, and success is felt monthly. It is the vertical where "cap + scope + fire" is obviously sufficient trust — no
settlement integration required to be useful, because the receipt is the deliverable. Travel booking and grocery
running follow the same playbook at higher caps.

## Expansion sequence

1. **Consumers × low-stakes agents** (now — the Grant app): prove the trust gesture works.
2. **Agent builders** (Wave 2 — listing SDK): each builder who lists brings their own users; the directory becomes
   two-sided.
3. **Merchants/platforms** (Wave 3 — verification API): monetize reads; a merchant accepting "receipt-authorized"
   agents makes every listed agent more useful.
4. **Rail bridges and enterprise** (post-hackathon): AP2/ACP interop and internal agent fleets, where private
   delegation with audit receipts is a compliance feature, not a luxury.

## Why within-Midnight competition doesn't worry us — and the real risk that does

Within the Midnight ecosystem, identity projects cluster around *credentials about people* (age, KYC). AgentPass is
credentials *about authority* — complementary, not competitive (an agent proving "my principal is KYC-verified" is
an integration, and a good one). The real risk is horizontal: a platform mandate standard becoming "good enough"
before privacy becomes a purchase criterion. Our hedge is the bridge strategy plus the regulatory tailwind — eIDAS
2.0's push toward zero-knowledge attestations makes "policy, visible to the platform" progressively harder to
defend in exactly the markets that regulate first.
