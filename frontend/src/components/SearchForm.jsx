import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { MapPin, CalendarDays, Search, Venus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SearchForm({ compact = false }) {
  const navigate = useNavigate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [womenOnly, setWomenOnly] = useState(false);

  function onSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (womenOnly) params.set("women", "true");
    navigate(`/search?${params.toString()}`);
  }

  const field =
    "flex flex-1 items-center gap-2 rounded-xl border border-border/40 bg-background/25 px-3.5 py-3 max-md:min-h-[3.25rem] max-md:px-4 max-md:py-3.5 touch-manipulation transition-smooth hover:bg-background/45 hover:border-primary/30 focus-within:bg-background/55 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/20 focus-within:ring-offset-2 focus-within:ring-offset-background";
  return (
    <form
      onSubmit={onSubmit}
      className={
        compact
          ? "flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/30 p-4 max-md:p-5 shadow-soft backdrop-blur-md md:flex-row md:items-center"
          : "flex flex-col gap-4 rounded-3xl border border-border/40 bg-card/30 p-4 max-md:p-5 shadow-lift backdrop-blur-md md:flex-row md:items-center"
      }
    >
      <label className={field}>
        <MapPin className="size-4 shrink-0 text-primary" />
        <span className="sr-only">Leaving from</span>
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="Leaving from"
          className="w-full bg-transparent text-sm max-md:text-base outline-none placeholder:text-muted-foreground"
        />
      </label>

      <label className={field}>
        <MapPin className="size-4 shrink-0 text-primary" />
        <span className="sr-only">Going to</span>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Going to"
          className="w-full bg-transparent text-sm max-md:text-base outline-none placeholder:text-muted-foreground"
        />
      </label>

      <label className={`${field} md:max-w-[11rem]`}>
        <CalendarDays className="size-4 shrink-0 text-primary" />
        <span className="sr-only">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-transparent text-sm max-md:text-base text-muted-foreground outline-none"
        />
      </label>

      <button
        type="button"
        onClick={() => setWomenOnly((v) => !v)}
        aria-pressed={womenOnly}
        className={`flex w-full md:w-auto items-center justify-center gap-2 rounded-xl border px-4 py-3 max-md:min-h-[3.25rem] max-md:px-5 max-md:py-3.5 text-sm font-semibold touch-manipulation transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-royal-red/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
          womenOnly
            ? "border-royal-red bg-royal-red text-royal-red-foreground shadow-soft hover:bg-royal-red/90"
            : "border-border/40 bg-background/25 text-foreground/80 hover:bg-background/45 hover:border-royal-red/40 hover:text-royal-red"
        }`}
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
