import { Link } from "react-router-dom";
import { ShieldCheck, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
const nav = [
  { label: "Find a ride", to: "/search" },
  { label: "Safety", to: "/safety" },
  { label: "Offer a ride", to: "/offer" }
];
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-mint shadow-glow">
            <ShieldCheck className="size-5 text-primary-foreground" strokeWidth={2.4} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">RideSure</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => <Link
    key={item.to}
    to={item.to}
    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
  >
              {item.label}
            </Link>)}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm">
            Log in
          </Button>
          <Button variant="hero" size="sm">
            Get started
          </Button>
        </div>

        <Button
    variant="ghost"
    size="icon"
    className="md:hidden"
    aria-label="Open menu"
    onClick={() => setOpen((v) => !v)}
  >
          <Menu className="size-5" />
        </Button>
      </div>

      {open && <div className="border-t border-border/60 bg-background px-5 py-3 md:hidden">
          <nav className="flex flex-col">
            {nav.map((item) => <Link
    key={item.to}
    to={item.to}
    onClick={() => setOpen(false)}
    className="rounded-lg px-2 py-2.5 text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground"
  >
                {item.label}
              </Link>)}
            <Button variant="hero" size="sm" className="mt-2">
              Get started
            </Button>
          </nav>
        </div>}
    </header>;
}
