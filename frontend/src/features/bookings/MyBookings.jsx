import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  MapPin,
  Loader2,
  AlertCircle,
  XCircle,
  CheckCircle,
  Info,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/services/apiClient";
import { normalizeRide } from "@/lib/rides";
import ReviewForm from "@/features/reviews/ReviewForm";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState("");
  const [activeReviewBookingId, setActiveReviewBookingId] = useState(null);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [reviewedRideIds, setReviewedRideIds] = useState(new Set());

  const fetchBookings = async () => {
    setError("");
    try {
      const response = await apiClient.get("/bookings/me");
      // Populate bookings with normalized ride models
      const normalizedBookings = response.data.map((b) => ({
        ...b,
        ride: normalizeRide(b.rideId),
      }));
      setBookings(normalizedBookings);
    } catch (err) {
      console.error("Fetch my bookings error:", err);
      setError("Failed to load your ride booking history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancelBooking = async (booking) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to cancel this booking? Per our cancellation policy: you will receive a full refund if cancelled at least 2 hours before departure. No refund is processed inside 2 hours.",
    );
    if (!isConfirmed) return;

    setError("");
    setCancelSuccessMsg("");
    setCancellingId(booking._id);

    try {
      const response = await apiClient.put(`/bookings/${booking._id}/cancel`, {
        reason: cancelReason || "Cancelled by passenger",
      });

      const { refundIssued, refundAmount } = response.data;
      if (refundIssued) {
        setCancelSuccessMsg(
          `Ride cancelled successfully. A full refund of ₹${refundAmount} has been initiated.`,
        );
      } else {
        setCancelSuccessMsg(
          "Ride cancelled successfully. As departure is less than 2 hours away, no refund is processed.",
        );
      }

      // Refresh list
      await fetchBookings();
    } catch (err) {
      console.error("Cancel booking error:", err);
      setError(err.response?.data?.message || "Failed to cancel your booking.");
    } finally {
      setCancellingId(null);
      setCancelReason("");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-36">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground font-semibold">Loading your bookings...</p>
      </div>
    );
  }

  // Segment upcoming vs past bookings
  const now = new Date();
  const upcomingBookings = bookings.filter(
    (b) => b.status !== "cancelled" && b.ride && new Date(b.rideId.dateTime) > now,
  );
  const pastBookings = bookings.filter(
    (b) => b.status === "cancelled" || (b.ride && new Date(b.rideId.dateTime) <= now),
  );

  const getShortAddress = (fullAddress) => {
    if (!fullAddress) return "";
    const parts = fullAddress.split(", ");
    return parts.length > 0 ? parts[0] : fullAddress;
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 md:py-14">
      <div className="flex items-center justify-between border-b border-border/30 pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">My Bookings</h1>
          <p className="mt-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Manage your rides and refund receipts
          </p>
        </div>
        <Button asChild variant="outline" className="border-border/60">
          <Link to="/search">Find another ride</Link>
        </Button>
      </div>

      {cancelSuccessMsg && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-gradient-mint/10 p-3.5 text-sm text-primary border border-primary/20">
          <CheckCircle className="size-4 shrink-0 mt-0.5" />
          <span>{cancelSuccessMsg}</span>
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Upcoming Trips Section */}
      <div className="mt-10">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="size-5 text-primary" /> Upcoming Trips
        </h2>

        {upcomingBookings.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-border/40 bg-card/25 backdrop-blur-sm p-10 text-center">
            <p className="font-display text-base font-bold text-foreground">No upcoming rides</p>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              When you book a ride and confirm payment, it will show up here.
            </p>
            <Button asChild variant="hero" size="sm" className="mt-4">
              <Link to="/search">Search rides</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid gap-5">
            {upcomingBookings.map((b) => (
              <div
                key={b._id}
                className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-6 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-lift transition-smooth"
              >
                <div className="space-y-3.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/25 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wide">
                      {b.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold">
                      {b.seatsBooked} {b.seatsBooked === 1 ? "seat" : "seats"} booked
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm font-semibold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4 text-primary" /> {getShortAddress(b.ride?.from)}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4 text-primary" /> {getShortAddress(b.ride?.to)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground font-medium">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="size-4 text-primary" /> {b.ride?.date} at{" "}
                      {b.ride?.departTime}
                    </span>
                    <span>·</span>
                    <span>Driver: {b.ride?.driver?.name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-border/20 pt-4 md:border-none md:pt-0">
                  <Button asChild variant="outline" size="sm" className="border-border/60">
                    <Link to={`/ride/${b.rideId._id}`}>Details</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleCancelBooking(b)}
                    disabled={cancellingId === b._id}
                  >
                    {cancellingId === b._id ? (
                      <>
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Cancelling...
                      </>
                    ) : (
                      "Cancel"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Trips Section */}
      <div className="mt-12 border-t border-border/20 pt-10">
        <h2 className="font-display text-lg font-bold text-foreground/80 flex items-center gap-2">
          History
        </h2>

        {pastBookings.length === 0 ? (
          <p className="mt-4 text-xs text-muted-foreground italic">No past booking records.</p>
        ) : (
          <div className="mt-4 grid gap-4 opacity-75">
            {pastBookings.map((b) => (
              <div
                key={b._id}
                className="rounded-2xl border border-border/30 bg-card/25 p-5 flex flex-col gap-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${
                          b.status === "cancelled"
                            ? "bg-destructive/10 border-destructive/25 text-destructive"
                            : "bg-secondary border-border/60 text-muted-foreground"
                        }`}
                      >
                        {b.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {b.seatsBooked} {b.seatsBooked === 1 ? "seat" : "seats"} · Price: ₹
                        {b.ride?.price * b.seatsBooked}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
                      <span>{getShortAddress(b.ride?.from)}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>{getShortAddress(b.ride?.to)}</span>
                    </div>

                    <div className="text-[10px] text-muted-foreground">
                      Departure: {b.ride?.date} at {b.ride?.departTime}
                    </div>
                  </div>

                  {b.status === "cancelled" && b.cancellationInfo && (
                    <div className="rounded-xl bg-background/30 p-2.5 text-[10px] text-muted-foreground max-w-sm flex items-start gap-1.5 border border-border/20">
                      <Info className="size-3.5 shrink-0 text-primary mt-0.5" />
                      <div>
                        <span className="font-semibold text-foreground block">Refund Details:</span>
                        {b.cancellationInfo.refundAmount > 0
                          ? `Refund of ₹${b.cancellationInfo.refundAmount} issued.`
                          : "No refund issued (late cancellation)."}
                      </div>
                    </div>
                  )}

                  {b.status !== "cancelled" && (
                    <div className="flex items-center gap-2">
                      {activeReviewBookingId !== b._id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-border/60"
                          onClick={() => setActiveReviewBookingId(b._id)}
                        >
                          Leave a Review
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {activeReviewBookingId === b._id && b.status !== "cancelled" && (
                  <div className="border-t border-border/20 pt-4 w-full">
                    <ReviewForm
                      rideId={b.rideId._id}
                      toUserId={b.ride?.driver?.id}
                      onSuccess={() => setActiveReviewBookingId(null)}
                    />
                    <div className="mt-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setActiveReviewBookingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {b.status === "confirmed" && b.ride?.status === "completed" && (
                  <div className="flex shrink-0 items-center justify-end">
                    {reviewedRideIds.has(b.rideId._id) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-secondary/35 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                        Reviewed
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="hero"
                        className="h-8 text-xs px-3.5"
                        onClick={() => {
                          setSelectedRideId(b.rideId._id);
                          setIsReviewOpen(true);
                        }}
                      >
                        Write Review
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ReviewForm
        rideId={selectedRideId}
        isOpen={isReviewOpen}
        onClose={() => {
          setIsReviewOpen(false);
          setSelectedRideId(null);
        }}
        onSuccess={() => {
          if (selectedRideId) {
            setReviewedRideIds((prev) => new Set([...prev, selectedRideId]));
          }
        }}
      />
    </div>
  );
}

