---
title: Milestones
---

# Milestones

Checkpoints with pass/fail criteria — because "done" should be checkable, not felt. Status as of Wave 1.

## Reached ✅

| Milestone | Evidence |
|---|---|
| Contract compiles and passes adversarial tests | 15 vitest cases green, including tampered terms, wrong agent, replay, over-cap, non-principal revoke |
| Circuits are network-valid | All 3 circuits accepted by the PLONK checker; tampered-transcript negative control rejected |
| Witness interface is correct | Official witness verification pipeline: **Confirmed** |
| Full protocol runs on a live devnet | Scripted e2e: hire → task → receipt → out-of-scope rejection → revoke → lockout; multi-agent variant with cross-agent theft attempt — all checks pass |
| A real user can do it with a real wallet | The complete hire → spend → receipt loop executed with a 1AM wallet by an actual human (cap $30, $8 spent, credential live on devnet) |
| The product wears its design | Full design system applied to the dApp itself (not a prototype): landing, directory, agent pages, permission sheet, dashboard, receipts, fire flow — plus the brand sheet (seal, 12-icon set) shipped in-repo |
| Frictionless first contact | Browse with no wallet · connect-on-demand resumes a pending hire · sessions persist locally across refreshes |
| One-command experiences | `npm run app` (walletless Grant), `npm run demo` (protocol e2e), `npm run app:e2e` (multi-agent suite), `npm run demo:server` (engineer console), `npm run devnet:up` (fixed-port devnet), `npm run faucet -- --self-test` (wallet funding path) |
| Presentation groundwork | 12 slides of pitch-deck content, the privacy-design deep dive, and recorded demo walkthroughs |
| Documentation site | This site: architecture, ZK design, UX, business, roadmap |

## Wave 1 release targets

Public GitHub repository · narrated demo video · presentation deck · buildathon entry (September 16, 2026).

## Wave 2 targets

First third-party agent listed via the SDK · an LLM-driven agent completing a real task under its mandate ·
budget-note chain circuit passing the same four-route verification stack as v1 · accessibility audit merged.

## Wave 3 targets

First escrow settlement released against a receipt · verification API serving external calls · first scoped
data-access grant disclosed to a counterparty · passkey onboarding shipping the two-decision first run without a
wallet install · external security review scheduled.

**The one metric per wave:** Wave 1 — a stranger completes hire → fire unaided. Wave 2 — an agent we didn't write
earns a receipt. Wave 3 — value moves because a receipt existed.
