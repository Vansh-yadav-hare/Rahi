import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Loader2,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  IndianRupee,
  RefreshCw,
  Users,
  Compass,
} from "lucide-react";
import apiClient from "../services/apiClient";
import { Button } from "../components/ui/button";

export default function AdminPanel() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/admin/bookings");
      setBookings(response.data);
    } catch (err) {
      console.error("Fetch admin bookings error:", err);
      setError("Failed to load bookings database. Make sure you are authorized.");
    } finally {
      setBookings(prev => [...prev]);
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiClient.get("/admin/bookings");
        setBookings(response.data);
      } catch (err) {
        console.error("Fetch admin bookings error:", err);
        setError("Failed to load bookings database. Make sure you are authorized.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleResolveDispute = async (bookingId, action) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to resolve this dispute by choosing: "${action.toUpperCase()}"? This action is final and will disburse escrow funds.`
    );
    if (!isConfirmed) return;

    setError("");
    setSuccessMsg("");
    setProcessingId(bookingId);

    try {
      const response = await apiClient.put(`/admin/bookings/${bookingId}/resolve`, {
        action,
      });
      setSuccessMsg(response.data.message || `Dispute resolved successfully.`);
      await fetchBookings();
    } catch (err) {
      console.error("Resolve dispute error:", err);
      setError(err.response?.data?.message || "Failed to resolve dispute.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkNoShow = async (bookingId, type) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to mark a "${type.toUpperCase()} NO-SHOW" for this booking? This will disburse/refund escrow funds according to policy.`
    );
    if (!isConfirmed) return;

    setError("");
    setSuccessMsg("");
    setProcessingId(bookingId);

    try {
      const response = await apiClient.put(`/admin/bookings/${bookingId}/no-show`, {
        type,
      });
      setSuccessMsg(response.data.message || `No-show recorded successfully.`);
      await fetchBookings();
    } catch (err) {
      console.error("No-show recording error:", err);
      setError(err.response?.data?.message || "Failed to record no-show.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-36">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground font-semibold">
          Accessing admin records...
        </p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "BOOKED":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/25";
      case "COMPLETED":
        return "bg-primary/10 text-primary border-primary/25";
      case "CANCELLED":
      case "DRIVER_CANCELLED":
        return "bg-destructive/10 text-destructive border-destructive/25";
      case "DISPUTED":
        return "bg-amber-500/10 text-amber-500 border-amber-500/25 animate-pulse";
      default:
        return "bg-secondary text-muted-foreground border-border/60";
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "PAID_IN_ESCROW":
        return "bg-sky-500/10 text-sky-500 border-sky-500/25";
      case "RELEASED_TO_DRIVER":
        return "bg-primary/10 text-primary border-primary/25";
      case "REFUNDED":
      case "PARTIALLY_REFUNDED":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/25";
      default:
        return "bg-secondary text-muted-foreground border-border/60";
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <div className="flex items-center justify-between border-b border-border/30 pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Admin Escrow Panel</h1>
          <p className="mt-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            System Booking Ledger & Dispute Resolution Workflow
          </p>
        </div>
        <Button onClick={fetchBookings} variant="outline" className="border-border/60 gap-1.5">
          <RefreshCw className="size-4" /> Refresh
        </Button>
      </div>

      {successMsg && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-gradient-mint/10 p-3.5 text-sm text-primary border border-primary/20">
          <CheckCircle className="size-4 shrink-0 mt-0.5" strokeWidth={2.5} />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border/30 bg-background/30 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">Booking Details</th>
                <th className="px-6 py-4">Passenger</th>
                <th className="px-6 py-4">Driver</th>
                <th className="px-6 py-4">Financials</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-muted-foreground italic">
                    No bookings found in the database.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const ride = b.rideId || {};
                  const driver = ride.driverId || {};
                  const passenger = b.passengerId || {};
                  const bookingAmount = b.seatsBooked * (ride.price || 0);

                  return (
                    <tr key={b._id} className="hover:bg-background/25 transition-smooth">
                      {/* Booking Details */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">
                          {ride.origin?.address?.split(",")[0] || "Unknown"} →{" "}
                          {ride.destination?.address?.split(",")[0] || "Unknown"}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                          Date: {ride.dateTime ? new Date(ride.dateTime).toLocaleDateString("en-IN") : "N/A"}
                        </div>
                        <div className="text-[9px] text-muted-foreground font-semibold uppercase mt-1 tracking-wider">
                          ID: {b._id}
                        </div>
                      </td>

                      {/* Passenger */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{passenger.name || "N/A"}</div>
                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                          {passenger.phone || passenger.email || "No contact"}
                        </div>
                      </td>

                      {/* Driver */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{driver.name || "N/A"}</div>
                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                          {driver.phone || driver.email || "No contact"}
                        </div>
                      </td>

                      {/* Financials */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-foreground flex items-center">
                          <IndianRupee className="size-3.5" />
                          {bookingAmount}
                        </div>
                        <div className="text-[9px] text-muted-foreground font-semibold mt-0.5 tracking-wide">
                          Seats: {b.seatsBooked} × ₹{ride.price || 0}
                        </div>
                      </td>

                      {/* Badges */}
                      <td className="px-6 py-4 space-y-1.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${getStatusColor(
                            b.status
                          )}`}
                        >
                          {b.status}
                        </span>
                        <span
                          className={`block w-fit items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${getPaymentStatusColor(
                            b.paymentStatus
                          )}`}
                        >
                          {b.paymentStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {processingId === b._id ? (
                            <Loader2 className="size-5 animate-spin text-primary mr-3" />
                          ) : (
                            <>
                              {b.status === "DISPUTED" && (
                                <>
                                  <Button
                                    size="xs"
                                    variant="hero"
                                    onClick={() => handleResolveDispute(b._id, "release")}
                                  >
                                    Release Funds
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    className="text-destructive hover:bg-destructive/10 border-border/60"
                                    onClick={() => handleResolveDispute(b._id, "refund")}
                                  >
                                    Refund Passenger
                                  </Button>
                                </>
                              )}

                              {b.status === "BOOKED" && b.paymentStatus === "PAID_IN_ESCROW" && (
                                <>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    className="border-border/60"
                                    onClick={() => handleMarkNoShow(b._id, "passenger")}
                                  >
                                    Passenger No-Show
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    className="text-destructive hover:bg-destructive/10 border-border/60"
                                    onClick={() => handleMarkNoShow(b._id, "driver")}
                                  >
                                    Driver No-Show
                                  </Button>
                                </>
                              )}

                              {!["DISPUTED", "BOOKED"].includes(b.status) && (
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                  No Actions Available
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
