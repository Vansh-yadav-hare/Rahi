import { Link } from "react-router-dom";
import { ShieldCheck, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthContext";

const nav = [
  { label: "Find a ride", to: "/search" },
  { label: "Safety", to: "/safety" },
  { label: "Offer a ride", to: "/offer" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-mint shadow-glow">
            <ShieldCheck className="size-5 text-primary-foreground" strokeWidth={2.4} />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">RideSure</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="flex size-9 items-center justify-center rounded-full bg-accent font-display text-sm font-bold border border-border/60 transition-smooth hover:border-primary/40"
              >
                {user?.name ? user.name[0] : user?.phone ? user.phone.slice(-2) : "?"}
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Log out
              </Button>
            </div>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild variant="hero" size="sm">
                <Link to="/login">Get started</Link>
              </Button>
            </>
          )}
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

      {open && (
        <div className="border-t border-border/60 bg-background px-5 py-3 md:hidden">
          <nav className="flex flex-col">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm font-medium text-muted-foreground transition-smooth hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <div className="mt-2 flex flex-col gap-2">
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  My Profile
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="w-full text-destructive"
                >
                  Log out
                </Button>
              </div>
            ) : (
              <Button asChild variant="hero" size="sm" className="mt-2">
                <Link to="/login" onClick={() => setOpen(false)}>
                  Get started
                </Link>
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
