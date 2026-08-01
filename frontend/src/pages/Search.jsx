import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import { SearchForm } from "@/components/SearchForm";
import { RideCard } from "@/components/RideCard";
import { filterRides } from "@/lib/rides";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const women = searchParams.get("women") === "true" || searchParams.get("women") === true;
  const results = filterRides(from, to, women);
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <h1 className="font-display text-3xl font-bold md:text-4xl">
        {from && to ? `${from} \u2192 ${to}` : "Find a ride"}
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
