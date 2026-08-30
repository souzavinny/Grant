---
title: User journey
---

# User journey

## The core loop: Hire → It works → Fire

1. **Discover** — browse the directory (no wallet needed); open an agent's page: what it does, what it asks for,
   what it can never do, and a receipt-backed track record.
2. **Hire** — tap Hire; the permission sheet slides up; lower the cap if you like; tap Allow. Your wallet signs; a
   proving state explains what's happening ("issuing private credential… never your keys").
3. **It works** — the dashboard shows a spend ring filling as tasks complete; each task drops a receipt you can open
   to see exactly what the world can read.
4. **Test the limits** — one tap makes the agent attempt something you never allowed, and the UI shows the product's
   proudest sentence: *"Blocked before it happened — no valid proof can exist for it, so it never executed. Nothing
   to undo."*
5. **Fire** — confirm once; the credential is revoked on-chain; the card gets a REVOKED stamp and the agent is
   locked out everywhere, forever. Receipts remain.

## How does it actually book? (the skeptic's journey)

Told with TravelBooker, because it's the question every judge asks:

1. **Intent, not access.** "Train to the coast on Friday, under $40." Talk is free and proves nothing.
2. **The agent works with its own tools.** Its fare APIs do the searching. Your accounts are never involved.
3. **The moment of commitment.** To book, the agent must produce a ZK proof: *a live credential delegates me;
   book($32) is in scope, under budget, before expiry.* For anything you didn't allow, no proof can exist — the
   attempt dies on the agent's machine.
4. **The merchant verifies the receipt, not you.** "Authorized, within limits" — never who you are.
5. **Fulfillment returns through the agent** to your Grant inbox.

The trust split: **competence** comes from the agent (judge it by receipts) · **permission** comes from your
credential (Grant's job) · **settlement** rides escrow or card rails, gated by the receipt (roadmap). Flights need a
passenger name? That's a scoped one-time **data-access grant** on the same permission sheet — selective disclosure
is Midnight's native move.

## Journey states we deliberately designed

| Moment | Design answer |
|---|---|
| First visit, no wallet | Everything browsable; wallet requested only at first Hire, then the flow resumes exactly where it paused |
| Waiting on a proof (10–40s) | Card-terminal framing: named stages, calm copy, never a frozen screen |
| Agent tries something forbidden | The rejection is celebrated, not hidden — it's the demo of the guarantee |
| After firing | Locked-out state stays visible with its receipts: revocation has a face |
| Coming back tomorrow | Session persists locally (registry address, credentials, receipts) — refresh loses nothing |
