---
title: ZK implementation
---

# ZK implementation

Three zero-knowledge (ZK) proof circuits carry the whole protocol. This page explains what each proves, what it discloses, and the two
design tricks worth stealing.

## The circuits

### `issueMandate()` · the principal registers a grant

Inside the proof: the mandate id is derived from the principal's secret key and a fresh nonce via a domain-separated
hash, and the full `MandateTerms` struct is bound with a hiding commitment (`persistentCommit(terms, salt)`).
Disclosed: the pseudonymous id and the commitment: 64 bytes that reveal nothing about who granted or what. Two
mandates from the same person are unlinkable (different nonces → unrelated hashes).

### `proveAuthorized(mandateId, requestId, action, amount)` · the agent acts

In one proof, the circuit asserts all of:

- the witnessed terms hash to the on-chain commitment (*no term tampering*);
- the prover's key derives to the agent key inside those terms (*only the delegated agent*);
- the action is inside the scope vector (*category enforcement*);
- cumulative spend + amount ≤ cap (*budget, against a private cap*);
- the mandate is unexpired, unrevoked, and the requestId unused (*freshness, revocation, replay*).

Disclosed: a receipt (action, amount, requestId) and the updated spend total. Not disclosed: cap, scope, expiry,
either party's identity.

### `revokeMandate(mandateId)` · the principal fires

The circuit re-derives the mandate id from the principal's witnessed secret and nonce, so only the issuer can
revoke, and adds the id to the public revocation set. Every future authorization proof checks that set.

## Design trick 1: proving "not expired" without revealing the expiry

Midnight's block-time comparison takes a *public* argument, so proving `blockTime < expiry` directly would publish
the expiry. Instead the agent picks a coarse public bound *b* and the circuit proves `blockTime < b ≤ expiry`: the
chain learns only an agent-chosen bound (rounded to the hour), never the mandate's actual expiry. The Compact compiler's disclosure analysis *rejects* the naive
version. The type system itself surfaces the privacy leak.

## Design trick 2: the permission sheet's cap is part of the commitment

When a user lowers the cap on the permission sheet before tapping Allow, that edited cap is committed, so the
enforcement the user configured is exactly the enforcement the math applies. The adversarial test suite includes the
case where the agent inflates its own copy of the cap: the proof fails with `terms do not match commitment`.

## What the compiler enforces

Compact's "witness protection" analysis makes any flow of private data to a public sink a compile error unless
explicitly annotated with `disclose()`. The contract has exactly the disclosures listed above and the compiler will
not build a version with more. Privacy review is therefore a diff of `disclose()` sites, auditable in minutes.

:::tip Verified, not asserted
All three circuits compile with the official toolchain, generate real prover/verifier keys, and are **accepted by
the network's PLONK checker**; a deliberately tampered public transcript is rejected (negative control). See
[Advanced integration & verification](advanced-integration.md).
:::

Full disclosure accounting and threat notes: [Privacy design](../deep-dives/privacy-design.md).
