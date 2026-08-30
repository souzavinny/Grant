---
title: User onboarding
---

# User onboarding

Onboarding is measured by one number: how many decisions a first-time user must make before feeling the product
work. Grant's answer is **two**: pick an agent, tap Allow.

## The flow, step by step

1. **Land:** the hero shows a permission sheet, the product in one image. No signup gate, no cookie wall.
2. **Browse:** the directory and every agent page are fully readable with zero connection. Curiosity is never
   taxed.
3. **First Hire:** tapping Hire without a wallet routes to a single-screen setup ("Bring your own keys"): three
   wallet options with plain descriptions, or the walletless demo path. The heading says the whole custody model in
   five words.
4. **Resume:** after the wallet approves, the flow returns to the exact permission sheet the user intended to open.
   First-run also silently publishes their personal registry (one wallet approval, explained in one sentence).
5. **First success:** the hired agent runs its first task; a receipt appears; the dashboard's ring moves.
   Time-to-aha is one hire.

## Choices that lower the ramp

- **Browse-first architecture:** connection is requested at intent, not entry: the single biggest drop-off
  eliminator in wallet dApps.
- **Pending-intent resume:** connecting never costs the user their place.
- **Demo door:** evaluators who will not install anything still experience real proofs via the walletless surface.
- **Session persistence:** registry address, credentials, and receipts survive refreshes locally: no accounts,
  nothing to recover.
- **Vocabulary:** hire, fire, credential, receipt. The only chain word on screen is the Midnight footnote.

## Current friction and the plan

Proving requires no setup with wallets that embed a prover: Grant delegates proof generation to the wallet.
Self-custody on a local devnet still requires funding (one faucet command) and wallet-side fee-resource generation,
workable for builders and evaluators, not for consumers. The consumer answer is Wave-3 **passkey onboarding**: same
credentials, no wallet concept. Onboarding is *designed* in Wave 1 and *finished* when a non-technical user's
step 3 disappears entirely.
