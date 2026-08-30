---
title: "Privacy design (deep dive)"
---

# AgentPass privacy design

> **Grant mapping.** The Grant app is a thin product skin over these exact
> circuits: *Hire* (Allow on the permission sheet) = `issueMandate`, an agent
> *task* = `proveAuthorized`, *Test the limits* = a deliberately out-of-scope
> `proveAuthorized` that fails at proof time, *Fire* = `revokeMandate`. Each
> directory agent holds its own secret key, so a credential is usable only by
> the one agent it was granted to.

AgentPass issues **private delegation credentials for AI agents** ("Know Your Agent").
A human principal grants an agent a *mandate* (spend cap, allowed action
categories, expiry) and the agent proves, in zero knowledge, that a specific
action is authorized. The verifier learns *that* the action is authorized,
never *who* delegated it or *what else* the agent is allowed to do.

## Dual-ledger model

Midnight contracts split state across two worlds. AgentPass uses both deliberately:

### Private (never leaves the parties' devices)

| Data | Held by | Used in |
|---|---|---|
| `principalSecretKey` | principal | mandate id derivation, revocation proof |
| `mandateNonce` | principal | makes each mandate id unlinkable to the principal's other mandates |
| `MandateTerms` (cap, expiry, agentPk, scope) | principal + agent | every authorization proof, via commitment equality |
| `mandateSalt` | principal + agent | blinds the on-chain commitment (`persistentCommit`) |
| `agentSecretKey` | agent | proves the prover is the delegated agent |

### Public (on the Midnight ledger)

| Ledger field | Contents | Why it must be public |
|---|---|---|
| `mandateCommitments: Map<Bytes<32>, Bytes<32>>` | pseudonymous mandateId → hiding commitment | anchors the terms so neither party can rewrite them |
| `spentAmounts: Map<Bytes<32>, Uint<64>>` | mandateId → cumulative authorized amount | budget enforcement across transactions |
| `revokedMandates: Set<Bytes<32>>` | killed mandateIds | verifiers must see revocation immediately |
| `receipts: Map<Bytes<32>, AuthReceipt>` | requestId → (action, amount) | the verifier's proof-of-authorization + replay protection |
| `authorizations: Counter` | global count | metrics only |

## What each circuit proves and discloses

**`issueMandate`** proves the caller knows a principal key and nonce deriving
the mandateId (domain-separated `persistentHash`), and binds the terms with
`persistentCommit(terms, salt)`. Discloses: mandateId, commitment. The
principal's public key never appears; two mandates from the same principal are
unlinkable (different nonces → unrelated hashes).

**`proveAuthorized(mandateId, requestId, action, amount)`**. Inside the proof:
commitment equality (witnessed terms match the on-chain commitment), agent-key
binding (`derivePk(agentSecretKey) == terms.agentPk`), scope membership
(constant-index fold over `Vector<8, Boolean>`), cumulative budget
(`spent + amount <= cap`), expiry, revocation and replay checks. Discloses
only: mandateId, requestId, action category, amount, updated spend total.

**Expiry without revealing expiry.** `kernel.blockTimeLessThan` takes a public
argument, so proving `blockTime < expiry` directly would publish the mandate's
expiry. Instead the agent picks a coarse `timeBound` and the circuit proves
`blockTime < timeBound <= expiry`: the chain sees only the agent-chosen bound
(observed compiler behavior: the direct form is rejected as an undeclared
disclosure; this construction compiles cleanly).

**`revokeMandate`** re-derives the mandateId from the principal's witnessed
secret key + nonce, so only the issuer can revoke. The agent knows the
mandateId but cannot produce this proof.

## What an observer learns (v0.1)

An observer sees: a mandate exists (pseudonymous), its cumulative authorized
spend, action categories and amounts per authorization, timing, and revocation
events. An observer does **not** learn: the principal's identity or wallet, the
agent's identity, the cap, the scope, the expiry, or any linkage between two
mandates of the same principal.

**Known linkage (v0.1):** all authorizations under one mandate share the public
mandateId: actions are linkable to each other (not to the principal). This is
a deliberate Wave 1 trade-off to keep budget enforcement simple.

**Wave 2 roadmap:** replace Map-keyed spend tracking with a
`HistoricMerkleTree` note-chain (each authorization consumes a budget note via
nullifier and inserts a re-blinded successor note), making authorizations
mutually unlinkable while keeping cumulative-cap enforcement, the same
commitment/nullifier pattern used across the Midnight ecosystem.

## Threat notes

- **Witness trust boundary:** every witness value is bound by an in-circuit
  check: terms/salt by commitment equality, agent key by `terms.agentPk`,
  principal key by mandateId re-derivation, timeBound by `<= expiry`. A party
  lying in its witness fails an assert; tests cover the tampered-cap, wrong
  agent, and non-principal-revoke cases.
- **Domain separation:** key derivation (`agentpass:pk:v1`) and mandate ids
  (`agentpass:mid:v1`) use distinct `pad(32, ...)` tags, so values derived from
  the same secret are unlinkable.
- **Replay:** requestIds are single-use (`receipts.member` check); a verifier
  should generate a fresh random requestId per transaction.
- **Small-anonymity-set caveat:** with very few mandates on-chain, timing
  correlation can weaken pseudonymity, standard for nullifier-style systems.
