import React, { useState } from "react";
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

  // Mock Google Authentication trigger
  const handleGoogleLoginMock = () => {
    setError("Google OAuth is stubbed. Please use the phone OTP option for testing.");
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-gradient-hero px-5 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card/90 p-8 shadow-lift backdrop-blur-xl md:p-10">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-mint shadow-glow">
            <ShieldCheck className="size-6 text-primary-foreground" strokeWidth={2.4} />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">Welcome to RideSure</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === 1 ? "Enter your phone number to sign in or create an account" : "Enter the verification code sent to your phone"}
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
        <div className="mt-6">
          <button
            type="button"
            onClick={handleGoogleLoginMock}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-background py-3 text-sm font-medium transition-smooth hover:bg-secondary hover:border-primary/30 active:scale-[0.98]"
          >
            <svg className="size-4 shrink-0" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>Google Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
}
