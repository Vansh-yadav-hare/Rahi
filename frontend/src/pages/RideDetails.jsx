import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import {
  ArrowRight,
  BadgeCheck,
  Car,
  MapPin,
  MessagesSquare,
  Siren,
  Star,
  Users,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrustScore } from "@/components/TrustScore";
import { normalizeRide } from "@/lib/rides";
import apiClient from "@/services/apiClient";
import ReviewForm from "@/features/reviews/ReviewForm";

export default function RideDetails() {
  const { rideId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasBooking, setHasBooking] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  const handleCompleteRide = async () => {
    setCompleting(true);
    try {
      await apiClient.put(`/rides/${rideId}/complete`);
      setRide((prev) => ({ ...prev, status: "completed" }));
      setIsCompleted(true);
    } catch (err) {
      console.error("Complete ride error:", err);
      alert(err.response?.data?.message || "Failed to mark ride as completed.");
    } finally {
      setCompleting(false);
    }
  };

  useEffect(() => {
    const fetchRideDetails = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiClient.get(`/rides/${rideId}`);
        const normalized = normalizeRide(response.data);
        setRide(normalized);

        const completed =
          response.data.status === "completed" ||
          new Date(response.data.dateTime) <= new Date();
        setIsCompleted(completed);

        // Check if user has a confirmed booking for this ride
        const savedToken = localStorage.getItem("token");
        if (savedToken) {
          try {
            const bookingsRes = await apiClient.get("/bookings/me");
            const matched = bookingsRes.data.find(
              (b) => b.rideId?._id === rideId && b.status === "confirmed"
            );
            if (matched) {
              setHasBooking(true);
            }

            // Also check if they already submitted a review
            const reviewsRes = await apiClient.get(`/reviews/user/${normalized.driver.id}`);
            const reviewed = reviewsRes.data.some(
              (r) => r.rideId?._id === rideId && r.fromUserId?._id === user?.id
            );
            setHasReviewed(reviewed);
          } catch (bErr) {
            console.error("Failed to load user bookings/reviews in RideDetails:", bErr);
          }
        }
      } catch (err) {
        console.error("Get ride details error:", err);
        setError(
          err.response?.data?.message ||
            "Failed to retrieve ride details from the server."
        );
      } finally {
        setLoading(false);
      }
    };

    if (rideId) {
      fetchRideDetails();
    }
  }, [rideId, user]);

  const handleBookRide = () => {
    navigate(`/booking/${ride.id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-36">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground font-semibold">
          Retrieving ride details...
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
        <h2 className="mt-6 font-display text-2xl font-bold text-foreground">Ride not found</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {error || "This ride does not exist or has been completed."}
        </p>
        <Link
          to="/search"
          className="mt-6 inline-block text-sm font-semibold text-primary transition-smooth hover:underline"
        >
          ← Back to search results
        </Link>
      </div>
    );
  }

  const getShortAddress = (fullAddress) => {
    if (!fullAddress) return "";
    const parts = fullAddress.split(", ");
    return parts.length > 0 ? parts[0] : fullAddress;
  };

  const isDriver =
    user &&
    ride &&
    (user.id === ride.driver.id || user._id === ride.driver.id);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <Link
        to="/search"
        className="text-sm font-semibold text-muted-foreground transition-smooth hover:text-foreground"
      >
        ← Back to results
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          {/* Main Card */}
          <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-7 shadow-soft">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{ride.date}</span>
              <span>·</span>
              <span>{ride.duration}</span>
            </div>
            <h1 className="mt-2 flex flex-wrap items-center gap-3 font-display text-3xl font-bold md:text-4xl text-foreground">
              {ride.from} <ArrowRight className="size-6 text-primary animate-pulse" /> {ride.to}
            </h1>

            <ol className="mt-8 space-y-6">
              {[ride.from, ...ride.stops, ride.to].map((stop, i, arr) => (
                <li key={stop} className="relative flex gap-4 pl-1">
                  <span className="relative flex flex-col items-center">
                    <span
                      className={`size-3 rounded-full ${
                        i === 0 || i === arr.length - 1
                          ? "bg-primary ring-4 ring-primary/20"
                          : "bg-border"
                      }`}
                    />
                    {i < arr.length - 1 && (
                      <span className="absolute top-3 h-[calc(100%+1rem)] w-px bg-border/60" />
                    )}
                  </span>
                  <div className="-mt-1">
                    <div className="font-semibold text-sm text-foreground">{stop}</div>
                    <div className="text-[11px] font-medium text-muted-foreground mt-0.5">
                      {i === 0
                        ? `Departure ${ride.departTime}`
                        : i === arr.length - 1
                          ? `Arrival ${ride.arriveTime}`
                          : "Intermediate stop"}
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-wrap gap-2 border-t border-border/30 pt-6">
              {ride.perks.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>

          {/* Driver details Card */}
          <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-7 shadow-soft">
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={`/profile/${ride.driver.id}`}
                className="flex size-14 items-center justify-center rounded-full bg-accent font-display text-lg font-bold text-accent-foreground border border-border/60 overflow-hidden hover:opacity-80 transition-opacity"
              >
                {ride.driver.profilePhoto &&
                (ride.driver.profilePhoto.startsWith("data:") ||
                  ride.driver.profilePhoto.startsWith("http")) ? (
                  <img
                    src={ride.driver.profilePhoto}
                    alt="Avatar"
                    className="size-full object-cover"
                  />
                ) : ride.driver.profilePhoto && ride.driver.profilePhoto.length <= 4 ? (
                  <span className="text-2xl">{ride.driver.profilePhoto}</span>
                ) : (
                  <span>{ride.driver.initials}</span>
                )}
              </Link>
              <div className="mr-auto">
                <Link
                  to={`/profile/${ride.driver.id}`}
                  className="font-display text-xl font-bold text-foreground hover:text-primary transition-colors block"
                >
                  {ride.driver.name}
                </Link>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 font-medium">
                  <Star className="size-3.5 fill-trust text-trust" />
                  {ride.driver.rating} · {ride.driver.trips} trips · member since{" "}
                  {ride.driver.joined}
                </p>
              </div>
              <TrustScore score={ride.driver.trustScore} size="lg" />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {ride.driver.verified.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  <BadgeCheck className="size-3.5" /> {v} verified
                </span>
              ))}
            </div>

            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <Car className="size-4 text-primary" /> {ride.driver.car}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-border/30 pt-6">
              <Button variant="outline" className="border-border/60">
                <MessagesSquare className="size-4" /> Message driver
              </Button>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Siren className="size-4" /> Report a concern
              </Button>
            </div>
          </div>

          {/* Review section for completed rides */}
          {isCompleted && hasBooking && (
            <div className="mt-6">
              {hasReviewed ? (
                <div className="rounded-3xl border border-dashed border-border/40 bg-card/25 p-6 text-center text-muted-foreground text-sm font-semibold">
                  You have already reviewed this trip. Thank you!
                </div>
              ) : (
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={() => setIsReviewOpen(true)}
                >
                  Leave a Review
                </Button>
              )}
              <ReviewForm
                rideId={rideId}
                isOpen={isReviewOpen}
                onClose={() => setIsReviewOpen(false)}
                onSuccess={() => {
                  setHasReviewed(true);
                }}
              />
            </div>
          )}
        </div>

        {/* Pricing Card */}
        <aside className="h-fit lg:sticky lg:top-24">
          <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-7 shadow-lift">
            <div className="flex items-end justify-between">
              <div>
                <div className="font-display text-3xl font-bold text-foreground">₹{ride.price}</div>
                <div className="text-xs text-muted-foreground mt-0.5">per seat, all inclusive</div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2.5 py-1 text-xs font-semibold text-secondary-foreground">
                <Users className="size-3.5" /> {ride.seatsAvailable} left
              </span>
            </div>

            <div className="mt-6 space-y-3.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Seats</span>
                <span className="font-semibold text-foreground">1 passenger</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Pickup</span>
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <MapPin className="size-3.5 text-primary" /> {getShortAddress(ride.from)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Ride insurance</span>
                <span className="font-semibold text-foreground">+₹29</span>
              </div>
            </div>

            {isDriver ? (
              ride.status === "active" ? (
                <Button
                  variant="hero"
                  size="xl"
                  className="mt-7 w-full"
                  onClick={handleCompleteRide}
                  disabled={completing}
                >
                  {completing ? (
                    <>
                      <Loader2 className="mr-1.5 size-4 animate-spin" /> Completing...
                    </>
                  ) : (
                    "Complete Ride"
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="xl"
                  className="mt-7 w-full border-border/60"
                  disabled
                >
                  Completed
                </Button>
              )
            ) : (
              <Button
                variant="hero"
                size="xl"
                className="mt-7 w-full"
                onClick={handleBookRide}
                disabled={isCompleted}
              >
                {isCompleted
                  ? "Ride completed"
                  : ride.instantBook
                    ? "Book instantly"
                    : "Request to book"}
              </Button>
            )}

            <p className="mt-3 text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Free cancellation up to 12h before departure.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm font-semibold text-primary">Tracked from start to finish</p>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Share a live link with family, chat in-app, and trigger SOS at any point in the trip.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
