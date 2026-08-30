---
title: Interface design
---

# Interface design

The design language was built to make an invisible guarantee visible — and to refuse the crypto-dApp aesthetic
entirely. No dark theme, no glow, no coins.

## The brand idea: the perforated seal

Grant's mark is a solid ink disc of approval inside a dashed ring — the permission boundary. That grammar runs the
whole icon system: **solid strokes are the thing itself; dashed strokes are the limits around it.** A credential is
a solid card in a dashed frame; expiry is a clock with a dashed rim; the pseudonym is a person in a dashed circle.
Users absorb the system's core idea (things, bounded) without reading a word.

## Design tokens

| Role | Choice | Why |
|---|---|---|
| Ground | Warm paper `#F3EFE6` with a faint ruled-line texture | Documents and tickets, not terminals — permissions are paperwork made pleasant |
| Ink | `#201D16`, hard 1px borders, offset block shadows | Print-like decisiveness; things feel stamped, not floated |
| Accent | "Allow blue" `#2440D4` | The color of the Allow button *is* the brand — the product is that gesture |
| Display type | Instrument Serif | Editorial warmth; headlines read like statements, not UI labels |
| Body / data | Schibsted Grotesk / IBM Plex Mono | Mono strictly for ledger facts (ids, receipts) — a visual cue for "this is on-chain truth" |
| Verdict colors | Green verified · red blocked/revoked | One color per icon, never decorative |

## Signature components

- **The permission sheet** — bottom-sheet with OS-prompt anatomy: numbered request (№ 0007), grant list with checks,
  inline cap stepper ("you can lower this"), pseudonym note, Don't allow / Allow. The single screen that explains
  the product.
- **Spend rings** — each hired agent's card wears its budget as a ring that turns red near the cap; enforcement has
  a gauge.
- **Stamps** — REVOKED and PROOF VERIFIED land as tilted rubber stamps (the seal never tilts; stamps always do).
  Finality gets a physical metaphor.
- **The receipt document** — receipts render as paper documents with two columns: "what this receipt contains" vs
  "what it deliberately omits." Privacy becomes an artifact you can read, not a claim.
- **The blocked box** — the limits-test rejection is a designed moment with its own copy, because watching
  enforcement work is the best sales pitch the product has.

## Motion

Three orchestrated moments — sheet slide-up, proving pulse, stamp-in — and almost nothing else. The seal's dashed
ring rotates once per 24 seconds, an ambient signature. All motion collapses under `prefers-reduced-motion`.

:::note Where it lives
The full design system (logo lockups, 12-icon set, usage rules) ships in the repo as
`agentpass-ui/public/brand.html`; the dApp implements it as React components + `grant.css` tokens.
:::
