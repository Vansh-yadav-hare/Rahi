import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Navigate, Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  IndianRupee,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthContext";
import apiClient from "@/services/apiClient";
import { normalizeRide, getShortAddress } from "@/lib/rides";

// Helper to inject script tag for Razorpay SDK modal
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function Booking() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();

  // Route Segment Pickup / Dropoff parameters
  const pickupParam = searchParams.get("pickup") || "";
  const dropoffParam = searchParams.get("dropoff") || "";

  const [ride, setRide] = useState(null);
  const [loadingRide, setLoadingRide] = useState(true);
  const [error, setError] = useState("");

  const [seatsBooked, setSeatsBooked] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [payingWithWallet, setPayingWithWallet] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState("");

  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Fetch ride details
  useEffect(() => {
    const fetchRide = async () => {
      setLoadingRide(true);
      setError("");
      try {
        const response = await apiClient.get(`/rides/${rideId}`);
        const normalized = normalizeRide(response.data);
        setRide(normalized);
      } catch (err) {
        console.error("Fetch ride for booking error:", err);
        setError("Failed to fetch ride details. The ride may no longer be available.");
      } finally {
        setLoadingRide(false);
      }
    };

    if (rideId) {
      fetchRide();
    }
  }, [rideId]);

  // Fetch current user wallet balance
  useEffect(() => {
    const fetchWallet = async () => {
      if (!isAuthenticated) return;
      setLoadingWallet(true);
      try {
        const response = await apiClient.get("/wallet");
        setWalletBalance(response.data.walletBalance || 0);
      } catch (err) {
        console.error("Fetch wallet balance error:", err);
      } finally {
        setLoadingWallet(false);
      }
    };

    fetchWallet();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (loadingRide) {
    return (
      <div className="flex flex-col items-center justify-center p-36">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground font-semibold">
          Preparing booking screen...
        </p>
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
          <AlertCircle className="size-7" />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold text-foreground">
          Booking unavailable
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{error}</p>
        <Link
          to="/search"
          className="mt-6 inline-block text-sm font-semibold text-primary transition-smooth hover:underline"
        >
          ← Back to search
        </Link>
      </div>
    );
  }

  // Prorated segment pricing logic
  const stopsList = [
    ride.fullFrom || ride.from,
    ...(ride.rawStops || []).map((s) => s.address),
    ride.fullTo || ride.to,
  ];

  const startIdx = stopsList.indexOf(pickupParam || ride.fullFrom || ride.from);
  const endIdx = stopsList.indexOf(dropoffParam || ride.fullTo || ride.to);

  let pricePerSeat = ride.price;
  if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
    const legsCount = stopsList.length - 1;
    pricePerSeat = Math.round(((endIdx - startIdx) / legsCount) * ride.price);
  }

  const subtotal = seatsBooked * pricePerSeat;
  const bookingFee = 29; // fixed insurance/platform fee
  const totalAmount = subtotal + bookingFee;

  const handlePayAndConfirm = async () => {
    setError("");
    setProcessing(true);

    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error(
          "Failed to load Razorpay payment helper. Please check your internet connection.",
        );
      }

      // 2. Create the Booking on the backend (Pending state)
      const bookingResponse = await apiClient.post("/bookings", {
        rideId: ride.id,
        seatsBooked,
        pickup: pickupParam || ride.fullFrom || ride.from,
        dropoff: dropoffParam || ride.fullTo || ride.to,
      });
      const booking = bookingResponse.data.booking;

      // 3. Create the payment order on the backend
      const orderResponse = await apiClient.post("/payments/order", {
        bookingId: booking._id,
      });
      const order = orderResponse.data;

      // Local sandbox check: bypass checkout modal if it's a simulated order
      if (order.orderId && order.orderId.startsWith("order_mock_")) {
        console.log("[PAYMENT] Mock order detected. Bypassing Razorpay Modal checkout.");
        try {
          const verifyResponse = await apiClient.post("/payments/verify", {
            razorpay_order_id: order.orderId,
            razorpay_payment_id:
              "pay_mock_" + Math.random().toString(36).substring(2, 10).toUpperCase(),
            razorpay_signature: "mock_signature",
            bookingId: booking._id,
          });
          setTransactionId(verifyResponse.data.payment.razorpayPaymentId);
          setPaymentSuccess(true);
        } catch (verifyErr) {
          console.error("Mock verify signature error:", verifyErr);
          setError("Failed to verify simulated payment order.");
        } finally {
          setProcessing(false);
        }
        return;
      }

      // 4. Configure Razorpay checkout options for real orders
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Rahi Ride Share",
        description: `Seat Booking for ${getShortAddress(pickupParam || ride.from)} to ${getShortAddress(dropoffParam || ride.to)}`,
        order_id: order.orderId,
        handler: async function (response) {
          try {
            setProcessing(true);
            // 5. Send transaction details for signature verification
            const verifyResponse = await apiClient.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking._id,
            });

            setTransactionId(response.razorpay_payment_id);
            setPaymentSuccess(true);
          } catch (verifyErr) {
            console.error("Signature verification error:", verifyErr);
            setError(
              verifyErr.response?.data?.message ||
                "Your payment was charged, but we failed to confirm it in our systems. Please contact support with payment ID: " +
                  response.razorpay_payment_id,
            );
          } finally {
            setProcessing(false);
          }
        },
        prefill: {
          name: user.name || "",
          email: user.email || "",
          contact: user.phone || "",
        },
        theme: {
          color: "#E11D48", // primary rose hex matching design
        },
        modal: {
          ondismiss: function () {
            setProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Booking payment flow error:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "An unexpected error occurred while initiating payment.",
      );
      setProcessing(false);
    }
  };

  const handlePayWithWallet = async () => {
    setError("");
    setProcessing(true);
    setPayingWithWallet(true);

    try {
      // 1. Create the booking request
      const bookingResponse = await apiClient.post("/bookings", {
        rideId: ride.id,
        seatsBooked,
        pickup: pickupParam || ride.fullFrom || ride.from,
        dropoff: dropoffParam || ride.fullTo || ride.to,
      });
      const booking = bookingResponse.data.booking;

      // 2. Process pay with wallet endpoint
      const payResponse = await apiClient.put(`/bookings/${booking._id}/pay-wallet`);

      setTransactionId(payResponse.data.booking.paymentId);
      setPaymentSuccess(true);
    } catch (err) {
      console.error("Rahi Wallet Payment Error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to process transaction via wallet. Check your balance and try again.",
      );
    } finally {
      setProcessing(false);
      setPayingWithWallet(false);
    }
  };

  // Success Receipt View
  if (paymentSuccess) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-8 shadow-lift">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-mint shadow-glow mx-auto animate-bounce">
            <CheckCircle2 className="size-8 text-primary-foreground" strokeWidth={2.4} />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold text-foreground">
            Seat Secured (Payment in Escrow)
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Your payment of <strong>₹{totalAmount}</strong> was successfully verified and is now
            held safely in Rahi Escrow. Funds will be released to the driver only after the ride
            completes.
          </p>

          <div className="mt-8 border-t border-border/30 pt-6 text-left space-y-3 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Transaction Ref:</span>
              <span className="font-semibold text-foreground truncate max-w-[200px]">
                {transactionId}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Seats Booked:</span>
              <span className="font-semibold text-foreground">
                {seatsBooked} {seatsBooked === 1 ? "Seat" : "Seats"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>From:</span>
              <span className="font-semibold text-foreground truncate max-w-[200px]">
                {getShortAddress(pickupParam || ride.from)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>To:</span>
              <span className="font-semibold text-foreground truncate max-w-[200px]">
                {getShortAddress(dropoffParam || ride.to)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span className="font-semibold text-foreground">{ride.date}</span>
            </div>
            <div className="flex justify-between">
              <span>Time:</span>
              <span className="font-semibold text-foreground">{ride.departTime}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Button asChild variant="hero" size="xl" className="w-full">
              <Link to="/my-bookings">Go to My Bookings</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link to="/">Go Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Generate seats array option [1, 2, ..., seatsAvailable]
  const seatOptions = Array.from({ length: Math.min(6, ride.seatsAvailable) }, (_, i) => i + 1);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <Link
        to={`/ride/${ride.id}`}
        className="text-sm font-semibold text-muted-foreground transition-smooth hover:text-foreground"
      >
        ← Back to ride details
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Side: Seat Selection Card */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-7 shadow-soft">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Confirm your booking
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Verify your itinerary and choose how many seats you wish to book. Seat availability is
              updated dynamically.
            </p>

            {/* Route Summary */}
            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-secondary/30 p-4 border border-border/30">
              <div className="text-xs font-semibold text-primary">{ride.date}</div>
              <div className="text-muted-foreground text-xs">·</div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <span>{getShortAddress(pickupParam || ride.from)}</span>
                <ArrowRight className="size-3.5 text-primary" />
                <span>{getShortAddress(dropoffParam || ride.to)}</span>
              </div>
            </div>

            {/* Seats Selector */}
            <div className="mt-8 space-y-3.5">
              <label className="text-sm font-bold text-foreground block">Select Seats</label>
              <div className="flex flex-wrap gap-2.5">
                {seatOptions.length > 0 ? (
                  seatOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSeatsBooked(opt)}
                      className={`flex size-12 items-center justify-center rounded-xl border text-sm font-bold transition-smooth hover:scale-[1.03] active:scale-[0.97] ${
                        seatsBooked === opt
                          ? "border-primary bg-primary/10 text-primary shadow-soft"
                          : "border-border/40 bg-background/25 hover:bg-background/40"
                      }`}
                    >
                      {opt}
                    </button>
                  ))
                ) : (
                  <div className="text-sm font-semibold text-destructive py-2">
                    No seats available on this segment.
                  </div>
                )}
              </div>
              <p className="text-[11px] font-medium text-muted-foreground">
                You can book up to {ride.seatsAvailable} remaining{" "}
                {ride.seatsAvailable === 1 ? "seat" : "seats"} for this segment.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-start gap-3">
            <ShieldCheck className="size-5 shrink-0 text-primary mt-0.5" />
            <div>
              <p className="text-xs font-bold text-primary">RideSure Seat Protection</p>
              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                Includes full refunds on early cancellations, 24/7 incident helpline support, and
                trip tracking links for family.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Cost Summary & Payment Buttons */}
        <aside className="h-fit">
          <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-7 shadow-lift space-y-6">
            <h3 className="font-display text-lg font-bold text-foreground">Price Summary</h3>

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-xs text-destructive border border-destructive/20">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3.5 text-sm border-b border-border/30 pb-5">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">
                  ₹{pricePerSeat} × {seatsBooked} {seatsBooked === 1 ? "seat" : "seats"}
                </span>
                <span className="font-semibold text-foreground">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Ride insurance & fee</span>
                <span className="font-semibold text-foreground">₹{bookingFee}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-base border-b border-border/30 pb-5">
              <span className="font-bold text-foreground">Total Amount</span>
              <span className="flex items-center font-display text-2xl font-bold text-primary">
                <IndianRupee className="size-4 mr-0.5 mt-1" strokeWidth={2.5} />
                {totalAmount}
              </span>
            </div>

            <div className="space-y-3">
              {/* Pay via Razorpay Online */}
              <Button
                variant="hero"
                size="xl"
                className="w-full"
                onClick={handlePayAndConfirm}
                disabled={processing || seatOptions.length === 0}
              >
                {processing && !payingWithWallet ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Processing Payment...
                  </>
                ) : (
                  "Pay with Cards/UPI"
                )}
              </Button>

              {/* Pay via Wallet balance option */}
              <div className="rounded-2xl border border-border/30 bg-background/10 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Wallet className="size-3.5 text-primary" /> Rahi Wallet Balance
                  </span>
                  <span className="font-bold text-foreground">
                    {loadingWallet ? (
                      <Loader2 className="size-3 animate-spin inline" />
                    ) : (
                      `₹${walletBalance.toFixed(2)}`
                    )}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-border/60 hover:bg-primary/5 hover:text-primary hover:border-primary/50 text-xs font-bold"
                  onClick={handlePayWithWallet}
                  disabled={processing || seatOptions.length === 0 || walletBalance < totalAmount}
                >
                  {payingWithWallet ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Transferring...
                    </>
                  ) : walletBalance < totalAmount ? (
                    "Insufficient Wallet Balance"
                  ) : (
                    "Pay via Rahi Wallet"
                  )}
                </Button>
              </div>
            </div>

            <p className="text-[9px] text-center font-bold text-muted-foreground uppercase tracking-wider">
              Payments are held securely in Escrow
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
