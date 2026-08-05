import React, { useState, useEffect } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Camera } from "lucide-react";
import apiClient from "../services/apiClient";

export default function Profile() {
  const { user, isAuthenticated, logout, updateUser } = useAuth();

  // Settings State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [role, setRole] = useState("passenger");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setProfilePhoto(user.profilePhoto || "");
      setRole(user.role || "passenger");
    }
  }, [user]);

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
      return <img src={photo} alt="Avatar" className="size-full rounded-full object-cover" />;
    }
    if (photo && photo.length <= 4) {
      return <span className="text-3xl">{photo}</span>;
    }
    return <span className="text-xl font-bold">{initials || "?"}</span>;
  };

  const fieldStyle =
    "flex flex-col gap-1.5 rounded-xl border border-border/40 bg-background/25 px-3.5 py-2.5 transition-smooth hover:bg-background/40 hover:border-primary/30 focus-within:bg-background/55 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/15 focus-within:ring-offset-2 focus-within:ring-offset-background";

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-8 shadow-soft max-w-xl mx-auto">
        <h1 className="font-display text-3xl font-bold animate-fade-in text-foreground">
          Profile Settings
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Manage your personal information and verified status.
        </p>

        {/* Verification Status Card */}
        <div className="mt-6 rounded-2xl border border-border/40 bg-background/30 p-4 flex items-center justify-between">
          <div className="flex-1 pr-4">
            <h3 className="text-sm font-bold text-foreground">Identity Verification</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {user?.isVerified
                ? "Your identity is verified. You get full access and higher trust."
                : "Verify your identity to get the trust badge and offer rides."}
            </p>
          </div>
          <Link
            to="/verification"
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-bold transition-smooth shrink-0 ${
              user?.isVerified
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {user?.isVerified ? "Verified" : "Verify Now"}
          </Link>
        </div>

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
            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="flex-1"
              disabled={saveLoading}
            >
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
