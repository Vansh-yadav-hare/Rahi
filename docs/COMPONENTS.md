# Components

Five app-specific components sit on top of the shadcn/ui primitives in
`src/components/ui`. Only `button.tsx` has been customised; the rest are stock.

---

## SiteHeader — `src/components/SiteHeader.tsx`

Sticky global navigation.

- **Shell:** `sticky top-0 z-50` with `bg-background/85 backdrop-blur-xl` and a
  hairline bottom border, so content scrolls under a frosted bar.
- **Brand:** mint-gradient rounded square holding a `ShieldCheck` glyph with
  `shadow-glow`, plus the wordmark in the display face. The shield is the whole
  brand argument in one icon.
- **Nav:** Find a ride, Safety, Offer a ride — `<Link>` items, hidden below `md`.
- **Actions:** ghost "Log in" + `hero` "Get started".
- **Mobile:** icon button (`aria-label="Open menu"`) toggles local `open` state
  and reveals a stacked panel; each link closes the menu on click.

Props: none. State: `open: boolean`.

---

## SiteFooter — `src/components/SiteFooter.tsx`

- `bg-secondary/50` band with a top border.
- Grid: `md:grid-cols-[1.4fr_1fr_1fr]` — brand blurb, then the **Ride** and
  **Trust** link columns defined in the local `columns` array.
- A bottom strip carries the copyright year and an explicit "demo interface"
  disclaimer, so illustrative ride data is never mistaken for live inventory.

Props: none.

---

## SearchForm — `src/components/SearchForm.tsx`

The primary conversion surface. Rendered twice: floating over the hero, and
compact at the top of the search results page.

**Props:** `compact?: boolean` (default `false`).
- `false` → `rounded-3xl`, `bg-card/95`, `shadow-lift`, `backdrop-blur-xl` (hero).
- `true` → `rounded-2xl`, opaque card, `shadow-soft` (in-page).

**Fields:** From, To (text, `MapPin` icon), Date (`CalendarDays`). All share the
`field` class string: flex row, `rounded-xl`, hover border tint, and a
`focus-within` ring with offset. Each input is wrapped in a `<label>` with
`sr-only` text. Date is capped at `md:max-w-[11rem]`.

**Women-only toggle:** a `<button type="button">` with `aria-pressed`.
- Off: bordered, muted text; hovers to `border-royal-red/40 text-royal-red`.
- On: `bg-royal-red text-royal-red-foreground`, hover `bg-royal-red/90`.
- Both states carry the `focus-visible` ring; icon is `Venus`.

**Submit:** `hero` Button that calls `navigate({ to: "/search", search: {…} })`,
omitting empty values so the URL stays clean. Search params are the single
source of truth — the results page reads them back, making searches shareable.

**Mobile tuning:** `max-md:min-h-[3.25rem]`, `max-md:p-5`, `max-md:text-base`,
`touch-manipulation`, and full-width toggle/submit buttons.

State: `from`, `to`, `date`, `womenOnly`.

---

## RideCard — `src/components/RideCard.tsx`

A whole-card `<Link to="/ride/$rideId" params={{ rideId }}>` — the entire
surface is the target, not a trailing "View" link.

Layout, top to bottom:

1. **Time row** — depart time, an 8px rule, arrival time in muted text (display face).
2. **Route row** — `from → to` with an `ArrowRight`, duration appended from `sm` up.
3. **Price block** — right-aligned `₹{price}` at `text-2xl font-bold` with a
   "per seat" caption.
4. **Divider**, then the driver strip: accent-filled initials disc, name, amber
   star rating and trip count, `<TrustScore />`, then conditional badges —
   Women-only (`bg-trust/20`, `Venus`), Instant (`Zap`), seats remaining (`Users`).

Interaction: `hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift`
over `transition-smooth`.

**Props:** `{ ride: Ride }`.

---

## TrustScore — `src/components/TrustScore.tsx`

The signature badge: pill with `border-primary/25 bg-primary/10 text-primary`,
a `ShieldCheck` glyph, and the label `Trust {score}`.

**Props:** `score: number`, `size?: "sm" | "lg"` (sm: `px-2.5 py-1 text-xs`;
lg: `px-3.5 py-1.5 text-sm`), `className?: string` merged via `cn()`.

Used at `sm` in ride cards and at `lg` on the ride detail driver panel.

---

## Button — `src/components/ui/button.tsx`

Stock shadcn variants plus three project variants:

| Variant | Appearance | Use |
| --- | --- | --- |
| `hero` | Mint gradient fill, `shadow-glow`, lift on hover | Primary CTAs: Search, Get started, Book seat |
| `trust` | Amber `trust` fill with dark foreground | Verification / reassurance actions |
| `onDark` | Translucent white border and fill | Buttons placed on the hero gradient or ink bands |

Sizes are extended beyond the defaults for the tall hero controls. All variants
inherit `focus-visible` rings and `active:scale-[0.98]`.

---

## Conventions for new components

- Presentational only; data comes in via props from the route.
- Semantic tokens exclusively — no literal colours.
- Compose class strings with `cn()` from `@/lib/utils`.
- Every interactive element defines rest / hover / focus-visible / active.
- Icons come from `lucide-react` at `size-3.5` (inline) or `size-4`–`size-5` (standalone).
- Internal navigation uses `<Link to=… params=…>`, never `<a href>`.
