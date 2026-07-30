import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanFace, MapPinned, Siren, ShieldCheck, Venus, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety Centre — Verification, Tracking & SOS | RideSure" },
      {
        name: "description",
        content:
          "How RideSure keeps rides safe: government ID and face verification, live trip tracking, emergency SOS, masked calling and women-only rides.",
      },
      { property: "og:title", content: "RideSure Safety Centre" },
      {
        property: "og:description",
        content: "ID verification, live tracking, SOS and women-first ride options explained.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Safety,
});

const layers = [
  {
    icon: ScanFace,
    title: "Identity you can check",
    body: "Drivers submit a government ID, a live selfie for face matching and vehicle registration documents. Badges on a profile only appear after each check clears.",
  },
  {
    icon: ShieldCheck,
    title: "AI trust score",
    body: "A single 0–100 score blends verification depth, rating history, completed trips and cancellation behaviour, recalculated after every ride.",
  },
  {
    icon: MapPinned,
    title: "Live tracking & family links",
    body: "Follow the vehicle in real time and send a view-only tracking link to anyone — no app install needed on their side.",
  },
  {
    icon: Siren,
    title: "Emergency SOS",
    body: "One tap alerts your saved emergency contacts with your exact GPS location and ride details, and opens a support line.",
  },
  {
    icon: Venus,
    title: "Women-only rides",
    body: "Women passengers can filter for women drivers and women-only cabins, with reliability badges shown up front.",
  },
  {
    icon: HeartHandshake,
    title: "Fair conduct, enforced",
    body: "Fraud detection on profiles and payments, plus a lost-and-found flow and reviews that can't be edited after the fact.",
  },
];

function Safety() {
  return (
    <div>
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-24">
          <h1 className="max-w-2xl font-display text-4xl font-bold text-ink-foreground md:text-5xl">
            Safety isn't a feature. It's the product.
          </h1>
          <p className="mt-5 max-w-xl text-ink-foreground/75">
            Every RideSure trip is wrapped in verification, real-time visibility and an escalation
            path that works even when the network doesn't.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-5 md:grid-cols-2">
          {layers.map((l) => (
            <div
              key={l.title}
              className="rounded-2xl border border-border bg-card p-7 shadow-soft transition-smooth hover:shadow-lift"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent">
                <l.icon className="size-5 text-primary" strokeWidth={2.2} />
              </span>
              <h2 className="mt-5 font-display text-lg font-semibold">{l.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{l.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-border bg-secondary/50 p-8">
          <p className="max-w-md font-display text-xl font-semibold">
            Ready to ride with people you can actually verify?
          </p>
          <Button asChild variant="hero" size="lg">
            <Link to="/search">Find a ride</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
