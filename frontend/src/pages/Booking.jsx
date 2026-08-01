import React from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { Navigate } from "react-router-dom";

export default function Booking() {
  const { bookingId } = useParams();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-20 text-center">
      <h1 className="font-display text-3xl font-bold">Seat Booking</h1>
      <p className="mt-2 text-muted-foreground">
        Confirming booking seat for ride reference: {bookingId}
      </p>
      <div className="mt-8">
        <Link to="/" className="text-sm text-primary transition-smooth hover:underline">
          ← Go back home
        </Link>
      </div>
    </div>
  );
}
