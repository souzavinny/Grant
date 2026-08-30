---
title: Hackathon waves
---

# Hackathon waves

The Midnight Buildathon runs in three waves; each wave's submission builds on the last. This page maps our plan onto
that structure — including how we interpreted the assignment.

## How we read the brief

The buildathon's stated theme is digital identity. Most identity submissions will be credentials **about people**
(age, KYC, membership). We chose credentials **about authority** — *what an agent may do on a person's behalf* —
because it's the identity problem the agent economy actually blocks on, it exercises Midnight's differentiators
(private state with public enforceability) rather than just its wallet, and it positions us in the ecosystem as
complementary infrastructure other identity projects can integrate with instead of competing against.

We also read the meta-goal honestly: protocols run hackathons to find applications that bring them users. So Wave 1
ships **infrastructure and a consumer application on top of it** — AgentPass proves technical depth, Grant proves
someone would actually use it. The pairing is the submission.

## Wave 1 — the working core *(built; submission due September 16, 2026)*

Everything in [development phases § Phase 1](development-phases.md): the four-route-verified contract, typed API,
the Grant dApp with real wallet support and the full design system, four demo/tooling surfaces, and this docs site.
What remains before the deadline is packaging — video, public repo, slide export, the AKINDO form.

**What a judge can do in five minutes:** run `npm run app`, hire SubManager through the permission sheet (lowering
the cap), watch a receipt land, press *Test the limits* to see an unauthorized action die at proof time, and fire
the agent — every step a real transaction on a local Midnight devnet. With more time: connect their own Lace / Gero
/ 1AM wallet (funded by `npm run faucet`) and run the same loop self-custodied, replay the adversarial e2e suite
(`npm run app:e2e`), or watch the dual-ledger state move in the engineer console (`npm run demo:server`).

## Wave 2 — open the platform *(planned)*

The listing SDK plus a real LLM agent — converting Grant from "our three agents" into a directory anyone can join —
and the unlinkability contract upgrade. The demo evolves from *we built an app* to *someone else built on our
rails*.

## Wave 3 — close the loop *(planned)*

Settlement against receipts, the merchant verification API, data-access grants, passkey onboarding. The demo evolves
from *authorization works* to *money moved because authorization worked*.

## Continuity rule

Each wave must keep the previous wave's demo green: the Wave 1 e2e suites stay in CI as regression gates for every
Wave 2/3 change. A buildathon entry that breaks its own earlier demo has negative progress.
