---
title: Advanced integration & verification
---

# Advanced integration and verification

How Grant plugs into the full Midnight stack, and the five independent verification routes behind every
claim of "working."

## Provider stack

| Component | Role in Grant | Where it runs |
|---|---|---|
| Midnight node + indexer | Ledger state and GraphQL reads (receipts, spend, revocations) | Local devnet (fixed ports 9944/8088) or network |
| Proving | The wallet's embedded prover, obtained through the connector's `getProvingProvider`; a local proof server is the fallback and serves the walletless and agent surfaces | In the user's wallet or on their machine, so witnesses never leave their custody |
| DApp connector (API 4.x) | The user's wallet balances, signs, and submits every transaction | Lace / Gero / 1AM browser extension |
| ZK config provider | Serves prover/verifier keys + circuit IR to the browser | Bundled with the dApp at its own origin |
| Private-state provider | Holds each party's secrets during circuit execution | In-memory in the browser; LevelDB in the services |

Three surfaces share one contract and one API layer: the wallet dApp (canonical), the walletless demo server, and an
engineer console, plus two scripted end-to-end suites used as CI-style gates.

## Built with Midnight's AI toolkit

Development ran through the ecosystem's own tooling: **Kapa MCP** (docs-grounded answers inside the editor), the
**Midnight Expert** plugin suite (16 plugins: Compact language references, pattern catalogs, devnet management),
and the **midnight-verify** agents for mechanical verification. The identity patterns in the contract
(domain-separated derivations, commitment binding) follow the ecosystem's published pattern catalog rather than
inventing conventions.

## The verification stack (five independent routes)

| Route | What it checks | Result |
|---|---|---|
| 1 · Contract test suite (15 tests) | Business logic incl. adversarial cases: tampered caps, wrong agent, replayed requests, cumulative over-spend, non-principal revocation | Green (simulation layer, every commit) |
| 2 · Official witness pipeline | Contract ↔ TypeScript witness interface: generated-type check, structural checklist, dual execution routes, witness trust-boundary review | **Confirmed** by midnight-verify |
| 3 · PLONK checker (network-grade) | Each compiled circuit's proof validity via the same WASM checker the network uses | All three circuits **accepted**; tampered-transcript negative control **rejected** |
| 4 · Live devnet end-to-end | Real proof server, real transactions, indexer read-back: hire → task → receipt → out-of-scope rejection → revoke → lockout; multi-agent variant incl. cross-agent theft attempt | All checks passed (two suites, repeated runs) + full flow exercised with a real 1AM wallet |
| 5 · Public-network deployment | The same artifacts on Midnight **preprod**: faucet-funded wallet, owner-signed dust registration, contract deployment, mandate issuance, one proven authorization, receipt read back from the public indexer | Live at contract `36bce435af3a7a0d0e6e00afc748bb9bd1924295849c31eec600737924b2abd8` (`deployments/preprod.json`); preceded by an adversarial security review of the contract and witness layer |

:::info Why five routes
Each catches what the others cannot: tests check logic, the witness pipeline checks the FFI boundary, the PLONK
checker checks the proof-system artifacts, the devnet run checks the whole organism, and the preprod deployment checks
it against the public network. A claim that survives all five is the closest a hackathon gets to "known correct."
:::

## Reproducing everything

```bash
# contract: compile + 15 tests
cd contract && npm run compact && npm test -- --run

# protocol e2e on a live devnet (real proofs)
cd ../agentpass-cli && npm run demo

# multi-agent e2e (cross-agent theft, firing, survivor keeps working)
npm run app:e2e

# wallet-user funding path (NIGHT + owner-side dust registration)
npm run faucet -- --self-test
```
