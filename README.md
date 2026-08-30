# Grant — hire AI agents with permissions, not passwords

**The app.** Grant is a directory of AI agents you can hire the way you install
an app: an OS-style permission sheet says exactly what the agent wants —
*"SubManager wants to: subscribe on your behalf · spend up to 30 · for 30
days"* — and you can lower the cap before tapping **Allow**. Allowing issues a
private, revocable credential on [Midnight](https://midnight.network). The
agent then works for you: every task it performs is a zero-knowledge proof that
the action was authorized, leaving a receipt on the public ledger. It never
holds your passwords, cards, or identity — and one tap **fires** it, revoking
the credential on-chain so it can't prove anything, anywhere, ever again.

```bash
cd agentpass-cli && npm run app     # instant demo (no wallet needed) → http://localhost:8791
```

The permission prompt is the most rehearsed trust gesture in computing. Grant
keeps the gesture and upgrades the guarantee: app permissions are promises;
these are cryptographically enforced, and the grantor stays anonymous.

**Live on Midnight preprod.** AgentPass is deployed on the public preprod
network at contract
`36bce435af3a7a0d0e6e00afc748bb9bd1924295849c31eec600737924b2abd8`, with an
on-chain smoke test (mandate issued, authorization proven, receipt read back
from the public indexer) recorded in [`deployments/preprod.json`](deployments/preprod.json).
`npm run deploy:preprod` in `agentpass-cli/` reproduces the deployment
(faucet-funded wallet, owner-signed dust registration, deploy, smoke test).

## Use Grant with your own wallet

Grant is a real Midnight dApp: it connects to **any wallet implementing the
Midnight DApp connector (API 4.x) — Lace, Gero, or 1AM**. Your wallet
balances, signs, and submits every transaction; your keys and mandate terms
never leave your browser.

```bash
# 1. Local devnet on the fixed ports wallets expect (node 9944 · indexer 8088 · proof server 6300)
cd agentpass-cli
npm run devnet:up

# 2. Install a wallet (for example 1AM or Lace from the Chrome Web Store),
#    create a wallet, then in its settings pick network "Undeployed".
#    Grant delegates proving to wallets with an embedded prover (1AM);
#    only wallets without one need the proof server at http://localhost:6300

# 3. Fund your wallet with NIGHT from the devnet genesis supply. Copy the
#    address starting mn_addr_undeployed1… from your wallet (NOT the mn_dust_…
#    one — that's the dust key, which can't receive transfers).
npm run faucet -- <mn_addr_undeployed1...>

# 4. Generate DUST (the fee resource). Once the NIGHT arrives, use your
#    wallet's dust/fee generation action; dust accrues from your NIGHT within
#    a minute or two. (Registration must be signed by your wallet — the
#    faucet can't do it for you; `npm run faucet -- --self-test` proves this
#    exact NIGHT → register → dust path works end-to-end.)

# 5. Build and serve the dApp, then open it and press "Connect wallet"
cd ../agentpass-ui
npm run build && npm run start     # or `npm run dev` while developing
```

First run deploys your own Grant registry (one wallet approval); after that,
hiring, tasks, and firing each ask your wallet to sign. Your registry address
and hired-agent credentials persist in the browser, so refreshes keep your
state. (`npm run faucet -- --self-test` verifies the whole funding path
end-to-end without a wallet extension.)

Grant is built on **AgentPass**, the delegation-credential infrastructure in
this same repo (below) — app and infra ship together.

---

# AgentPass — private delegation credentials for AI agents

**Know Your Agent, without knowing the human.** AgentPass lets a person issue a
*mandate* to an AI agent — a spend cap, a set of allowed action categories, an
expiry — and lets the agent prove, in zero knowledge on
[Midnight](https://midnight.network), that any specific action is authorized.
The merchant or dApp verifying the proof learns **that** the action is
authorized and **nothing else**: not who delegated, not the cap, not the scope,
not the expiry, and not any link between the mandate and the principal's other
activity.

Built for the **Midnight Buildathon 2026** (Wave 1: infra + the Grant app).

> 2025 gave agents payment rails — Visa Intelligent Commerce, Mastercard Agent
> Pay, Google AP2, Stripe/OpenAI ACP. None of them has a privacy layer: today,
> authorizing an agent means revealing who you are and what you allow it to do.
> AgentPass is that missing layer, built on Midnight's native
> prove-facts-not-data primitives.

## How it works

```
 PRINCIPAL (human)                 MIDNIGHT LEDGER (public)              AGENT (AI)
 ─────────────────                 ────────────────────────              ──────────
 issueMandate()          ──────▶   mandateId (pseudonymous)
   terms stay on device            commitment (hiding)                  terms + salt
   (cap, scope, expiry,                                                 received off-chain
    agent's public key)
                                   receipts[requestId]       ◀──────    proveAuthorized(action, amount)
                                   spent[mandateId] += amt              ZK proof: agent is delegated,
                                                                        action in scope, spend ≤ cap,
 revokeMandate()         ──────▶   revokedMandates += id                not expired, not revoked
   only the issuer can
   produce this proof              VERIFIER: looks up receipts[requestId] — learns action + amount, nothing else
```

The full privacy analysis — what every circuit proves, what is disclosed, what
an observer can and cannot learn, and the Wave 2 unlinkability roadmap — is in
[`docs/PRIVACY-DESIGN.md`](docs/PRIVACY-DESIGN.md).

## Repository layout

| Package | What it is |
|---|---|
| [`contract/`](contract) | The **AgentPass Compact contract** (`src/agentpass.compact`), witnesses, simulator, and 15 contract tests |
| [`api/`](api) | TypeScript API adapting the deployed contract for the two parties (`src/agentpass.ts`) |
| [`agentpass-cli/`](agentpass-cli) | **Grant** (`npm run app` + `public/grant.html`), the Control Room engineer console (`npm run demo:server`), the interactive CLI tour, and two scripted e2e suites (`npm run demo`, `npm run app:e2e`) |
| [`agentpass-ui/`](agentpass-ui) | **Grant wallet dApp** — connect Lace / Gero / 1AM; your wallet signs every credential (`npm run build && npm run start`) |
| [`docs/`](docs) | Privacy design document |

The repo started from the official
[`example-bboard`](https://github.com/midnightntwrk/example-bboard) template;
all AgentPass functionality (contract, witnesses, tests, API, CLI flow) is new
for this Buildathon.

## The contract in 30 seconds

Three proof circuits ([`contract/src/agentpass.compact`](contract/src/agentpass.compact)):

- **`issueMandate`** — registers a pseudonymous `mandateId` (domain-separated
  hash of the principal's key + a nonce) and a *hiding commitment*
  (`persistentCommit`) of the mandate terms. The principal's identity never
  appears on-chain, and two mandates from the same principal are unlinkable.
- **`proveAuthorized(mandateId, requestId, action, amount)`** — the agent
  proves *inside the ZK circuit*: the witnessed terms match the on-chain
  commitment, it holds the delegated agent key, the action is in scope, the
  cumulative spend stays under the cap, and the mandate is unexpired,
  unrevoked, and the requestId unused. Disclosed: a receipt (action, amount)
  and the updated spend. Expiry is checked without revealing it — the agent
  discloses a self-chosen coarse time bound `b` and proves
  `blockTime < b ≤ expiry`.
- **`revokeMandate`** — re-derives the mandateId from the principal's secret,
  so only the issuer can kill a mandate.

Private state (`witnesses.ts` pattern) models the two parties explicitly:
the principal holds the issuing secrets, the agent holds the delegated
terms + its own key. Every witnessed value is re-bound on-chain — lying in a
witness fails an `assert` (see the tamper tests).

## Quick start

Prerequisites: Node ≥ 22, Docker (+ compose v2), the
[Compact toolchain](https://docs.midnight.network/getting-started/installation)
with version 0.31.0 (`compact update 0.31.0`).

```bash
npm install

# 1. Compile the contracts (hard-gate check)
cd contract
npm run compact          # compiles agentpass.compact (and the retained template contract)

# 2. Run the contract test suite — 15 AgentPass tests incl. adversarial cases
npm test -- --run

# 3. Run Grant — the app (spins up a local devnet, then serves the UI)
cd ../agentpass-cli
npm run app          # → http://localhost:8791

# 4. Automated end-to-end checks on a local (undeployed) devnet — real proofs
npm run app:e2e      # Grant flows: 2 agents, cross-agent theft, limits, firing
npm run demo         # protocol demo: issue, authorize, verify, revoke

# Other surfaces: npm run demo:server (Control Room engineer console, :8790),
# npm run standalone (interactive CLI tour)
```

> Using Colima instead of Docker Desktop? testcontainers needs the socket
> spelled out: `export DOCKER_HOST=unix://$HOME/.colima/default/docker.sock`
> and `export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`.

The CLI walks the whole story interactively:

```
1. [Principal] Issue a mandate (cap, scope, expiry)
2. [Agent]     Request authorization for an action (ZK proof)
3. [Verifier]  Check a receipt on the public ledger
4. [Observer]  Show the public ledger state          ← see what the world sees
5. [Devices]   Show the parties' private state       ← see what stays local
6. [Principal] Revoke the mandate
7. [Attacker]  Adversarial demo: try an unauthorized action
```

Option 7 is the punchline: an out-of-scope action fails *locally at proof
generation* — no proof exists for an unauthorized action, so the chain never
even sees the attempt.

## Testing & verification

- **15 contract tests** (`contract/src/test/agentpass.test.ts`): issuance
  determinism, authorization, cumulative caps, scope enforcement, replay
  protection, tampered-terms rejection, wrong-agent rejection, expiry bounds,
  principal-only revocation.
- Verified with the official **Midnight Expert / midnight-verify** tooling:
  witness↔contract interface confirmed (type harness + structural checklist +
  dual execution routes), and all three proof circuits **accepted by the
  `@midnight-ntwrk/zkir-v2` PLONK checker** — the same verification path the
  network uses — including a negative control (a tampered transcript byte is
  rejected).
- **Automated devnet e2e** (`npm run demo`): deploy, issue, authorize with real
  proof-server proofs, indexer receipt verification, adversarial rejections,
  and revocation — asserted end-to-end.
- Built with the Midnight AI toolkit: Kapa MCP + Midnight Expert plugins.

## Roadmap

- **Wave 1 (this submission):** contract + tests + two-party API + end-to-end
  CLI demo on the local devnet.
- **Wave 2:** unlinkable authorizations — replace Map-keyed spend tracking with
  a `HistoricMerkleTree` budget-note chain (nullifier + re-blinded successor
  note per authorization); React UI with Lace; agent-side SDK snippet for any
  LLM agent framework.
- **Wave 3:** walletless onboarding (Wallet SDK / passkeys), Gero wallet
  support, Effect Stream demo (mandate proven on Midnight, action executed on
  an EVM chain), verifier webhook service.

## License

Apache-2.0. Based on the `midnightntwrk/example-bboard` template (Apache-2.0).

Part of the [Midnight](https://midnight.network) ecosystem — repository tagged
`midnightntwrk`.
