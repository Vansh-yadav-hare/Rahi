# Pages & Routes

File-based routing under `src/routes`. `__root.tsx` is the shell; every other
file is a page. Each page declares its own `head()` with a unique title,
description and Open Graph pair.

| File | URL | Purpose |
| --- | --- | --- |
| `__root.tsx` | — | HTML shell, fonts, header/footer, error & 404 boundaries |
| `index.tsx` | `/` | Landing page |
| `search.tsx` | `/search` | Ride results with filters |
| `ride.$rideId.tsx` | `/ride/:rideId` | Ride detail and booking |
| `safety.tsx` | `/safety` | Safety centre |
| `offer.tsx` | `/offer` | Publish a ride (driver side) |

---

## `__root.tsx` — app shell

- `RootShell` renders `<html>/<head><HeadContent /></head><body>{children}<Scripts /></body>`.
- `head()` sets charset, viewport, the default RideSure title/description,
  `og:type=website`, `twitter:card=summary_large_image`, the compiled stylesheet
  URL, Google Fonts preconnects + the Space Grotesk / DM Sans stylesheet, and the favicon.
- `RootComponent` wraps everything in `QueryClientProvider` and a
  `flex min-h-screen flex-col` column: `SiteHeader` → `<main className="flex-1"><Outlet /></main>` → `SiteFooter`.
- `notFoundComponent`: centred 404 with a "Go home" link.
- `errorComponent`: friendly recovery card with "Try again"
  (`router.invalidate()` + `reset()`) and a home link; reports to
  `reportLovableError` in an effect.

No `og:image` here — that belongs on leaf routes only, otherwise the root value
would override every page.

---

## `/` — Landing (`index.tsx`)

Sections in order:

1. **Hero** — full-bleed `bg-gradient-hero` field with the `hero-ride.jpg`
   golden-hour photo, headline in the display face, a trust-led subhead, and the
   floating `SearchForm` (non-compact) overlapping the section edge.
2. **Trust pillars** — six cards: ID verification, face match, vehicle docs,
   live tracking, SOS, AI trust score. Each is an icon disc + title + one line.
3. **How it works** — three numbered steps: search a route, check the trust
   score, book and track.
4. **Live rides** — a grid of `RideCard`s from the mock dataset with a link
   through to `/search`.
5. **Closing CTA** — ink/gradient band with `onDark` buttons.

---

## `/search` — Results (`search.tsx`)

- `validateSearch` normalises `from`, `to`, and `women` (accepting `true` or
  `"true"`) into a typed `SearchParams` object.
- Title reads `${from} → ${to}` when both are present, otherwise "Find a ride";
  the subhead reports the result count with correct singular/plural.
- A compact `SearchForm` sits under the heading so the query can be refined
  without going back.
- Layout: `lg:grid-cols-[15rem_1fr]`.
  - **Sidebar** — a `h-fit` card of filter rows (Trust score 90+, Instant
    booking, Women-only, Max 2 in the back, Luggage space) with a footnote
    explaining that ranking uses AI route match and cancellation risk. These are
    presentational placeholders.
  - **Results** — `filterRides(from, to, women)` mapped to `RideCard`s, or a
    dashed empty state suggesting a nearby city or a ride alert.

---

## `/ride/$rideId` — Ride detail (`ride.$rideId.tsx`)

- Reads `rideId` from params and resolves it with `getRide`; an unknown id
  renders the not-found path.
- Content column: route timeline (origin → intermediate stops → destination as
  connected dots), ride facts (date, duration, price, seats), perks chips, and
  the driver panel — avatar, name, rating, trip count, join year, vehicle, the
  large `TrustScore` badge, and one chip per completed verification.
- Aside: sticky booking panel with per-seat price, seat selector, total, and a
  `hero` "Book seat" / "Request to book" CTA depending on `instantBook`, plus
  reassurance microcopy about tracking and SOS.

---

## `/safety` — Safety centre (`safety.tsx`)

Explains the verification stack layer by layer — government ID, live face
match, vehicle document checks, in-trip live tracking with a shareable family
link, one-tap SOS, and how the AI trust score is computed from verification
depth, completed trips, ratings and cancellation behaviour. Closes with the
women-only ride policy, which is why royal red exists as a token.

---

## `/offer` — Publish a ride (`offer.tsx`)

The driver-facing mirror of the search form: route, date and time, seats, price
per seat, an instant-booking switch, a women-only-passengers switch, and a
summary of what verification a driver must complete before publishing.

---

## Adding a page

1. Create `src/routes/<name>.tsx` with
   `createFileRoute("/<name>")({ head, component })` — the string must match the
   filename mapping exactly.
2. Give it its own `head()`: unique title (< 60 chars), description (< 160),
   `og:title`, `og:description`.
3. Add the link to the `nav` array in `SiteHeader` and/or the `columns` array in
   `SiteFooter`.
4. Never edit `src/routeTree.gen.ts` — the plugin regenerates it.
