import { createFileRoute } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { SearchForm } from "@/components/SearchForm";
import { RideCard } from "@/components/RideCard";
import { filterRides } from "@/lib/rides";

type SearchParams = { from?: string; to?: string; women?: boolean };

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    from: typeof search.from === "string" ? search.from : undefined,
    to: typeof search.to === "string" ? search.to : undefined,
    women: search.women === true || search.women === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Find a Ride — Search Verified Carpools | RideSure" },
      {
        name: "description",
        content:
          "Search intercity carpool rides by route and date. Filter by women-only, instant booking and driver trust score.",
      },
      { property: "og:title", content: "Find a Ride — RideSure" },
      {
        property: "og:description",
        content: "Search verified carpool rides and compare driver trust scores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { from, to, women } = Route.useSearch();
  const results = filterRides(from, to, women);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <h1 className="font-display text-3xl font-bold md:text-4xl">
        {from && to ? `${from} → ${to}` : "Find a ride"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {results.length} verified {results.length === 1 ? "ride" : "rides"} matching your search.
      </p>

      <div className="mt-6">
        <SearchForm compact />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside className="h-fit rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold">
            <SlidersHorizontal className="size-4 text-primary" /> Filters
          </h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {[
              "Trust score 90+",
              "Instant booking",
              "Women-only rides",
              "Max 2 in the back",
              "Luggage space",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <span className="size-4 rounded border border-input" />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
            Results ranked by AI route match and cancellation risk.
          </p>
        </aside>

        <div className="grid gap-4">
          {results.length ? (
            results.map((ride) => <RideCard key={ride.id} ride={ride} />)
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="font-display text-lg font-semibold">No rides on this route yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try a nearby city or set an alert — we'll notify you when a verified driver posts.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
