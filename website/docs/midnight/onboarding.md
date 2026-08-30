---
title: Onboarding non-technical users
---

# Onboarding non-technical users

The onboarding principle: **nobody should need to learn a word of blockchain to set a spending cap.** The chain
appears exactly once in the UI: a footnote reading "secured by zero-knowledge proofs on Midnight."

## Three doors, by commitment level

| Door | Who it is for | What it requires |
|---|---|---|
| **Browse freely** | Anyone curious | Nothing. The landing page, agent directory, and every agent's detail page (permissions, track record, "what it can never do") work with no wallet, no account, no cookie wall. |
| **Walletless demo** | Evaluators who want to feel the full loop in minutes | One command (`npm run app`): a server custodies a devnet wallet, and the browser drives real credentials, real proofs, real receipts. |
| **Bring your own wallet** | Users who want self-custody | Any Midnight DApp-connector wallet: Lace, Gero, or 1AM. The wallet signs, and with an embedded prover (1AM has one) also proves, every credential; keys never leave it. |

## Connect-on-demand, not connect-to-enter

The wallet gate appears only at the moment it is needed: the first tap on *Hire*. If no wallet is connected, Grant
routes to a one-step onboarding screen ("Bring your own keys"), and after connecting it resumes *exactly where the
user was*: the permission sheet for the agent they chose opens automatically. Nobody re-navigates.

## Language choices that do the onboarding

- "Hire" and "Fire", not mint and revoke. "Credential", not token. "Receipt", not transaction.
- The permission sheet mirrors OS prompt anatomy people have tapped a thousand times, including "you can lower
  this" beside the cap.
- Proving time is framed as care, not latency: *"Issuing private credential… your wallet signs."*
- Failure copy sells the guarantee: *"Blocked before it happened. No valid proof can exist for it, so it never
  executed. Nothing to undo."*

## The parts that are still honest friction

On a local devnet, self-custody users must fund their wallet (the repo faucet sends NIGHT in one command) and let the
wallet generate DUST for fees, a step the wallet performs because fee-resource registration must be signed by the
key owner. This exact path is verified end-to-end (`npm run faucet -- --self-test`) and documented in the README.
Proving is not on this list: Grant delegates proof generation to the wallet's embedded prover when the
connector offers one, and requires a local proof server only for wallets without it.
The Wave-3 answer is passkey-based walletless onboarding, which removes the wallet concept for consumers entirely
while keeping self-custody semantics.
