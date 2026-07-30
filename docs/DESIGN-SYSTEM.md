# RideSure Design System

Everything below lives in a single source of truth: `src/styles.css`.
Components never hardcode colours — they consume semantic Tailwind classes that
map to CSS custom properties, so light mode, dark mode and future themes all
work without touching component code.

---

## 1. Design intent

RideSure sells **trust before price**. Ride sharing with strangers is an
emotional purchase, so the interface is built to feel calm, verified and
institutional rather than playful or discount-driven.

Three principles drive every decision:

| Principle | How it shows up |
| --- | --- |
| **Trust is visual, not textual** | A trust score badge sits on every ride card and driver block; verification is shown as discrete, countable chips rather than prose. |
| **Calm surfaces, confident accents** | Near-white warm-green canvas, generous whitespace, one saturated accent used sparingly for actions. |
| **Nothing decorative that isn't informative** | No illustration filler, no gradient-on-white SaaS look. The only gradients are the hero field and the logo mark. |

Deliberately avoided: purple/indigo gradients, Inter/Poppins defaults,
interchangeable hero → three-cards → CTA marketing rhythm.

---

## 2. Colour

All values are **OKLCH** for perceptually even lightness ramps and safe opacity
mixing. Tokens are declared under `:root` and overridden under `.dark`, then
exposed to Tailwind through the `@theme inline` block as `--color-*`.

### 2.1 Core palette (light)

| Token | Value | Tailwind class | Role |
| --- | --- | --- | --- |
| `--background` | `oklch(0.987 0.008 120)` | `bg-background` | Page canvas — warm off-white with a green cast |
| `--foreground` | `oklch(0.21 0.035 165)` | `text-foreground` | Primary text: deep forest ink, never pure black |
| `--card` | `oklch(1 0 0)` | `bg-card` | Elevated surfaces: ride cards, search bar, panels |
| `--primary` | `oklch(0.48 0.108 168)` | `bg-primary` | Forest green — actions, links, active states |
| `--primary-glow` | `oklch(0.74 0.148 165)` | `bg-primary-glow` | Electric mint — gradient partner, glow rings |
| `--secondary` | `oklch(0.955 0.018 155)` | `bg-secondary` | Quiet chips, footer band, inert pills |
| `--muted-foreground` | `oklch(0.52 0.026 165)` | `text-muted-foreground` | Metadata, placeholders, captions |
| `--accent` | `oklch(0.93 0.05 165)` | `bg-accent` | Avatar discs, subtle tinted fills |
| `--trust` | `oklch(0.79 0.152 72)` | `text-trust` | Warm amber — ratings, trust signalling |
| `--royal-red` | `oklch(0.55 0.22 25)` | `bg-royal-red` | The Women-only filter in its active state |
| `--destructive` | `oklch(0.577 0.222 22)` | `bg-destructive` | Errors and destructive actions only |
| `--ink` | `oklch(0.22 0.041 168)` | `bg-ink` | Dark section blocks inside a light page |
| `--border` / `--input` | `oklch(0.905 / 0.9 …)` | `border-border` | Hairlines and field outlines |
| `--ring` | `= --primary` | `ring-ring` | Focus ring colour |

### 2.2 Dark mode

`.dark` inverts the relationship rather than the hex values: the canvas becomes
deep forest (`oklch(0.17 0.03 168)`), and `--primary` **brightens** to the mint
(`oklch(0.74 0.148 165)`) so contrast against dark surfaces stays above 4.5:1.
Borders switch to translucent white (`oklch(1 0 0 / 12%)`) so elevation reads
as light bleed rather than a drawn line. `--royal-red` lightens to
`oklch(0.62 0.2 25)` for the same reason.

### 2.3 Usage rules

- Never use `text-white`, `bg-black`, `text-red-500` or `bg-[#…]` in a component.
- Pair every background token with its `-foreground` partner
  (`bg-primary text-primary-foreground`).
- Tint instead of introducing new hues: `bg-primary/10`, `border-primary/25`,
  `bg-trust/20`.
- Semantic meaning is fixed: amber = reputation/trust, green = action/verified,
  royal red = the women-only safety filter, destructive red = danger only.
  Do not reuse royal red for generic emphasis.

### 2.4 Gradients, elevation, motion

Declared as raw custom properties and surfaced as `@utility` classes:

| Utility | Definition | Where used |
| --- | --- | --- |
| `bg-gradient-hero` | 135° three-stop forest ramp (`0.24 → 0.32 → 0.44` L) | Landing hero field, dark feature bands |
| `bg-gradient-mint` | 120° `primary → primary-glow` | Logo mark, small emphasis discs |
| `shadow-soft` | 1px hairline + `24px -12px` diffuse | Resting cards |
| `shadow-lift` | `60px -28px` deep diffuse | Hover state, floating search bar |
| `shadow-glow` | 1px mint ring + coloured drop | Logo, primary CTA emphasis |
| `transition-smooth` | `240ms cubic-bezier(0.22, 1, 0.36, 1)` | Every hover/active transition |

