# Data Model

All ride data is static and lives in `src/lib/rides.ts`. There is no backend in
this export; swapping the module for real fetches is the only change needed to
make the UI live.

## The `Ride` type

```ts
type Ride = {
  id: string;              // slug used as the /ride/$rideId param, e.g. "bng-mys-0730"
  from: string;            // origin city
  to: string;              // destination city
  date: string;            // display string, e.g. "Fri, 31 Jul"
  departTime: string;      // "07:30"
  arriveTime: string;      // "10:45"
  duration: string;        // "3h 15m"
  price: number;           // INR per seat
  seatsAvailable: number;
  womenOnly: boolean;      // drives the royal-red badge and filter
  instantBook: boolean;    // book immediately vs request to book
  driver: {
    name: string;
    initials: string;      // rendered in the accent avatar disc
    trustScore: number;    // 0–100, shown by <TrustScore />
    rating: number;        // 0–5
    trips: number;         // completed trips
    verified: string[];    // e.g. ["Govt ID", "Face match", "Vehicle docs"]
    car: string;           // "Hyundai Verna · White"
    joined: string;        // year
  };
  stops: string[];         // intermediate stops for the detail timeline
  perks: string[];         // chips: "Live tracking", "AC", "Pet friendly"
};
```

## The dataset

Six illustrative intercity Indian routes, chosen to exercise every UI state:

| id | Route | Price | Seats | Women-only | Instant | Trust |
| --- | --- | --- | --- | --- | --- | --- |
| `bng-mys-0730` | Bengaluru → Mysuru | ₹449 | 3 | no | yes | 96 |
| `pun-mum-0730` | Pune → Mumbai | ₹599 | 2 | **yes** | yes | 99 |
| `del-jai-0731` | Delhi → Jaipur | ₹749 | 4 | no | **no** | 91 |
| `hyd-vij-0731` | Hyderabad → Vijayawada | ₹680 | **1** | no | yes | 94 |
| `che-pon-0801` | Chennai → Pondicherry | ₹399 | 3 | no | yes | 88 |
| `ahm-udr-0801` | Ahmedabad → Udaipur | ₹820 | 2 | **yes** | no | 97 |

Coverage: two women-only rides, two request-to-book rides, a last-seat ride, and
a spread of trust scores from 88 to 99 so the badge is never uniformly green.

## Helpers

```ts
getRide(id: string): Ride | undefined
```
Used by `/ride/$rideId`; `undefined` triggers the not-found path.

```ts
filterRides(from?: string, to?: string, womenOnly?: boolean): Ride[]
```
Each argument is optional and ANDed together. City matching is a
case-insensitive substring test, so "beng" matches "Bengaluru". `womenOnly`
only narrows when truthy — `false`/`undefined` returns both kinds.

## Search-param contract

The URL is the state container. `SearchForm` writes
`{ from, to, women }` (omitting empty values) and `/search` reads them back
through `validateSearch`, which coerces `women` from `true` or the string
`"true"`. Results are therefore linkable, bookmarkable and SSR-safe.

## Swapping in a real backend

1. Replace the exports of `src/lib/rides.ts` with async functions (or a
   TanStack Query `queryOptions` factory).
2. Prefetch in each route's `loader` via
   `context.queryClient.ensureQueryData(...)` and read with `useSuspenseQuery`.
3. Keep the `Ride` type as the contract — no component change is required as
   long as the shape holds.
