---
title: Why Midnight
---

# Why Midnight

Grant is not a privacy feature bolted onto a chain: it is Midnight's core primitive (*prove facts, not data*)
applied to delegation. On any transparent chain, this product cannot exist.

## The requirement that picks the chain

A delegation credential must satisfy four properties simultaneously:

1. **The terms are secret** (cap, scope, expiry): competitors, merchants, and observers must not learn what a user
   allows.
2. **The terms are binding**: the agent must be unable to act outside them, even by one unit.
3. **Authorization is publicly checkable**: a merchant must verify "this action is allowed" with a ledger lookup.
4. **The human is pseudonymous**: verification must not identify the grantor.

Properties 1+2 together demand computing over private data with public consequences: exactly a zero-knowledge
circuit. Property 3 demands a public ledger. Property 4 demands the ledger hold commitments, not identities.
Midnight's dual-ledger model (private state on the user's device, zero-knowledge proofs bridging to public on-chain state) is
this requirement expressed as an architecture.

## The dual ledger, as Grant uses it

| Stays on the parties' devices | Lives on the public ledger |
|---|---|
| Principal secret key · mandate nonce · **MandateTerms** (cap, expiry, agent key, scope) · blinding salt · agent secret key | Pseudonymous mandate id · hiding commitment of the terms · cumulative spend · receipts (action + amount) · revocation set · authorization counter |

Every witness value that matters is *re-bound in-circuit*: terms must match the on-chain commitment, the prover must
hold the delegated agent key, spend must stay under the (private) cap. Lying in a witness fails an assert; there is
no policy layer to bribe or bug.

## What Midnight specifically provides

- **Compact:** a TypeScript-adjacent contract language where the compiler's disclosure analysis forces every public
  reveal to be explicit: the privacy accounting is machine-checked, not aspirational.
- **Local proving:** proofs are generated against a proof server the user (or agent service) runs; secrets never
  leave the device even during proving.
- **Selective disclosure as a native pattern:** the Wave-3 "data-access grant" (disclose one field, for example, a passenger
  name, to one counterparty, once) is idiomatic Midnight rather than a research project.
- **Compliance-compatible privacy:** receipts give merchants and auditors verifiable authorization with zero
  personal data: the network's stated positioning, embodied in a product.

## What AgentPass deliberately does not use

No custom token: fees ride the network's native economics (NIGHT/DUST), and Grant introduces no speculative asset
(see [economic sustainability](../business/economic-sustainability.md)). No cross-contract calls: the network
does not support them yet, so AgentPass is a deliberately single-contract design; the constraint shaped the
architecture rather than surprising it.
