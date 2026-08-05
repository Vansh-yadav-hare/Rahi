import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import apiClient from "../services/apiClient";
import { Button } from "../components/ui/button";
import { ShieldCheck, Phone, CheckCircle2, AlertCircle } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1 = Enter phone, 2 = Enter OTP

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [googleClientMissing, setGoogleClientMissing] = useState(false);

  useEffect(() => {
    /* global google */
    const initGoogleOAuth = () => {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error("VITE_GOOGLE_CLIENT_ID is not configured in .env.local");
        setGoogleClientMissing(true);
        return;
      }

      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleLoginSuccess,
        });

        window.google.accounts.id.renderButton(document.getElementById("google-signin-btn"), {
          theme: "outline",
          size: "large",
          width: "380px",
        });
      } else {
        // Retry in 500ms if script is not fully loaded yet
        setTimeout(initGoogleOAuth, 500);
      }
    };

    initGoogleOAuth();
  }, []);

  const handleGoogleLoginSuccess = async (response) => {
    setError("");
    setLoading(true);

    try {
      const idToken = response.credential;
      const apiResponse = await apiClient.post("/auth/google", { idToken });
      const { token, user } = apiResponse.data;
      login(token, user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Google Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone) {
      setError("Please enter a valid phone number");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await apiClient.post("/auth/otp/send", { phone });
      setSuccess(response.data.message || "OTP sent successfully! Check server logs.");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await apiClient.post("/auth/otp/verify", { phone, otp });
      const { token, user } = response.data;
      login(token, user);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-gradient-hero px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card/90 p-8 shadow-lift backdrop-blur-xl md:p-10">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-mint shadow-glow">
            <ShieldCheck className="size-6 text-primary-foreground" strokeWidth={2.4} />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
            Welcome to RideSure
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === 1
              ? "Enter your phone number to sign in or create an account"
              : "Enter the verification code sent to your phone"}
          </p>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/10 p-3.5 text-xs text-primary">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Phone Number
              </label>
              <div className="relative mt-2 flex items-center rounded-xl border border-border bg-background focus-within:border-primary/60 transition-smooth">
                <Phone className="absolute left-3.5 size-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full bg-transparent py-3 pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Verification Code (OTP)
              </label>
              <div className="relative mt-2 flex items-center rounded-xl border border-border bg-background focus-within:border-primary/60 transition-smooth">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="w-full bg-transparent py-3 px-4 text-center font-display text-lg tracking-[0.4em] outline-none placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-sm"
                />
              </div>
            </div>

            <Button type="submit" variant="hero" size="xl" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </Button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-2 w-full text-center text-xs text-muted-foreground transition-smooth hover:text-foreground hover:underline"
            >
              ← Back to phone number
            </button>
          </form>
        )}

        {/* Divider */}
        <div className="relative mt-8 flex items-center justify-center">
          <div className="absolute w-full border-t border-border/80"></div>
          <span className="relative bg-card px-3 text-xs text-muted-foreground">or login with</span>
        </div>

        {/* Google Authentication */}
        <div className="mt-6 flex justify-center">
          {googleClientMissing ? (
            <div className="w-full text-center p-4 border border-dashed border-amber-500/30 rounded-2xl bg-amber-500/5 text-amber-200 text-xs">
              <span className="font-semibold block mb-1.5 text-amber-400">Google Login Not Configured</span>
              Add <code className="bg-background/80 px-1.5 py-0.5 rounded text-foreground font-mono text-[10px]">VITE_GOOGLE_CLIENT_ID</code> to your <code className="bg-background/80 px-1.5 py-0.5 rounded text-foreground font-mono text-[10px]">frontend/.env</code> to show the Google button.
            </div>
          ) : (
            <div
              id="google-signin-btn"
              className="w-full max-w-[380px] overflow-hidden flex justify-center"
            ></div>
          )}
        </div>
      </div>
    </div>
  );
}