Motion is one duration and one easing curve across the app — a decelerating
curve that finishes fast, so the UI feels responsive rather than animated.
Hover lifts are `-translate-y-0.5`; presses are `active:scale-[0.98]`.

---

## 3. Typography

Loaded via `<link>` in `src/routes/__root.tsx` (never `@import` in CSS — Tailwind
v4's Lightning CSS resolves imports from disk).

| Family | Token | Weights | Use |
| --- | --- | --- | --- |
| **Space Grotesk** | `--font-display` | 500 / 600 / 700 | `h1–h4`, `.font-display`, prices, numeric emphasis |
| **DM Sans** | `--font-sans` | 400 / 500 / 700 | Body, labels, metadata, buttons |

A base layer applies the display face to all headings with `-0.02em` tracking,
so headings are tight and engineered while body copy stays open and readable.
Prices use the display face at `text-2xl font-bold` because the number is the
scannable unit on a ride card.

Scale in practice: page titles `text-3xl md:text-4xl`, section headings
`text-2xl md:text-3xl`, card titles `text-lg`, body `text-sm`, metadata
`text-xs`. Inputs step up to `text-base` under `md` to block iOS zoom-on-focus.

---

## 4. Shape and spacing

- `--radius: 0.875rem` is the base; the theme derives `sm → 4xl` from it.
  Fields and chips use `rounded-xl`, cards `rounded-2xl`, the hero search panel
  `rounded-3xl`, pills `rounded-full`.
- Page shell: `mx-auto max-w-6xl px-5`, vertical rhythm `py-10 md:py-14` for
  content pages and `py-16 md:py-24` for landing sections.
- Card interior padding: `p-5`; grid gaps `gap-4` for lists, `gap-8` for layout
  columns. The search results page is a `lg:grid-cols-[15rem_1fr]` sidebar split
  that collapses to a single column below `lg`.

---

## 5. Interaction states

Every interactive element defines all four states. This is enforced in the
SearchForm and Button and should be matched by any new control.

| State | Pattern |
| --- | --- |
| **Rest** | `border-border bg-card` (fields) or the variant fill (buttons) |
| **Hover** | `hover:border-primary/40`, `hover:shadow-lift`, `hover:-translate-y-0.5` |
| **Focus** | `focus-visible:ring-2 ring-ring/30 ring-offset-2 ring-offset-background`; text fields use `focus-within:` so the ring wraps the whole labelled field, not the bare `<input>` |
| **Active/pressed** | `active:scale-[0.98] active:brightness-95` |
| **Selected/on** | Filled token background, e.g. Women-only → `bg-royal-red text-royal-red-foreground` with `hover:bg-royal-red/90` |

Native outlines are removed only where a visible replacement ring exists.

---

## 6. Accessibility

- Contrast: body and metadata pass WCAG AA in both themes; `muted-foreground`
  is deliberately capped at `L 0.52` (light) / `0.72` (dark) to stay compliant.
- Every icon-only control has an `aria-label` (e.g. the mobile menu trigger).
- Toggles expose `aria-pressed`; the Women-only filter is a real `<button>`,
  not a styled div.
- Inputs are wrapped in `<label>` with `sr-only` text, so placeholders are never
  the only label.
- Focus is always visible and never colour-only — the ring adds an offset halo.
- Tap targets are `min-h-[3.25rem]` under `md`, above the 44px guideline, with
  `touch-manipulation` to kill the 300ms delay.

---

## 7. Responsive strategy

Mobile-first, with three meaningful breakpoints:

| Range | Behaviour |
| --- | --- |
| `< md` (mobile) | Single column; search fields stack with `gap-4`, larger padding `p-5`, full-width Women-only and Search buttons; header collapses to a hamburger sheet |
| `md` (tablet) | Search bar becomes a horizontal row; footer goes 3-column; card metadata reveals the duration segment |
| `lg+` (desktop) | Search results gain the 15rem filter sidebar; landing grids run 3-up; max width caps at `max-w-6xl` |

---

## 8. Extending the system

1. Add the raw token to `:root` **and** `.dark` in `src/styles.css`.
2. Register it in `@theme inline` as `--color-<name>` so Tailwind emits
   `bg-<name>` / `text-<name>` / `border-<name>`.
3. Add a `-foreground` partner if anything will sit on top of it.
4. Use it through the semantic class — never inline the OKLCH value.
