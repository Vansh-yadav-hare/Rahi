import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal, Loader2, AlertCircle } from "lucide-react";
import { SearchForm } from "@/components/SearchForm";
import { RideCard } from "@/components/RideCard";
import { normalizeRide } from "@/lib/rides";
import apiClient from "@/services/apiClient";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const womenQuery = searchParams.get("women") === "true";

  const [apiRides, setApiRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sidebar Filter States
  const [filterTrust, setFilterTrust] = useState(false);
  const [filterInstant, setFilterInstant] = useState(false);
  const [filterWomen, setFilterWomen] = useState(womenQuery);
  const [filterMaxTwo, setFilterMaxTwo] = useState(false);

  // Sync women filter with query param updates
  useEffect(() => {
    setFilterWomen(womenQuery);
  }, [womenQuery]);

  // Fetch search results from backend API
  useEffect(() => {
    const fetchRides = async () => {
      setError("");
      setLoading(true);
      try {
        const response = await apiClient.get("/rides/search", {
          params: {
            from: from || undefined,
            to: to || undefined,
            date: searchParams.get("date") || undefined
          }
        });
        
        // Normalize the API results
        const normalized = response.data.map(normalizeRide);
        setApiRides(normalized);
      } catch (err) {
        console.error("Fetch rides error:", err);
        setError("Failed to retrieve rides from the server. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, [from, to, searchParams]);

  // Apply filters locally
  const displayedRides = apiRides.filter((ride) => {
    if (filterTrust && ride.driver.trustScore < 90) return false;
    if (filterInstant && !ride.instantBook) return false;
    if (filterWomen && !ride.womenOnly) return false;
    if (filterMaxTwo && !ride.perks.includes("Max 2 in back")) return false;
    return true;
  });

  const getShortAddress = (fullAddress) => {
    if (!fullAddress) return "";
    const parts = fullAddress.split(", ");
    return parts.length > 0 ? parts[0] : fullAddress;
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <h1 className="font-display text-3xl font-bold md:text-4xl text-foreground">
        {from && to ? `${getShortAddress(from)} → ${getShortAddress(to)}` : "Find a ride"}
      </h1>
      
      <p className="mt-2 text-muted-foreground text-sm">
        {loading ? (
          "Searching for verified rides..."
        ) : (
          `${displayedRides.length} verified ${displayedRides.length === 1 ? "ride" : "rides"} matching your criteria.`
        )}
      </p>

      <div className="mt-6">
        <SearchForm compact />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[16rem_1fr]">
        {/* Filters Sidebar */}
        <aside className="h-fit rounded-2xl border border-border/40 bg-card/45 backdrop-blur-md p-5 shadow-soft">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
            <SlidersHorizontal className="size-4 text-primary" /> Filters
          </h2>
          
          <ul className="mt-4 space-y-3.5 text-sm">
            {/* Trust score 90+ */}
            <li className="flex items-center gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-muted-foreground hover:text-foreground transition-smooth font-medium">
                <input
                  type="checkbox"
                  checked={filterTrust}
                  onChange={(e) => setFilterTrust(e.target.checked)}
                  className="rounded border-border/40 text-primary focus:ring-primary/20 accent-primary"
                />
                Trust score 90+
              </label>
            </li>

            {/* Instant Booking */}
            <li className="flex items-center gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-muted-foreground hover:text-foreground transition-smooth font-medium">
                <input
                  type="checkbox"
                  checked={filterInstant}
                  onChange={(e) => setFilterInstant(e.target.checked)}
                  className="rounded border-border/40 text-primary focus:ring-primary/20 accent-primary"
                />
                Instant booking
              </label>
            </li>

            {/* Women-only */}
            <li className="flex items-center gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-muted-foreground hover:text-foreground transition-smooth font-medium">
                <input
                  type="checkbox"
                  checked={filterWomen}
                  onChange={(e) => setFilterWomen(e.target.checked)}
                  className="rounded border-border/40 text-primary focus:ring-primary/20 accent-primary"
                />
                Women-only rides
              </label>
            </li>

            {/* Max 2 in back */}
            <li className="flex items-center gap-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-muted-foreground hover:text-foreground transition-smooth font-medium">
                <input
                  type="checkbox"
                  checked={filterMaxTwo}
                  onChange={(e) => setFilterMaxTwo(e.target.checked)}
                  className="rounded border-border/40 text-primary focus:ring-primary/20 accent-primary"
                />
                Max 2 in the back
              </label>
            </li>
          </ul>

          <p className="mt-5 border-t border-border/30 pt-4 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Results ranked by trust score & detours.
          </p>
        </aside>

        {/* Results Listings */}
        <div className="grid gap-4 h-fit">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 rounded-2xl border border-dashed border-border/40 bg-card/25 backdrop-blur-sm">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground font-medium">Loading search results...</p>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-2xl bg-destructive/10 p-5 text-sm text-destructive border border-destructive/20">
              <AlertCircle className="size-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold">Search failed</h4>
                <p className="mt-1 text-xs">{error}</p>
              </div>
            </div>
          ) : displayedRides.length ? (
            displayedRides.map((ride) => <RideCard key={ride.id} ride={ride} />)
          ) : (
            <div className="rounded-2xl border border-dashed border-border/40 bg-card/25 backdrop-blur-sm p-12 text-center">
              <p className="font-display text-lg font-bold text-foreground">No rides on this route yet</p>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                We couldn't find any active rides starting from your location. Try entering nearby cities or adjust your filter checklist.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
