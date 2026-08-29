# Grant — pitch deck (Wave 1, Midnight Buildathon 2026)

Speaker-ready content, one section per slide. Visuals referenced from the
demo GIFs/screenshots (`grant-app-demo.gif`, Control Room walkthrough) and
the design prototype.

---

## 1 · Title

**Grant — hire AI agents with permissions, not passwords.**

Built on **AgentPass**: private delegation credentials on Midnight.
*Midnight Buildathon 2026 · Wave 1 · app + infrastructure, shipped together.*

---

## 2 · The problem

- Everyone is starting to delegate real tasks to AI agents — shopping,
  booking, subscriptions.
- Today that means handing an agent your **passwords, cards, or API keys**:
  total access, no limits, no undo.
- 2025 shipped the payment rails (Visa Intelligent Commerce, Mastercard
  Agent Pay, Google AP2, Stripe/OpenAI ACP) — **none has a privacy layer**.
  Authorizing an agent means revealing who you are and everything you allow.
- The result: the trust bottleneck of the agent economy. Most people simply
  don't delegate.

---

## 3 · The insight

- The **permission prompt** is the most rehearsed trust gesture in
  computing — everyone has tapped "Allow" a thousand times.
- App permissions are *promises*, enforced by policy.
- Grant keeps the gesture and upgrades the guarantee: permissions become
  **zero-knowledge credentials** — enforced by math, revocable on-chain,
  and the grantor stays anonymous.

---

## 4 · The product (demo slide)

- A directory of agents. Hiring one shows an OS-style permission sheet:
  *"SubManager wants to: subscribe on your behalf · spend up to 30 — you
  can lower this · for 30 days, unless you fire it first."*
- **Allow** issues a private, revocable credential on Midnight.
- Dashboard: spend meter per agent, live receipts, **Test the limits**
  (watch a forbidden action die at proof time), one-tap **Fire**.
- No wallet vocabulary in the flow; bring-your-own-wallet (Lace / Gero /
  1AM) or instant demo mode.

*(Show: permission sheet → auto-task receipt → limits rejection → fire.)*

---

## 5 · How does it actually book? (the journey)

TravelBooker, end to end:

1. **Intent, not access** — "train to the coast on Friday, under 40."
   Talk proves nothing.
2. **The agent uses its own tools** — its own fare APIs do the legwork.
   Your accounts are never involved.
3. **The moment of commitment** — to pay, the agent must produce a ZK
   proof: *a live credential delegates me; book(32) is in scope, under
   budget, before expiry.* For anything you didn't allow, **no proof can
   exist** — the attempt dies on the agent's machine.
4. **The merchant verifies the receipt, not you** — "authorized, within
   limits, will be paid." Never who you are.
5. **Fulfillment returns through the agent** to your Grant inbox.

The trust split: **competence** from the agent (judged by its
receipt-backed track record) · **permission** from your credential
(Grant's job) · **settlement** on escrow or card rails, gated by the
receipt. Flights need a passenger name? That's a scoped one-time
`data-access` grant on the same sheet — selective disclosure is Midnight's
native primitive.

---

## 6 · What's real today (Wave 1)

- **Compact contract** (issueMandate / proveAuthorized / revokeMandate):
  compiles, 15 adversarial tests, all three circuits **accepted by the
  network's PLONK checker** (negative control rejected).
- **Live devnet e2e, real proofs**: hire two agents → cross-agent theft
  rejected → out-of-scope rejected at proof time → fired agent locked out
  while the other keeps working. All checks green, twice.
- **Three surfaces**: wallet dApp (Lace/Gero/1AM sign every credential),
  walletless instant demo, engineer console.
- Dev tooling shipped: fixed-port devnet, faucet with a self-testing
  fund→register→dust path, scripted CI-style e2e suites.

---

## 7 · Under the hood (dual-ledger design)

- **Private, on your devices:** who you are, the agent's key, caps, scopes,
  expiry, salts.
- **Public, on Midnight:** pseudonymous credential ids, hiding commitments,
  spend totals, receipts, revocations.
- Every witness is re-bound in-circuit: an agent that inflates its own cap
  hits `terms do not match commitment`; a stranger agent hits `not the
  delegated agent`; expiry is proven without revealing it (agent-chosen
  coarse time bound).
- Full analysis in `docs/PRIVACY-DESIGN.md`.

---

## 8 · Why Midnight

- "Prove facts, not data" is the **native primitive** — delegation is
  literally a facts-about-private-terms problem.
- Local proof generation keeps mandate terms on-device; the chain sees
  commitments and booleans.
- Compliance-friendly: receipts give merchants/auditors verifiable
  authorization without personal data.
- Users never need to see the chain — walletless demo today, passkeys later.

---

## 9 · Adoption thesis

- Users don't adopt chains; they adopt **apps that hide the chain**. In
  Grant, nobody sees a token or the word blockchain.
- Agents are **high-frequency actors**: one human delegating generates far
  more transactions than one human clicking.
- Distribution is developer-side: the Wave 2 **agent SDK** lets any agent
  developer list in the directory — each integration brings its user base
  onto Midnight rails.
- The permission sheet is the wedge: it converts the agent economy's trust
  bottleneck into a one-tap gesture.

---

## 10 · Roadmap

- **Wave 2:** real LLM-powered agents on live tool APIs · agent-developer
  SDK + permission manifests · unlinkable receipts (HistoricMerkleTree
  budget-note chain) · richer wallet UX.
- **Wave 3:** settlement — escrow release against receipts and/or the
  **AP2 / card-rails privacy bridge** · merchant SDK ("accept authorized
  agents") · passkey walletless onboarding · team plans (budgeted
  credentials for workplace agents, audit-ready receipts).

---

## 11 · Why now

- Agentic commerce rails all shipped in 2025 — with mandates that identify
  the human. "Know Your Agent" is becoming a compliance topic.
- Privacy regulation tailwinds (eIDAS 2.0's explicit ZKP support; age/
  identity verification mandates) normalize proof-based authorization.
- Nothing on any privacy chain does private delegation today — first-mover
  on the missing layer.

---

## 12 · Close

- **Grant**: the app people understand in one screen.
- **AgentPass**: the credential layer any agent platform can adopt.
- Open source, Apache-2.0, built and verified during Wave 1 with Midnight's
  own toolchain (Kapa MCP, Midnight Expert, midnight-verify).
- Repo · demo video · try it: `npm run app`.

*The Allow button, upgraded.*
