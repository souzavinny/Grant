---
title: Smart contract details
---

# Smart contract details

One Compact contract, ~120 lines, three proof circuits, two pure derivations. Small on purpose: every line is in the
audit surface of a credential system.

## Ledger state

| Field | Type | Holds |
|---|---|---|
| `mandateCommitments` | `Map<Bytes<32>, Bytes<32>>` | mandate id → hiding commitment of the terms |
| `spentAmounts` | `Map<Bytes<32>, Uint<64>>` | mandate id → cumulative authorized spend |
| `revokedMandates` | `Set<Bytes<32>>` | ids killed by their principal |
| `receipts` | `Map<Bytes<32>, AuthReceipt>` | request id → (action, amount); doubles as replay protection |
| `authorizations` | `Counter` | global count (metrics) |

## Private state and witnesses

Six witnesses feed the circuits, split across the two parties. The principal holds `principalSecretKey` and
`mandateNonce`; both parties hold the `MandateTerms` struct (cap, expiry, agent public key, 8-slot scope vector) and
the blinding `mandateSalt`; the agent holds `agentSecretKey` and picks the public `timeBound` per action. The
TypeScript witness layer models the parties as separate private states: invoking a circuit with the wrong party's
state fails fast client-side, while the enforcement always lives in the circuit's asserts.

## Circuit walkthrough

### `issueMandate(): Bytes<32>`

```text
mandateId = H(domain₁ ‖ derivePk(principalSk) ‖ nonce)     // pseudonymous, unlinkable per-mandate
assert !mandateCommitments.member(mandateId)                // no overwrite
mandateCommitments[mandateId] = persistentCommit(terms, salt)
spentAmounts[mandateId] = 0
```

### `proveAuthorized(mandateId, requestId, action, amount)`

```text
assert mandateCommitments.member(mandateId)                 // exists
assert !revokedMandates.member(mandateId)                   // not fired
assert !receipts.member(requestId)                          // no replay
assert commitment == persistentCommit(witnessedTerms, salt) // terms are the real ones
assert derivePk(agentSk) == terms.agentPk                   // only the delegated agent
assert scope[action]                                        // category allowed
assert bound ≤ terms.expiry  ∧  blockTime < disclose(bound) // fresh, expiry hidden
assert spent + amount ≤ terms.cap                           // budget vs private cap
receipts[requestId] = (action, amount); spent += amount
```

### `revokeMandate(mandateId)`

```text
assert H(domain₁ ‖ derivePk(principalSk) ‖ nonce) == mandateId   // issuer-only
revokedMandates.insert(mandateId)
```

## Pure derivations for the DApp layer

`agentPublicKey(sk)` and `mandateIdFor(pk, nonce)` are exported pure circuits: the TypeScript layer computes the
exact same hashes the circuits enforce (locally: calling them puts nothing on-chain), so ids shown in the UI are
derived, never guessed.

## The API layer

`AgentPassAPI` wraps the compiled contract for both parties: `deploy` (principal) and `join` (either party, own
private-state id), then `issueMandate`, `proveAuthorized` (generating a fresh requestId per call), and
`revokeMandate`. It is provider-agnostic: the same class runs in the browser (wallet-signed) and in Node services
(facade wallet), which is what keeps three surfaces on one code path.

:::note Source
`contract/src/agentpass.compact` · tests: `contract/src/test/agentpass.test.ts` (15 cases, adversarial included).
:::
