---
title: Security considerations
---

# Security considerations

A credential system's security question is always the same: **can any party gain authority they weren't granted?**
This page walks the trust boundaries and what enforces each.

## The witness trust boundary

In Midnight's model, witnesses (private inputs) are supplied by whoever runs the circuit, so a malicious party
controls its own witnesses completely. The rule: *every witnessed value that carries authority is re-bound on-chain
inside the circuit.*

| Witness a party could lie about | In-circuit binding that catches it | Covered by test |
|---|---|---|
| Mandate terms (for example, agent inflates its cap) | `persistentCommit(terms, salt)` must equal the stored commitment | "tampered terms": fails with `terms do not match commitment` |
| Agent identity (another agent uses the credential) | `derivePk(agentSk)` must equal `terms.agentPk` | "not the delegated agent" (also exercised cross-agent on devnet) |
| Principal identity (someone else revokes) | mandateId re-derived from `principalSk` + nonce | "not the mandate principal" |
| Time bound (agent pretends it is earlier) | `bound ≤ expiry` (private) ∧ `blockTime < bound` (public, chain-checked) | "time bound past expiry" |

## Replay and double-spend

Request ids are single-use (the receipts map doubles as the nullifier set), and spend accumulates monotonically
against the committed cap, both asserted in-circuit and covered by tests ("replayed requestId", "cumulative
over-cap").

## Cryptographic hygiene

- **Domain separation:** key derivation and mandate-id derivation use distinct `pad(32, …)` tags, so values derived
  from one secret cannot be cross-linked or replayed into the other role.
- **Hiding commitments:** terms are bound with a salted commitment, not a bare hash, so small-space guessing of
  caps/scopes is blinded.
- **Compiler-checked disclosure:** Compact refuses to compile private→public flows without explicit `disclose()`;
  the contract's disclosure sites are exactly its documented public surface.

## Revocation authority and liveness

Only the issuer can revoke (issuer-derivation proof), revocation is permanent, and every authorization proof checks
the revocation set: there is no grace window in which a fired agent can act using stale state, because the check
happens against current ledger state at transaction time.

## Honest limitations (current scope)

- **Mandate-level linkability of authorizations**: a v1 trade-off; note-chain design scheduled, see
  [credential design](credential-design.md).
- **Off-chain hand-off:** terms + salt travel to the agent off-chain at hire; a compromised agent can leak its own
  terms (never the principal's identity). This mirrors the trust already placed in the agent to act at all.
- **Settlement is out of scope:** receipts prove authorization; money movement is a Wave-3 layer (escrow / rail
  bridge).
- **No external audit yet.** Verification so far: 15 adversarial tests, the official witness pipeline (Confirmed),
  PLONK acceptance of all circuits with a tamper negative-control, and repeated live-devnet e2e. See
  [verification](../midnight/advanced-integration.md). An ecosystem security review is scheduled for Wave 3.
