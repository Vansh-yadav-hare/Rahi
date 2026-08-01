import { useParams, Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Car,
  MapPin,
  MessagesSquare,
  Siren,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrustScore } from "@/components/TrustScore";
import { getRide } from "@/lib/rides";

export default function RideDetails() {
  const { rideId } = useParams();
  const ride = getRide(rideId);

  if (!ride) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 className="font-display text-2xl font-bold">Ride not found</h2>
        <p className="mt-2 text-muted-foreground">
          This ride does not exist or has been completed.
        </p>
        <Link
          to="/search"
          className="mt-6 inline-block text-sm text-primary transition-smooth hover:underline"
        >
          ← Back to search results
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <Link
        to="/search"
        className="text-sm text-muted-foreground transition-smooth hover:text-foreground"
      >
        ← Back to results
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-7 shadow-soft">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{ride.date}</span>
              <span>·</span>
              <span>{ride.duration}</span>
            </div>
            <h1 className="mt-2 flex flex-wrap items-center gap-3 font-display text-3xl font-bold md:text-4xl">
              {ride.from} <ArrowRight className="size-6 text-primary" /> {ride.to}
            </h1>

            <ol className="mt-8 space-y-6">
              {[ride.from, ...ride.stops, ride.to].map((stop, i, arr) => (
                <li key={stop} className="relative flex gap-4 pl-1">
                  <span className="relative flex flex-col items-center">
                    <span
                      className={`size-3 rounded-full ${i === 0 || i === arr.length - 1 ? "bg-primary" : "bg-border"}`}
                    />
                    {i < arr.length - 1 && (
                      <span className="absolute top-3 h-[calc(100%+1rem)] w-px bg-border" />
                    )}
                  </span>
                  <div className="-mt-1">
                    <div className="font-medium">{stop}</div>
                    <div className="text-xs text-muted-foreground">
                      {i === 0
                        ? `Departure ${ride.departTime}`
                        : i === arr.length - 1
                          ? `Arrival ${ride.arriveTime}`
                          : "Pickup point available"}
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
              {ride.perks.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-7 shadow-soft">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-full bg-accent font-display text-lg font-bold text-accent-foreground">
                {ride.driver.initials}
              </span>
              <div className="mr-auto">
                <h2 className="font-display text-xl font-semibold">{ride.driver.name}</h2>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Star className="size-3.5 fill-trust text-trust" />
                  {ride.driver.rating} · {ride.driver.trips} trips · member since{" "}
                  {ride.driver.joined}
                </p>
              </div>
              <TrustScore score={ride.driver.trustScore} size="lg" />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {ride.driver.verified.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary"
                >
                  <BadgeCheck className="size-3.5" /> {v} verified
                </span>
              ))}
            </div>

            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Car className="size-4 text-primary" /> {ride.driver.car}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-6">
              <Button variant="outline">
                <MessagesSquare className="size-4" /> Message driver
              </Button>
              <Button variant="ghost" className="text-destructive hover:text-destructive">
                <Siren className="size-4" /> Report a concern
              </Button>
            </div>
          </div>
        </div>

        <aside className="h-fit lg:sticky lg:top-24">
          <div className="rounded-3xl border border-border bg-card p-7 shadow-lift">
            <div className="flex items-end justify-between">
              <div>
                <div className="font-display text-3xl font-bold">₹{ride.price}</div>
                <div className="text-xs text-muted-foreground">per seat, all inclusive</div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                <Users className="size-3.5" /> {ride.seatsAvailable} left
              </span>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Seats</span>
                <span className="font-medium">1 passenger</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pickup</span>
                <span className="flex items-center gap-1 font-medium">
                  <MapPin className="size-3.5 text-primary" /> {ride.stops[0] ?? ride.from}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ride insurance</span>
                <span className="font-medium">+₹29</span>
              </div>
            </div>

            <Button variant="hero" size="xl" className="mt-7 w-full">
              {ride.instantBook ? "Book instantly" : "Request to book"}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Free cancellation up to 12h before departure.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm font-medium">Tracked from start to finish</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Share a live link with family, chat in-app, and trigger SOS at any point in the trip.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
