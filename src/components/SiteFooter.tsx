import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

const columns = [
  {
    title: "Ride",
    links: [
      { label: "Find a ride", to: "/search" },
      { label: "Offer a ride", to: "/offer" },
      { label: "Women-only rides", to: "/safety" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "Safety centre", to: "/safety" },
      { label: "Verification", to: "/safety" },
      { label: "Trust score", to: "/safety" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-mint">
              <ShieldCheck className="size-4 text-primary-foreground" strokeWidth={2.4} />
            </span>
            <span className="font-display text-lg font-bold">RideSure</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Trust-first ride sharing. Verified people, live tracking and an AI trust score on every
            seat you book.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold">{col.title}</h4>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-sm text-muted-foreground transition-smooth hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/70 px-5 py-5">
        <p className="mx-auto max-w-6xl text-xs text-muted-foreground">
          © {new Date().getFullYear()} RideSure. Demo interface — rides shown are illustrative.
        </p>
      </div>
    </footer>
  );
}
