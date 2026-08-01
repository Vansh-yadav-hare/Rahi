import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { MapPin, CalendarDays, Search, Venus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SearchForm({ compact = false }) {
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [womenOnly, setWomenOnly] = useState(false);

  // Suggestions state
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showFromList, setShowFromList] = useState(false);
  const [showToList, setShowToList] = useState(false);
  const [loadingFrom, setLoadingFrom] = useState(false);
  const [loadingTo, setLoadingTo] = useState(false);

  // Refs for tracking selection vs typing
  const fromSelectedRef = useRef(false);
  const toSelectedRef = useRef(false);
  const fromContainerRef = useRef(null);
  const toContainerRef = useRef(null);

  // Debounced search for Leaving From
  useEffect(() => {
    if (fromSelectedRef.current) {
      fromSelectedRef.current = false;
      return;
    }

    if (!from || from.trim().length < 3) {
      setFromSuggestions([]);
      return;
    }

    setLoadingFrom(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(from)}&format=json&limit=5&addressdetails=1&countrycodes=in`
        );
        if (response.ok) {
          const data = await response.json();
          const uniqueResults = data.map((item) => {
            const parts = item.display_name.split(", ");
            const shortName = parts.slice(0, 3).join(", ");
            return {
              fullName: item.display_name,
              shortName: shortName,
              name: item.name || parts[0],
            };
          });
          setFromSuggestions(uniqueResults);
        }
      } catch (err) {
        console.error("OSM leaving-from autocomplete fetch error:", err);
      } finally {
        setLoadingFrom(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [from]);

  // Debounced search for Going To
  useEffect(() => {
    if (toSelectedRef.current) {
      toSelectedRef.current = false;
      return;
    }

    if (!to || to.trim().length < 3) {
      setToSuggestions([]);
      return;
    }

    setLoadingTo(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(to)}&format=json&limit=5&addressdetails=1&countrycodes=in`
        );
        if (response.ok) {
          const data = await response.json();
          const uniqueResults = data.map((item) => {
            const parts = item.display_name.split(", ");
            const shortName = parts.slice(0, 3).join(", ");
            return {
              fullName: item.display_name,
              shortName: shortName,
              name: item.name || parts[0],
            };
          });
          setToSuggestions(uniqueResults);
        }
      } catch (err) {
        console.error("OSM going-to autocomplete fetch error:", err);
      } finally {
        setLoadingTo(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [to]);

  // Dismiss suggestions lists when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (fromContainerRef.current && !fromContainerRef.current.contains(event.target)) {
        setShowFromList(false);
      }
      if (toContainerRef.current && !toContainerRef.current.contains(event.target)) {
        setShowToList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectFrom = (suggestion) => {
    fromSelectedRef.current = true;
    setFrom(suggestion.name);
    setFromSuggestions([]);
    setShowFromList(false);
  };

  const handleSelectTo = (suggestion) => {
    toSelectedRef.current = true;
    setTo(suggestion.name);
    setToSuggestions([]);
    setShowToList(false);
  };

  function onSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (womenOnly) params.set("women", "true");
    setShowFromList(false);
    setShowToList(false);
    navigate(`/search?${params.toString()}`);
  }

  const fieldClass = compact
    ? "flex flex-1 items-center gap-2 rounded-xl border border-border/40 bg-background/25 px-3.5 py-3 max-md:min-h-[3.25rem] max-md:px-4 max-md:py-3.5 touch-manipulation transition-smooth hover:bg-background/45 hover:border-primary/30 focus-within:bg-background/55 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/20 focus-within:ring-offset-2 focus-within:ring-offset-background"
    : "flex flex-1 items-center gap-2 rounded-xl border border-white/40 bg-white/60 px-3.5 py-3 max-md:min-h-[3.25rem] max-md:px-4 max-md:py-3.5 touch-manipulation transition-smooth hover:bg-white/80 hover:border-primary/30 focus-within:bg-white/95 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/20 focus-within:ring-offset-2 focus-within:ring-offset-background";

  const containerClass = compact
    ? "flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/30 p-4 max-md:p-5 shadow-soft backdrop-blur-md md:flex-row md:items-center"
    : "flex flex-col gap-4 rounded-3xl border border-white/30 bg-white/75 p-4 max-md:p-5 shadow-lift shadow-glow/5 backdrop-blur-md md:flex-row md:items-center";

  const womenOnlyClass = compact
    ? `flex w-full md:w-auto items-center justify-center gap-2 rounded-xl border px-4 py-3 max-md:min-h-[3.25rem] max-md:px-5 max-md:py-3.5 text-sm font-semibold touch-manipulation transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        womenOnly
          ? "border-royal-red bg-royal-red text-royal-red-foreground shadow-soft hover:bg-royal-red/90"
          : "border-border/40 bg-background/25 text-foreground/80 hover:bg-background/45 hover:border-royal-red/40 hover:text-royal-red"
      }`
    : `flex w-full md:w-auto items-center justify-center gap-2 rounded-xl border px-4 py-3 max-md:min-h-[3.25rem] max-md:px-5 max-md:py-3.5 text-sm font-semibold touch-manipulation transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        womenOnly
          ? "border-royal-red bg-royal-red text-royal-red-foreground shadow-soft hover:bg-royal-red/90"
          : "border-white/40 bg-white/60 text-foreground/80 hover:bg-white/80 hover:border-royal-red/40 hover:text-royal-red"
      }`;

  return (
    <form onSubmit={onSubmit} className={containerClass}>
      <div ref={fromContainerRef} className="relative flex flex-1">
        <label className={`${fieldClass} w-full`}>
          {loadingFrom ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
          ) : (
            <MapPin className="size-4 shrink-0 text-primary" />
          )}
          <span className="sr-only">Leaving from</span>
          <input
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setShowFromList(true);
            }}
            onFocus={() => setShowFromList(true)}
            placeholder="Leaving from"
            className="w-full bg-transparent text-sm max-md:text-base outline-none placeholder:text-muted-foreground"
          />
        </label>

        {showFromList && fromSuggestions.length > 0 && (
          <ul className="absolute top-full left-0 z-50 mt-2 w-full max-h-60 overflow-y-auto rounded-2xl border border-border/40 bg-card/95 p-1.5 shadow-lift backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            {fromSuggestions.map((s, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => handleSelectFrom(s)}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-foreground/80 hover:bg-secondary/70 hover:text-primary transition-smooth"
                >
                  {s.shortName}
                  <span className="block mt-0.5 text-[10px] font-medium text-muted-foreground truncate">
                    {s.fullName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div ref={toContainerRef} className="relative flex flex-1">
        <label className={`${fieldClass} w-full`}>
          {loadingTo ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
          ) : (
            <MapPin className="size-4 shrink-0 text-primary" />
          )}
          <span className="sr-only">Going to</span>
          <input
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setShowToList(true);
            }}
            onFocus={() => setShowToList(true)}
            placeholder="Going to"
            className="w-full bg-transparent text-sm max-md:text-base outline-none placeholder:text-muted-foreground"
          />
        </label>

        {showToList && toSuggestions.length > 0 && (
          <ul className="absolute top-full left-0 z-50 mt-2 w-full max-h-60 overflow-y-auto rounded-2xl border border-border/40 bg-card/95 p-1.5 shadow-lift backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            {toSuggestions.map((s, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => handleSelectTo(s)}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-foreground/80 hover:bg-secondary/70 hover:text-primary transition-smooth"
                >
                  {s.shortName}
                  <span className="block mt-0.5 text-[10px] font-medium text-muted-foreground truncate">
                    {s.fullName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className={`${fieldClass} md:max-w-[11rem]`}>
        <CalendarDays className="size-4 shrink-0 text-primary" />
        <span className="sr-only">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-transparent text-sm max-md:text-base text-foreground/85 outline-none"
        />
      </label>

      <button
        type="button"
        onClick={() => setWomenOnly((v) => !v)}
        aria-pressed={womenOnly}
        className={womenOnlyClass}
      >
        <Venus className="size-4" /> Women-only
      </button>

      <Button
        type="submit"
        variant="hero"
        size="xl"
        className="w-full md:w-auto max-md:min-h-[3.25rem] touch-manipulation focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] active:brightness-95"
      >
        <Search className="size-4" /> Search
      </Button>
    </form>
  );
}
