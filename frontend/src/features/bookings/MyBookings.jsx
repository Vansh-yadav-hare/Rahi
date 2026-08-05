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

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [reviewedRideIds, setReviewedRideIds] = useState(new Set());

  const fetchBookings = async () => {
    setError("");
    try {
      const response = await apiClient.get("/bookings/me");
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
      "Are you sure you want to cancel this booking? Cancel policy details:\n- Refund: 100% (before 24h of departure)\n- Refund: 80% (6h-24h of departure)\n- Refund: 0% (less than 6h of departure)",
    );
    if (!isConfirmed) return;

    setError("");
    setCancelSuccessMsg("");
    setCancellingId(booking._id);

    try {
      const response = await apiClient.put(`/bookings/${booking._id}/cancel`, {
        reason: cancelReason || "Cancelled by passenger",
      });

      const { passengerRefundAmount } = response.data;
      setCancelSuccessMsg(
        `Booking cancelled successfully. Passenger Refund: ₹${passengerRefundAmount}`,
      );

      await fetchBookings();
    } catch (err) {
      console.error("Cancel booking error:", err);
      setError(err.response?.data?.message || "Failed to cancel your booking.");
    } finally {
      setCancellingId(null);
      setCancelReason("");
    }
  };

  const handleConfirmCompletion = async (bookingId) => {
    const isConfirmed = window.confirm(
      "Confirming ride completion will release payment from escrow to the driver. Do you want to proceed?",
    );
    if (!isConfirmed) return;

    setError("");
    setCancelSuccessMsg("");
    try {
      const response = await apiClient.put(`/bookings/${bookingId}/confirm-completion`);
      setCancelSuccessMsg(
        response.data.message || "Ride completion confirmed! Funds released to driver.",
      );
      await fetchBookings();
    } catch (err) {
      console.error("Confirm completion error:", err);
      setError(err.response?.data?.message || "Failed to confirm completion.");
    }
  };

  const handleDisputeBooking = async (bookingId) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to raise a dispute? This will freeze the funds in escrow, and an administrator will review the trip details.",
    );
    if (!isConfirmed) return;

    setError("");
    setCancelSuccessMsg("");
    try {
      const response = await apiClient.put(`/bookings/${bookingId}/dispute`);
      setCancelSuccessMsg(
        response.data.message || "Dispute raised successfully. Escrow funds are locked.",
      );
      await fetchBookings();
    } catch (err) {
      console.error("Raise dispute error:", err);
      setError(err.response?.data?.message || "Failed to raise dispute.");
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
    (b) =>
      ["BOOKED", "REQUESTED"].includes(b.status) &&
      b.ride &&
      b.ride.status === "active" &&
      new Date(b.rideId.dateTime) > now,
  );
  const pastBookings = bookings.filter((b) => !upcomingBookings.some((ub) => ub._id === b._id));

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
          <CheckCircle className="size-4 shrink-0 mt-0.5" strokeWidth={2.5} />
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
              When you book a ride and secure the payment in Escrow, it will show up here.
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/25 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wide">
                      {b.status}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 border border-sky-500/25 px-2.5 py-0.5 text-[10px] font-bold text-sky-500 uppercase tracking-wide">
                      {b.paymentStatus}
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

      {/* Past Trips / History Section */}
      <div className="mt-12 border-t border-border/20 pt-10">
        <h2 className="font-display text-lg font-bold text-foreground/80 flex items-center gap-2">
          History
        </h2>

        {pastBookings.length === 0 ? (
          <p className="mt-4 text-xs text-muted-foreground italic">No past booking records.</p>
        ) : (
          <div className="mt-4 grid gap-4">
            {pastBookings.map((b) => (
              <div
                key={b._id}
                className="rounded-2xl border border-border/30 bg-card/25 p-5 flex flex-col gap-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${
                          ["CANCELLED", "DRIVER_CANCELLED", "DRIVER_NO_SHOW"].includes(b.status)
                            ? "bg-destructive/10 border-destructive/25 text-destructive"
                            : b.status === "COMPLETED"
                              ? "bg-primary/10 border-primary/25 text-primary"
                              : b.status === "DISPUTED"
                                ? "bg-amber-500/10 border-amber-500/25 text-amber-500 animate-pulse"
                                : "bg-secondary border-border/60 text-muted-foreground"
                        }`}
                      >
                        {b.status}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${
                          b.paymentStatus === "PAID_IN_ESCROW"
                            ? "bg-sky-500/10 border-sky-500/25 text-sky-500"
                            : b.paymentStatus === "RELEASED_TO_DRIVER"
                              ? "bg-primary/10 border-primary/25 text-primary"
                              : b.paymentStatus === "REFUNDED" ||
                                  b.paymentStatus === "PARTIALLY_REFUNDED"
                                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-500"
                                : "bg-secondary border-border/60 text-muted-foreground"
                        }`}
                      >
                        Payment: {b.paymentStatus}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-semibold">
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

                  {b.status === "CANCELLED" && b.cancellationInfo && (
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

                  {/* Actions for Booked Completed rides */}
                  {b.status === "BOOKED" && b.paymentStatus === "PAID_IN_ESCROW" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="hero"
                        onClick={() => handleConfirmCompletion(b._id)}
                      >
                        Confirm completion
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-amber-500 border-amber-500/40 hover:bg-amber-500/10"
                        onClick={() => handleDisputeBooking(b._id)}
                      >
                        Dispute
                      </Button>
                    </div>
                  )}

                  {/* Review only if payout released / ride completed */}
                  {b.status === "COMPLETED" && b.paymentStatus === "RELEASED_TO_DRIVER" && (
                    <div className="flex items-center gap-2 shrink-0">
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
