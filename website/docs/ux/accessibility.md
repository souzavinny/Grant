---
title: Accessibility
---

# Accessibility

A product whose thesis is "trust for everyone" cannot gate that trust on perfect vision, fine motor control, or
tolerance for motion. This page states our accessibility principles, what the current build does, and what is
planned.

## Principles

- **Meaning never lives in color alone.** Verdicts pair color with a word and a shape: the green check always says
  "PROOF VERIFIED", the red stamp always says "REVOKED" or "BLOCKED". A monochrome screenshot of Grant loses no
  information.
- **High-contrast by default.** Near-black ink (`#201D16`) on warm paper (`#F3EFE6`) and hard 1px borders give text
  and controls contrast well above the WCAG AA 4.5:1 threshold for body text; the design system has no low-contrast
  gray-on-gray states.
- **Motion is optional.** The few orchestrated animations (sheet slide-up, proving pulse, stamp-in, the seal's slow
  ring) all collapse under `prefers-reduced-motion` — implemented in `grant.css`, not aspirational.
- **Plain language is an accessibility feature.** "Hire", "Fire", "receipt", "you can lower this" — vocabulary
  chosen for a reader with no crypto context is the same vocabulary that serves readers with cognitive-load
  constraints. Error copy states what happened and what happens next, in one sentence.
- **One decision per screen.** The permission sheet asks exactly one question. Dense dual-ledger detail lives on the
  engineer console, deliberately away from the consumer path.

## Current state (Wave 1)

Implemented: reduced-motion support, high-contrast token palette, text-paired verdict icons, semantic buttons for
all actions, readable focus states inherited from native controls, and layouts that reflow at mobile widths.
Screen-reader labeling exists where React defaults provide it, but a full audit pass (explicit `aria-label`s on the
spend rings and stamps, live-region announcements when a receipt lands or a proof completes, a tested tab order
through the permission sheet) has not yet been performed; it heads the Wave 2 plan below.

## Planned (Wave 2)

- Keyboard-complete walkthrough of the whole hire → run → fire loop, with visible focus rings in the design system's
  ink color.
- ARIA live regions for the three async moments (proving, receipt landed, revocation confirmed) so non-visual users
  get the same "it worked" feedback the rings and stamps provide visually.
- Automated axe-core checks in the e2e suite, so accessibility regressions fail CI like any other regression.
