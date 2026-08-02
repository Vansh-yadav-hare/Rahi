import React, { useState, useEffect } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { Navigate, useParams, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Camera, Star, ArrowLeft, CalendarDays } from "lucide-react";
import apiClient from "../services/apiClient";
import { TrustScore } from "../components/TrustScore";

export default function Profile() {
  const { userId } = useParams();
  const { user, isAuthenticated, logout, updateUser } = useAuth();

  const isMe = !userId || userId === user?.id || userId === user?._id;

  // Settings State (for own profile)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [role, setRole] = useState("passenger");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  // Public Profile State (for others)
  const [publicUser, setPublicUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [publicError, setPublicError] = useState("");

  useEffect(() => {
    if (isMe && user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setProfilePhoto(user.profilePhoto || "");
      setRole(user.role || "passenger");
    }
  }, [user, isMe]);

  useEffect(() => {
    if (!isMe && userId) {
      const fetchPublicData = async () => {
        setLoadingPublic(true);
        setPublicError("");
        try {
          // Fetch public profile details
          const profileResponse = await apiClient.get(`/users/${userId}`);
          setPublicUser(profileResponse.data);

          // Fetch reviews for user
          const reviewsResponse = await apiClient.get(`/reviews/user/${userId}`);
          setReviews(reviewsResponse.data);
        } catch (err) {
          console.error("Fetch public profile error:", err);
          setPublicError(err.response?.data?.message || "Failed to load public profile details.");
        } finally {
          setLoadingPublic(false);
        }
      };

      fetchPublicData();
    }
  }, [userId, isMe]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleFileChange = (e) => {
    setSaveError("");
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setSaveError("Image size must be less than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError("");
    setSaveSuccess("");
    setSaveLoading(true);

    try {
      const response = await apiClient.put("/users/me", {
        name,
        email,
        profilePhoto,
        role,
      });

      updateUser(response.data.user || { ...user, name, email, profilePhoto, role });
      setSaveSuccess("Profile settings updated successfully!");
    } catch (err) {
      setSaveError(err.response?.data?.message || "Failed to update profile settings.");
    } finally {
      setSaveLoading(false);
    }
  };

  const renderAvatarContent = (photo, initials) => {
    if (photo && (photo.startsWith("data:") || photo.startsWith("http"))) {
      return (
        <img src={photo} alt="Avatar" className="size-full rounded-full object-cover" />
      );
    }
    if (photo && photo.length <= 4) {
      return <span className="text-3xl">{photo}</span>;
    }
    return <span className="text-xl font-bold">{initials || "?"}</span>;
  };

  const fieldStyle =
    "flex flex-col gap-1.5 rounded-xl border border-border/40 bg-background/25 px-3.5 py-2.5 transition-smooth hover:bg-background/40 hover:border-primary/30 focus-within:bg-background/55 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/15 focus-within:ring-offset-2 focus-within:ring-offset-background";

  // RENDER PUBLIC PROFILE
  if (!isMe) {
    if (loadingPublic) {
      return (
        <div className="flex flex-col items-center justify-center p-36">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground font-semibold">Retrieving profile...</p>
        </div>
      );
    }

    if (publicError || !publicUser) {
      return (
        <div className="mx-auto max-w-xl px-5 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
            <AlertCircle className="size-7" />
          </div>
          <h2 className="mt-6 font-display text-2xl font-bold text-foreground">User not found</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {publicError || "This user profile does not exist or has been deleted."}
          </p>
          <Link
            to="/"
            className="mt-6 inline-block text-sm font-semibold text-primary transition-smooth hover:underline"
          >
            ← Back to homepage
          </Link>
        </div>
      );
    }

    const publicInitials = publicUser.name
      ? publicUser.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";

    return (
      <div className="mx-auto max-w-4xl px-5 py-10 md:py-14">
        <Link
          to={-1}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-smooth hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.8fr]">
          {/* Public Profile Card */}
          <div className="h-fit rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-7 shadow-soft text-center flex flex-col items-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-accent font-display text-2xl font-bold border border-border/60 overflow-hidden">
              {renderAvatarContent(publicUser.profilePhoto, publicInitials)}
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold text-foreground">
              {publicUser.name}
            </h2>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1 bg-secondary/80 px-2.5 py-1 rounded-full border border-border/40">
              Role: {publicUser.role === "both" ? "Driver & Passenger" : publicUser.role}
            </p>

            <div className="mt-6 w-full pt-6 border-t border-border/20 flex flex-col items-center gap-4">
              <TrustScore score={publicUser.trustScore} size="lg" />

              {publicUser.isVerified && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                  Identity Verified
                </span>
              )}
            </div>

            <div className="mt-6 w-full pt-6 border-t border-border/20 text-xs text-muted-foreground flex items-center justify-center gap-1.5 font-medium">
              <CalendarDays className="size-4 text-primary" /> Member since{" "}
              {new Date(publicUser.createdAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
              })}
            </div>
          </div>

          {/* Reviews Card */}
          <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-7 shadow-soft">
            <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
              Reviews & Feedback
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              What other passengers and drivers said about {publicUser.name}.
            </p>

            <div className="mt-6 space-y-5">
              {reviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/40 bg-card/25 p-8 text-center text-muted-foreground text-sm italic">
                  No reviews submitted yet.
                </div>
              ) : (
                reviews.map((review) => {
                  const reviewer = review.fromUserId || {};
                  const reviewerInitials = reviewer.name
                    ? reviewer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "?";

                  return (
                    <div
                      key={review._id}
                      className="rounded-2xl border border-border/30 bg-background/25 p-5 shadow-soft hover:bg-background/40 transition-smooth"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-full bg-accent font-display text-xs font-bold border border-border/60 overflow-hidden">
                            {renderAvatarContent(reviewer.profilePhoto, reviewerInitials)}
                          </div>
                          <div>
                            <span className="font-semibold text-sm text-foreground block">
                              {reviewer.name || "Anonymous User"}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium block mt-0.5">
                              {new Date(review.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Star display */}
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`size-3.5 ${
                                star <= review.rating
                                  ? "fill-trust text-trust"
                                  : "text-muted-foreground/35"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {review.comment && (
                        <p className="mt-3.5 text-sm text-muted-foreground leading-relaxed italic bg-background/15 rounded-xl p-3 border border-border/20">
                          "{review.comment}"
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDER OWN PROFILE SETTINGS
  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-8 shadow-soft max-w-xl mx-auto">
        <h1 className="font-display text-3xl font-bold animate-fade-in text-foreground">
          Profile Settings
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Manage your personal information and verified status.
        </p>

        {saveSuccess && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-gradient-mint/10 p-3.5 text-sm text-primary border border-primary/20">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {saveError && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{saveError}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-8 space-y-6">
          <div className="flex items-center gap-5">
            <div
              onClick={() => document.getElementById("avatar-upload").click()}
              className="group relative flex size-16 cursor-pointer items-center justify-center rounded-full bg-accent font-display text-xl font-bold border border-border/60 overflow-hidden transition-smooth hover:border-primary/50"
            >
              {renderAvatarContent(profilePhoto, name ? name[0].toUpperCase() : "?")}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 opacity-0 transition-smooth group-hover:opacity-100 text-white">
                <Camera className="size-4" />
                <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wider">Upload</span>
              </div>
            </div>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <div>
              <h2 className="text-lg font-bold text-foreground">{name || "New Passenger"}</h2>
              <p className="text-xs text-muted-foreground">{user?.phone || user?.email}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-border/30 pt-6">
            <span className="text-xs font-semibold text-muted-foreground">
              Choose a Preset Avatar
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              {["😎", "🤠", "🎒", "🚗", "🗺️"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setProfilePhoto(emoji)}
                  className={`flex size-10 items-center justify-center rounded-xl border text-xl transition-smooth hover:scale-105 active:scale-95 ${
                    profilePhoto === emoji
                      ? "border-primary bg-primary/10 shadow-soft"
                      : "border-border/40 bg-background/25 hover:bg-background/40"
                  }`}
                >
                  {emoji}
                </button>
              ))}
              {profilePhoto && (
                <button
                  type="button"
                  onClick={() => setProfilePhoto("")}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground ml-auto transition-smooth"
                >
                  Reset to Initials
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4 border-t border-border/30 pt-6">
            <div className={fieldStyle}>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                Full Name
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="bg-transparent text-sm text-foreground outline-none w-full"
                required
              />
            </div>

            <div className={fieldStyle}>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                Email Address
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-transparent text-sm text-foreground outline-none w-full"
              />
            </div>

            <div className={fieldStyle}>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                Account Role
              </span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="bg-transparent text-sm text-foreground outline-none w-full cursor-pointer border-none p-0 focus:ring-0 focus:outline-none"
              >
                <option value="passenger" className="bg-card text-foreground">
                  Passenger (Book rides only)
                </option>
                <option value="driver" className="bg-card text-foreground">
                  Driver (Offer rides only)
                </option>
                <option value="both" className="bg-card text-foreground">
                  Both (Passenger & Driver)
                </option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-5 border-t border-border/30">
            <Button type="submit" variant="hero" size="lg" className="flex-1" disabled={saveLoading}>
              {saveLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={logout}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive border-border/60"
            >
              Log out
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

