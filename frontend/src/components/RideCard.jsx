import { Link } from "react-router-dom";
import { ArrowRight, Star, Users, Zap, Venus } from "lucide-react";
import { TrustScore } from "@/components/TrustScore";

export function RideCard({ ride }) {
  return (
    <Link
      to={`/ride/${ride.id}`}
      className="group block rounded-2xl border border-border bg-card p-5 shadow-soft transition-smooth hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lift"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 font-display text-lg font-semibold">
            <span>{ride.departTime}</span>
            <span className="h-px w-8 bg-border" />
            <span className="text-muted-foreground">{ride.arriveTime}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="truncate font-medium text-foreground">{ride.from}</span>
            <ArrowRight className="size-3.5 shrink-0" />
            <span className="truncate font-medium text-foreground">{ride.to}</span>
            <span className="hidden sm:inline">· {ride.duration}</span>
          </div>
        </div>

        <div className="text-right">
          <div className="font-display text-2xl font-bold">₹{ride.price}</div>
          <div className="text-xs text-muted-foreground">per seat</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border/70 pt-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {ride.driver.initials}
        </span>
        <div className="mr-auto">
          <div className="text-sm font-medium">{ride.driver.name}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3 fill-trust text-trust" />
            {ride.driver.rating} · {ride.driver.trips} trips
          </div>
        </div>

        <TrustScore score={ride.driver.trustScore} />

        {ride.womenOnly && (
          <span className="inline-flex items-center gap-1 rounded-full bg-trust/20 px-2.5 py-1 text-xs font-medium text-trust-foreground">
            <Venus className="size-3.5" /> Women-only
          </span>
        )}
        {ride.instantBook && (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            <Zap className="size-3.5" /> Instant
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
          <Users className="size-3.5" /> {ride.seatsAvailable} seats
        </span>
      </div>
    </Link>
  );
}
