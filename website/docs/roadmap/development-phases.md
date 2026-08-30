---
title: Development phases
---

# Development phases

The project is structured around the buildathon's three waves, each with a thesis it must prove. Wave 1 is built and
verified; later phases are planned scope.

## Phase 1 · Prove the primitive and the gesture *(Wave 1, built)*

**Thesis:** private, enforceable delegation is possible, and a non-crypto user can operate it.

Delivered, by layer:

**Protocol & verification.** The AgentPass contract (three proof circuits plus pure derivations) with 15
adversarial tests (tampered terms, wrong agent, replay, over-cap, non-principal revocation) and the typed two-party
`AgentPassAPI`. Verified through four independent routes: the test suite, Midnight's official witness pipeline
(**Confirmed**), the network-grade PLONK checker (all circuits accepted, tampered negative-control rejected), and
repeated live-devnet end-to-end runs.

**Product.** The Grant wallet dApp wearing the full design system: marketing landing, agent directory with category
filters and search, agent detail pages (permission manifest, receipt-backed track record, "what it can never do"),
the permission sheet with a user-editable cap, dashboard with spend rings, **Test the limits** (a forbidden action
dying at proof time, on demand), the receipt-anatomy view ("contains vs deliberately omits"), and the fire flow with
on-chain revocation. Browse works with no wallet; connect-on-demand resumes a pending hire after the wallet
approves; sessions persist locally across refreshes. Wallets: Lace, Gero, 1AM (DApp connector 4.x), and the
complete hire → task → receipt loop has been exercised end-to-end with a real user wallet.

**Surfaces & tooling.** Beyond the dApp: a walletless Grant demo (`npm run app`), the engineer Control Room with the
dual-ledger state visible (`npm run demo:server`), two scripted e2e suites kept green as regression gates (the
protocol tour `npm run demo` and the multi-agent theft suite `npm run app:e2e`), a
fixed-port local devnet (`npm run devnet:up`), and a faucet whose `--self-test` proves the full wallet-funding path.

**Design & communication.** The brand system shipped as an in-repo asset (perforated seal, 12-icon set, token
sheet), the privacy-design deep dive, 12 slides of pitch-deck content, recorded demo walkthroughs, and this
documentation site.

## Phase 2 · Prove other builders can use it *(Wave 2, planned)*

**Thesis:** AgentPass is infrastructure, which is only true when someone else builds on it.

Planned scope: the **listing SDK** (agent manifest format + credential check library + directory listing flow), a
**real LLM-driven agent** performing genuine tasks under its mandate (replacing scripted task lists), the
**budget-note chain** contract upgrade for unlinkable authorizations (see
[credential design](../architecture/credential-design.md)), and the accessibility audit pass
(see [accessibility](../ux/accessibility.md)).

## Phase 3 · Prove the economy can settle *(Wave 3, planned)*

**Thesis:** receipts can gate real value movement, privately.

Planned scope: **settlement layer v0** (escrow released against receipts), the **merchant verification API** (first
revenue line), **data-access grants** productized (scoped one-time disclosures, for example, a passenger name to one
airline), **passkey-based walletless onboarding** for consumers, and an ecosystem **security review** of the
contract.

## Phase 4 · Bridge and scale *(post-hackathon)*

Interop with the platform mandate rails (AP2 / ACP receipts), enterprise delegation tooling, batched/session
mandates for proof-latency headroom, and mainnet deployment tracking Midnight's own rollout.

Each phase's concrete checkpoints are in [milestones](milestones.md); the wave-by-wave mapping is in
[hackathon waves](hackathon-waves.md).
