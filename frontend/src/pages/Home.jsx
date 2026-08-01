import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ScanFace,
  MapPinned,
  Siren,
  Sparkles,
  MessagesSquare,
  ArrowRight,
  Star,
} from "lucide-react";
import heroImage from "@/assets/hero-ride.jpg";
import { SearchForm } from "@/components/SearchForm";
import { RideCard } from "@/components/RideCard";
import { Button } from "@/components/ui/button";
import { rides } from "@/lib/rides";

const trustPillars = [
  {
    icon: ScanFace,
    title: "ID + face verified",
    body: "Government ID, selfie match and vehicle documents checked before anyone can drive.",
  },
  {
    icon: Sparkles,
    title: "AI trust score",
    body: "Every profile carries a live score from verification depth, ratings and ride history.",
  },
  {
    icon: MapPinned,
    title: "Live trip tracking",
    body: "Follow the route in real time and share a family tracking link for the whole trip.",
  },
  {
    icon: Siren,
    title: "One-tap SOS",
    body: "Emergency contacts and local help alerted instantly with your exact location.",
  },
  {
    icon: MessagesSquare,
    title: "Masked chat & calls",
    body: "Coordinate pickup without sharing your number. Messages auto-translate.",
  },
  {
    icon: ShieldCheck,
    title: "Women-first options",
    body: "Filter for women-only rides and drivers with reliability badges you can trust.",
  },
];
const steps = [
  {
    n: "01",
    title: "Search your route",
    body: "Enter your cities and date \u2014 AI matches detours.",
  },
  { n: "02", title: "Pick a trusted driver", body: "Compare trust scores, reviews and badges." },
  { n: "03", title: "Book and pay in-app", body: "Secure checkout with optional ride insurance." },
  { n: "04", title: "Ride tracked end-to-end", body: "Live location, chat and SOS until arrival." },
];
export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <img
          src={heroImage}
          alt="Two travellers sharing a carpool ride along a coastal highway at sunset"
          width={1600}
          height={1200}
          className="absolute inset-0 size-full object-cover opacity-30 mix-blend-luminosity"
        />
        <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-16 md:pt-28 md:pb-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-foreground/20 bg-ink-foreground/10 px-3.5 py-1.5 text-xs font-medium text-ink-foreground backdrop-blur-md">
            <ShieldCheck className="size-3.5" /> Verified people. Every single ride.
          </span>

          <h1 className="mt-6 max-w-3xl font-display text-4xl leading-[1.05] font-bold text-ink-foreground md:text-6xl">
            Share the ride.
            <br />
            Never the risk.
          </h1>
          <p className="mt-5 max-w-xl text-base text-ink-foreground/75 md:text-lg">
            RideSure pairs intercity carpooling with ID verification, live tracking and an AI trust
            score — so every seat you book comes with proof, not promises.
          </p>

          <div className="mt-10">
            <SearchForm />
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            {[
              ["1.2M", "verified rides"],
              ["4.9/5", "average driver rating"],
              ["98%", "trips tracked live"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="font-display text-2xl font-bold text-ink-foreground">{value}</dt>
                <dd className="text-xs tracking-wide text-ink-foreground/60 uppercase">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Trust pillars */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Safety by design
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">
            Six layers of trust behind every booking
          </h2>
          <p className="mt-3 text-muted-foreground">
            Verification, prediction and real-time safety work together — from the moment you search
            to the moment you arrive.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trustPillars.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-lift"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent">
                <p.icon className="size-5 text-primary" strokeWidth={2.2} />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular rides */}
      <section className="border-y border-border bg-secondary/40 py-20 md:py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold md:text-4xl">Rides leaving soon</h2>
              <p className="mt-2 text-muted-foreground">
                Hand-picked routes with the highest trust scores this week.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/search">
                See all rides <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {rides.slice(0, 4).map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <h2 className="font-display text-3xl font-bold md:text-4xl">How RideSure works</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="border-t-2 border-primary/25 pt-5">
              <span className="font-display text-sm font-bold text-primary">{s.n}</span>
              <h3 className="mt-2 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial + CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <figure className="rounded-3xl border border-border bg-card p-8 shadow-soft">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-trust text-trust" />
              ))}
            </div>
            <blockquote className="mt-5 font-display text-xl leading-snug font-medium md:text-2xl">
              “I sent my mum the live tracking link before we left Pune. She watched the whole trip.
              That's the part no other app gives me.”
            </blockquote>
            <figcaption className="mt-6 text-sm text-muted-foreground">
              Nisha R. — passenger, 42 rides
            </figcaption>
          </figure>

          <div className="flex flex-col justify-between rounded-3xl bg-gradient-hero p-8 shadow-lift">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink-foreground md:text-3xl">
                Driving that way anyway?
              </h2>
              <p className="mt-3 text-sm text-ink-foreground/75">
                List your empty seats, get matched with verified passengers on your route and cover
                your fuel — payouts land the day after the trip.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/offer">Offer a ride</Link>
              </Button>
              <Button asChild variant="onDark" size="lg">
                <Link to="/safety">See safety features</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
