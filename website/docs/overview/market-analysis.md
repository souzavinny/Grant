---
title: Market analysis & opportunity
---

# Market analysis and opportunity

## Market overview

Grant sits at the intersection of two markets moving in the same direction: **agentic commerce** (AI agents
transacting on humans' behalf) and **privacy-preserving digital identity** (proving facts without revealing data).
Forecasts for the first vary widely by where analysts draw the boundary, but even the conservative end is enormous:

| Forecast | Figure | Source |
|---|---|---|
| Global agentic-commerce spend by 2030 | **$1.5 trillion** | Juniper Research |
| 2030 opportunity, broader boundary | **$3–5 trillion** | McKinsey |
| US agentic e-commerce by 2030 | **$190–385 billion** | Morgan Stanley |
| US market share of e-commerce by 2030 | 15–25% ($300–500B) | Bain & Company |
| Agentic-payments infrastructure, 2025 → 2032 | $7B → **$93B** | industry analysis |
| B2B buying mediated by agents by 2028 | 90% (>$15T flow) | Gartner |

Whatever boundary one prefers, the direction is not in dispute, and every one of those transactions needs an answer
to the same question: *is this agent authorized, and by whom?*

## Why now: three converging forces

1. **The rails shipped in 2025.** Visa Intelligent Commerce (Apr 2025), Mastercard Agent Pay (Apr 2025), Google AP2
   with 60+ partners (Sep 2025), Stripe/OpenAI's agentic checkout, Coinbase x402. Settlement is solved;
   authorization privacy is not.
2. **"Know Your Agent" is becoming a compliance topic.** Bank supervisors have begun asking how know-your-customer (KYC) checks extend to
   agents acting for customers. Whoever defines the privacy-respecting version of KYA owns a standard.
3. **Regulation normalized proof-based identity.** eIDAS 2.0 obliges all 27 EU states to ship digital identity
   wallets and explicitly encourages ZKPs; the EU's age-verification blueprint contains a formal ZKP annex. "Prove
   the fact, hide the data" is becoming a regulatory default, not a crypto niche.

## Identified market gaps

1. **No privacy layer on any agent-payment rail.** AP2 mandates are signed verifiable credentials shared with
   merchants in the clear; card-rail tokens tie actions to identified cardholders.
2. **No scoped delegation primitive.** Session keys (for example, EIP-7702) bound *which key* can act, not *what a specific
   agent may do* under private, revocable terms.
3. **No verifiable agent reputation.** Marketplaces rank agents by unverifiable reviews; nothing binds an agent's
   claimed record to cryptographic evidence.
4. **Nothing on privacy chains.** Across the Midnight, Aleo, and Aztec ecosystems, no shipped
   project does private agent delegation (as of August 2026).

## Competitive landscape

| Player | Focus | Key limitation | Grant / AgentPass advantage |
|---|---|---|---|
| Google AP2 | Agent payment mandates (VC-based) | Mandates identify the human; shared with merchants | Same authorization guarantee with the principal pseudonymous; bridge target, not enemy |
| Visa Intelligent Commerce / Mastercard Agent Pay | Agent-specific card tokens | Card rails: identified users, no scoped task semantics | Proof-gated authorization in front of the card token (Wave-3 bridge) |
| Stripe + OpenAI ACP | Agent checkout protocol | Merchant/processor sees the buyer; no user-set caps | User-set caps enforced at proof time; receipts verifiable without personal data |
| Coinbase x402 | HTTP-native stablecoin payments for agents | Settlement only; no delegation policy or privacy | Complementary: AgentPass authorizes, x402-style rails settle |
| EIP-7702 / session keys | Key-level delegation on EVM | Public policies, public spend, no human anonymity | Private terms, hidden caps, pseudonymous receipts |
| World ID / proof-of-personhood | Proving humanness | Identifies the human class, not what an agent may do; biometric controversies | Orthogonal: Grant binds actions to a mandate, not an iris |
| zkPassport / Self / Anon Aadhaar | ZK identity credentials (EVM-adjacent) | Prove who you are; no delegation or agent semantics | Composable later for the data-access grant (for example, passenger name) |
| OAuth scopes / virtual cards (Web2 status quo) | Scoped access, spend controls | Enforced by policy; provider sees everything; revocation is a support flow | Enforcement by proof; provider-free; revocation is a ledger fact |

## Blue-ocean framing

The competitive map has two crowded shores: *settlement rails* (identified, well-capitalized) and *ZK identity*
(privacy-strong, but proving *who*, not *may-do-what*). The open water between them, **private, revocable,
proof-enforced delegation**, is where Grant operates. The strategy is deliberately non-adversarial toward the
rails: they need a privacy layer more than they need another competitor, which is why the AP2/card bridge is a
roadmap item rather than a rival pitch.

## Serviceable market: a bottom-up sketch

Rather than claim a slice of a trillion-dollar TAM, the serviceable model is explicitly assumption-based (all
figures illustrative): if by 2028 agent platforms serving **10M delegating users** adopt credential-based
authorization for **20 tasks/user/month**, that is ~2.4B authorizations/year. At an infrastructure take of
$0.001–0.01 per authorization (see [revenue model](../business/revenue-model.md)), the authorization layer alone
supports a **$2.4M–$24M ARR** business before marketplace or enterprise streams, while every authorization is a
Midnight transaction, which is precisely the network-growth story the ecosystem funds.

## Go-to-market phases

- **Phase 1 (Buildathon waves, 2026):** prove the primitive and the consumer surface; seed the directory with
  first-party agents; publish the credential SDK draft.
- **Phase 2 (2027):** agent-developer SDK + manifest listing; 10–20 third-party agents; merchant verification SDK
  pilot with one commerce partner.
- **Phase 3 (2027+):** settlement bridge (escrow and/or AP2/card token gating); enterprise team plans; positioning
  AgentPass as the reference KYA-privacy layer.

## References

- Juniper Research: [Agentic commerce to generate $1.5T globally by 2030](https://www.juniperresearch.com/press/agentic-commerce-set-to-generate-15-trillion-globally-by-2030-as-payments-infrastructure-leaders-revealed/)
- Morgan Stanley: [Agentic commerce impact could reach $385B by 2030](https://www.morganstanley.com/insights/articles/agentic-commerce-market-impact-outlook)
- Bain & Company: [2030 forecast: agentic AI reshaping US retail](https://www.bain.com/insights/2030-forecast-how-agentic-ai-will-reshape-us-retail-snap-chart/)
- Stellagent: [Integrated McKinsey/Gartner/Bain forecast analysis](https://stellagent.ai/insights/agentic-commerce-market-size-forecast-2030)
- Crossmint: [Agentic payment protocols compared (AP2, ACP, x402)](https://www.crossmint.com/learn/agentic-payments-protocols-compared)
- Vellum: [Google AP2 protocol analysis](https://www.vellum.ai/blog/googles-ap2-a-new-protocol-for-ai-agent-payments)
- Eco: ["Know Your Agent" explainer](https://eco.com/support/en/articles/14846277-know-your-agent-kya-identity-for-agent-payments)
- Gataca: [eIDAS 2.0 timeline](https://www.gataca.io/resources/blog/eIDAS2-timeline/)
- EU Age Verification Blueprint: [ZKP annex](https://ageverification.dev/Technical%20Specification/annexes/annex-B/annex-B-zkp/)
- Biometric Update: [Humanity Protocol pivots from proof-of-personhood](https://www.biometricupdate.com/202602/humanity-protocol-pivots-from-proof-of-personhood-but-sticks-with-palm-biometrics)
- Decrypt: [Billions Network launch (non-biometric identity)](https://decrypt.co/308196/billions-network-launches-privacy-focused-digital-id-to-rival-sam-altmans-worldcoin)
- Midnight: [Virtual hackathon winners (ecosystem signal)](https://midnight.network/blog/virtual-hackathon-winners)
