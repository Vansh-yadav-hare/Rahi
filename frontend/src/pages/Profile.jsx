import React from "react";
import { useAuth } from "../features/auth/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "../components/ui/button";

export default function Profile() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <div className="rounded-3xl border border-border bg-card p-8 shadow-soft">
        <h1 className="font-display text-3xl font-bold animate-fade-in">Profile Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your personal information and verified status.</p>
        
        <div className="mt-8 space-y-6">
          <div className="flex items-center gap-4">
            <span className="flex size-16 items-center justify-center rounded-full bg-accent font-display text-xl font-bold">
              {user.name ? user.name[0] : (user.phone ? user.phone.slice(-2) : "?")}
            </span>
            <div>
              <h2 className="text-xl font-semibold">{user.name || "New Passenger"}</h2>
              <p className="text-sm text-muted-foreground">{user.phone || user.email}</p>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <Button
              variant="outline"
              onClick={logout}
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              Log out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
