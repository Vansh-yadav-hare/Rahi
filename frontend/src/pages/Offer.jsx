import React from "react";
import { MapPin, CalendarDays, Users, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";

const field = "flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-3 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-ring/20 transition-smooth";

export default function Offer() {
  return <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
        <div>
          <h1 className="font-display text-4xl font-bold md:text-5xl">Publish your ride</h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Add your route once. RideSure matches verified passengers heading the same way, handles
            payment, and pays out the day after the trip.
          </p>

          <ul className="mt-8 space-y-4">
            {[
    ["Verified passengers only", "Everyone who books has cleared ID checks."],
    ["Smart pricing", "We suggest a fair per-seat price from distance and demand."],
    ["Cancellation protection", "Low-risk passengers are ranked first in your requests."]
  ].map(([title, body]) => <li key={title} className="border-l-2 border-primary/30 pl-4">
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </li>)}
          </ul>
        </div>

        <form
    className="h-fit space-y-4 rounded-3xl border border-border bg-card p-7 shadow-lift"
    onSubmit={(e) => e.preventDefault()}
  >
          <h2 className="font-display text-lg font-semibold">Ride details</h2>

          <label className={field}>
            <MapPin className="size-4 text-primary" />
            <span className="sr-only">Leaving from</span>
            <input
    placeholder="Leaving from"
    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
  />
          </label>

          <label className={field}>
            <MapPin className="size-4 text-primary" />
            <span className="sr-only">Going to</span>
            <input
    placeholder="Going to"
    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
  />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={field}>
              <CalendarDays className="size-4 text-primary" />
              <span className="sr-only">Date</span>
              <input
    type="date"
    className="w-full bg-transparent text-sm text-muted-foreground outline-none"
  />
            </label>
            <label className={field}>
              <Users className="size-4 text-primary" />
              <span className="sr-only">Seats</span>
              <input
    type="number"
    min={1}
    max={6}
    placeholder="Seats"
    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
  />
            </label>
          </div>

          <label className={field}>
            <IndianRupee className="size-4 text-primary" />
            <span className="sr-only">Price per seat</span>
            <input
    type="number"
    placeholder="Price per seat"
    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
  />
          </label>

          <Button variant="hero" size="xl" className="w-full">
            Publish ride
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Demo form — nothing is submitted yet.
          </p>
        </form>
      </div>
    </div>;
}
