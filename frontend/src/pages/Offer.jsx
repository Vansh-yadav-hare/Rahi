import React from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { Navigate } from "react-router-dom";
import CreateRideForm from "@/features/rides/CreateRideForm";

export default function Offer() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] items-center">
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
              ["Cancellation protection", "Low-risk passengers are ranked first in your requests."],
            ].map(([title, body]) => (
              <li key={title} className="border-l-2 border-primary/30 pl-4">
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <CreateRideForm />
        </div>
      </div>
    </div>
  );
}
