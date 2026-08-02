import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Star,
  BadgeCheck,
  Calendar,
  MessageSquare,
  ShieldCheck,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { TrustScore } from "@/components/TrustScore";
import apiClient from "@/services/apiClient";

export default function PublicProfile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true);
      setError("");
      try {
        const [profileRes, reviewsRes] = await Promise.all([
          apiClient.get(`/users/${userId}`),
          apiClient.get(`/reviews/user/${userId}`),
        ]);
        setProfile(profileRes.data);
        setReviews(reviewsRes.data);
      } catch (err) {
        console.error("Fetch public profile error:", err);
        setError(err.response?.data?.message || "Failed to retrieve public profile data.");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchPublicData();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-36">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground font-semibold">
          Retrieving profile information...
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
          <AlertCircle className="size-7" />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold text-foreground">Profile not found</h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {error || "The user you are looking for does not exist."}
        </p>
        <Link
          to="/"
          className="mt-6 inline-block text-sm font-semibold text-primary transition-smooth hover:underline"
        >
          ← Go to home page
        </Link>
      </div>
    );
  }

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  // Calculate local average rating from actual reviews array
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "N/A";

  const renderAvatarContent = (userObj) => {
    if (
      userObj.profilePhoto &&
      (userObj.profilePhoto.startsWith("data:") || userObj.profilePhoto.startsWith("http"))
    ) {
      return (
        <img
          src={userObj.profilePhoto}
          alt={userObj.name}
          className="size-full rounded-full object-cover"
        />
      );
    }
    if (userObj.profilePhoto && userObj.profilePhoto.length <= 4) {
      return <span className="text-2xl">{userObj.profilePhoto}</span>;
    }
    const localInitials = userObj.name
      ? userObj.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";
    return <span className="font-bold text-sm">{localInitials}</span>;
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 md:py-14">
      <Link
        to={-1}
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-smooth hover:text-foreground mb-6"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        {/* Left Side: Summary Card */}
        <aside className="h-fit">
          <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-6 shadow-soft text-center flex flex-col items-center">
            {/* Avatar */}
            <div className="flex size-20 items-center justify-center rounded-full bg-accent font-display text-2xl font-bold text-accent-foreground border border-border/60 overflow-hidden shadow-sm">
              {profile.profilePhoto &&
              (profile.profilePhoto.startsWith("data:") ||
                profile.profilePhoto.startsWith("http")) ? (
                <img
                  src={profile.profilePhoto}
                  alt={profile.name}
                  className="size-full object-cover"
                />
              ) : profile.profilePhoto ? (
                <span className="text-3xl">{profile.profilePhoto}</span>
              ) : (
                initials
              )}
            </div>

            <h1 className="mt-4 font-display text-xl font-bold text-foreground">{profile.name}</h1>
            <p className="mt-1 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
              {profile.role === "both" ? "Passenger & Driver" : profile.role}
            </p>

            <div className="mt-4">
              <TrustScore score={profile.trustScore} size="lg" />
            </div>

            <div className="mt-6 w-full border-t border-border/20 pt-5 space-y-3.5 text-sm text-left">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Calendar className="size-4 text-primary" /> Member since
                </span>
                <span className="font-semibold text-foreground">
                  {new Date(profile.createdAt).getFullYear()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <Star className="size-4 text-trust fill-trust" /> Avg Rating
                </span>
                <span className="font-semibold text-foreground">{averageRating}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <MessageSquare className="size-4 text-primary" /> Total Reviews
                </span>
                <span className="font-semibold text-foreground">{reviews.length}</span>
              </div>
            </div>

            {profile.isVerified && (
              <div className="mt-6 w-full rounded-2xl bg-primary/5 border border-primary/25 p-3.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary">
                <BadgeCheck className="size-4" /> Identity Verified
              </div>
            )}
          </div>
        </aside>

        {/* Right Side: Reviews Feed */}
        <main className="space-y-6">
          <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-7 shadow-soft">
            <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              Reviews & Ratings ({reviews.length})
            </h2>

            {reviews.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border/40 bg-background/25 p-8 text-center">
                <p className="font-medium text-muted-foreground text-sm">No reviews yet</p>
                <p className="mt-1 text-xs text-muted-foreground/80 leading-relaxed">
                  Reviews left by other passengers will appear here after completed trips.
                </p>
              </div>
            ) : (
              <div className="mt-6 divide-y divide-border/20 space-y-6">
                {reviews.map((r, index) => (
                  <div key={r._id} className={`pt-6 ${index === 0 ? "pt-0" : ""}`}>
                    <div className="flex items-start gap-4">
                      {/* Reviewer Avatar */}
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary font-display font-bold text-secondary-foreground border border-border/40 overflow-hidden">
                        {renderAvatarContent(r.fromUserId)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-foreground">
                            {r.fromUserId?.name || "Passenger"}
                          </h4>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {new Date(r.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        {/* Star Rating */}
                        <div className="flex items-center gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`size-3.5 ${
                                star <= r.rating
                                  ? "fill-trust text-trust"
                                  : "text-muted-foreground/20"
                              }`}
                            />
                          ))}
                        </div>

                        {r.comment && (
                          <p className="mt-2 text-sm text-foreground/85 leading-relaxed bg-background/10 rounded-2xl p-3 border border-border/20">
                            {r.comment}
                          </p>
                        )}

                        {r.rideId && (
                          <div className="mt-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Trip: {r.rideId.origin?.address?.split(",")[0]} →{" "}
                            {r.rideId.destination?.address?.split(",")[0]}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
