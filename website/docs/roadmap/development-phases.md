---
title: Development phases
---

# Development phases

The project is structured around the buildathon's three waves, each with a thesis it must prove. Wave 1 is built and
verified; later phases are planned scope, labeled as such.

## Phase 1 — Prove the primitive and the gesture *(Wave 1 — built)*

**Thesis:** private, enforceable delegation is possible, and a non-crypto user can operate it.

Delivered: the AgentPass contract (three circuits, verified through four independent routes — tests, witness
pipeline, PLONK checker, live-devnet e2e), the typed API, the Grant dApp with the full product design system
(directory, agent pages, permission sheet, dashboard, receipt anatomy, fire flow), wallet support (Lace / Gero /
1AM) with connect-on-demand, a walletless demo surface, an engineer console, a devnet faucet, and this documentation
site. The complete loop has been exercised with a real user wallet end-to-end.

## Phase 2 — Prove other builders can use it *(Wave 2 — planned)*

**Thesis:** AgentPass is infrastructure, which is only true when someone else builds on it.

Planned scope: the **listing SDK** (agent manifest format + credential check library + directory listing flow), a
**real LLM-driven agent** performing genuine tasks under its mandate (replacing scripted task lists), the
**budget-note chain** contract upgrade for unlinkable authorizations (see
[credential design](../architecture/credential-design.md)), and the accessibility audit pass
(see [accessibility](../ux/accessibility.md)).

## Phase 3 — Prove the economy can settle *(Wave 3 — planned)*

**Thesis:** receipts can gate real value movement, privately.

Planned scope: **settlement layer v0** (escrow released against receipts), the **merchant verification API** (first
revenue line), **data-access grants** productized (scoped one-time disclosures, e.g. a passenger name to one
airline), **passkey-based walletless onboarding** for consumers, and an ecosystem **security review** of the
contract.

## Phase 4 — Bridge and scale *(post-hackathon)*

Interop with the platform mandate rails (AP2 / ACP receipts), enterprise delegation tooling, batched/session
mandates for proof-latency headroom, and mainnet deployment tracking Midnight's own rollout.

Each phase's concrete checkpoints are in [milestones](milestones.md); the wave-by-wave submission mapping is in
[hackathon waves](hackathon-waves.md).
