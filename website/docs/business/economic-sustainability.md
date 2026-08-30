---
title: Economic sustainability
---

# Economic sustainability

Where a token project must argue its emissions schedule won't collapse, Grant's sustainability question is simpler
and harder: **can the credential rails run indefinitely without subsidy?** The answer decomposes into costs, who
bears them, and what defends the margin.

## The cost structure

| Cost | Who bears it | Why it's sustainable |
|---|---|---|
| Transaction fees (issue / authorize / revoke) | The transacting party, in the network's native fee resource (DUST, generated from held NIGHT) | Midnight's fee model regenerates capacity from holdings rather than burning a scarce asset per action — a user who funds a wallet once can keep issuing credentials; agents doing volume hold proportional NIGHT. No treasury subsidizes usage. |
| Proof generation (compute) | The prover — user's device at hire/fire, the agent's service at each action | The heavy recurring cost (per-action proofs) lands on agents, who monetize each action; it is a cost of goods, priced into their service fee. |
| Verification (ledger reads) | Near-zero marginal cost | Reads are indexer queries — which is exactly why the [verification API](revenue-model.md) is the first revenue line: high margin on the cheapest operation. |
| Directory & docs hosting | Grant (static) | Static sites and a contract address; the expensive parts of a marketplace (reviews moderation, dispute teams) are replaced by receipts. |

## Why no token — the sustainability argument

A protocol token would let us subsidize early usage, and that is precisely the trap: subsidized usage measures the
subsidy, not the product. It also imports sell-pressure dynamics, regulatory surface, and a community of holders
whose interests (price) diverge from users' interests (safe delegation). Grant's demand is denominated in the thing
itself — credentials issued because delegation is useful — so revenue tracks genuine adoption from day one. Fees
ride NIGHT/DUST; our income statement is boring SaaS/API economics, which is a compliment.

## Flywheel and steady state

More agents listed → more hires → more receipts → richer verifiable track records → more user trust and more
merchant verification calls → more reasons for agents to list. Each loop turn deposits a permanent asset (receipts)
that makes the next turn cheaper. Steady state: verification and certification revenue covering a small core team,
with the authorization fee as the growth line once settlement lands. The failure mode we watch for is proof latency
under agent volume — mitigations (batched authorizations, session mandates) are contract-level roadmap items, not
rewrites.

## Honest dependencies

Sustainability inherits two things we don't control: Midnight mainnet fee economics staying compatible with
high-frequency small authorizations, and wallet UX maturing for consumers. Both are network-level bets — the same
bets every serious Midnight application is making — and both have stated mitigation paths (batching; Wave-3 passkey
onboarding).
