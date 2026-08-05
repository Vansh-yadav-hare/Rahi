import React, { useState, useEffect } from "react";
import { useAuth } from "../features/auth/AuthContext";
import { Navigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  ShieldCheck,
  ShieldAlert,
  UploadCloud,
  Camera,
  Loader2,
  FileText,
  Check,
  AlertCircle,
} from "lucide-react";
import apiClient from "../services/apiClient";

export default function VerificationUpload() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const [status, setStatus] = useState(null); // verification record from db
  const [loading, setLoading] = useState(true);
  const [idFile, setIdFile] = useState(null);
  const [idPreview, setIdPreview] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchStatus = async () => {
    try {
      const response = await apiClient.get("/verification/status");
      setStatus(response.data.verification || null);
    } catch (err) {
      console.error("Error fetching verification status", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleIdChange = (e) => {
    setError("");
    setSuccess("");
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit.");
        return;
      }
      setIdFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setIdPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSelfieChange = (e) => {
    setError("");
    setSuccess("");
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds 5MB limit.");
        return;
      }
      setSelfieFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setSelfiePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const submitId = async () => {
    if (!idFile) return;
    setError("");
    setSuccess("");
    setUploadingId(true);
    const formData = new FormData();
    formData.append("idDoc", idFile);

    try {
      const response = await apiClient.post("/verification/id", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess("ID Document uploaded successfully!");
      setStatus(response.data.verification);
      setIdFile(null);
      setIdPreview(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload ID document.");
    } finally {
      setUploadingId(false);
    }
  };

  const submitSelfie = async () => {
    if (!selfieFile) return;
    setError("");
    setSuccess("");
    setUploadingSelfie(true);
    const formData = new FormData();
    formData.append("selfie", selfieFile);

    try {
      const response = await apiClient.post("/verification/face", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(response.data.message);
      setStatus(response.data.verification);

      // Update auth context user verification status on success
      if (response.data.verification?.status === "approved") {
        updateUser({ ...user, isVerified: true, trustScore: 90 });
      }
      setSelfieFile(null);
      setSelfiePreview(null);
    } catch (err) {
      setError(err.response?.data?.message || "Face verification comparison failed.");
    } finally {
      setUploadingSelfie(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Verification status logic
  const isDocUploaded = !!status?.govIdDoc;
  const isFaceVerified = status?.faceMatchStatus === "matched";
  const isPending = status?.status === "pending";
  const isApproved = status?.status === "approved";
  const isRejected = status?.status === "rejected";

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 md:py-14 bg-background">
      <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-8 shadow-soft max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {isApproved ? <ShieldCheck className="size-6" /> : <FileText className="size-6" />}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Identity Verification
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verify your profile to unlock trust badges, passenger verification and drive carpools.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-emerald-500/10 p-3.5 text-sm text-primary border border-emerald-500/20">
            <Check className="size-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Status Blocks */}
        {isApproved ? (
          <div className="mt-8 text-center space-y-4">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 animate-bounce">
              <ShieldCheck className="size-10 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">Profile Verified!</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Excellent! Your government ID matches your selfie. A green trust badge has been
                added to your profile.
              </p>
            </div>
            <div className="pt-4">
              <Link to="/profile">
                <Button variant="hero" className="w-full">
                  Return to Profile
                </Button>
              </Link>
            </div>
          </div>
        ) : isRejected ? (
          <div className="mt-8 text-center space-y-4">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/25">
              <ShieldAlert className="size-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">Verification Failed</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                We couldn't verify your document or face matching failed. Please try again with
                clear photos.
              </p>
            </div>
            <div className="pt-4">
              <Button variant="hero" className="w-full" onClick={() => setStatus(null)}>
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {/* Step 1: ID Upload */}
            <div
              className={`space-y-4 transition-all duration-300 ${isDocUploaded ? "opacity-60 pointer-events-none" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    1
                  </span>
                  Upload Government ID
                </h3>
                {isDocUploaded && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                    <Check className="size-3.5 text-emerald-400" /> Uploaded
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Please upload a clear picture of your National ID, Driver's License or Passport.
                Ensure all details are legible.
              </p>

              {!isDocUploaded && (
                <div className="space-y-4">
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-2xl p-6 bg-background/25 cursor-pointer hover:bg-background/45 hover:border-primary/50 transition-smooth">
                    <UploadCloud className="size-10 text-muted-foreground" />
                    <span className="text-sm font-bold text-foreground mt-2">
                      Choose file or drag & drop
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      JPEG, PNG up to 5MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleIdChange}
                    />
                  </label>

                  {idPreview && (
                    <div className="space-y-3">
                      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border/40">
                        <img src={idPreview} alt="ID Preview" className="size-full object-cover" />
                      </div>
                      <Button
                        onClick={submitId}
                        className="w-full"
                        variant="hero"
                        disabled={uploadingId}
                      >
                        {uploadingId ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" /> Uploading ID...
                          </>
                        ) : (
                          "Submit ID Document"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Selfie Face Match */}
            <div
              className={`space-y-4 transition-all duration-300 ${!isDocUploaded ? "opacity-30 pointer-events-none" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    2
                  </span>
                  Upload Selfie
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a live selfie. Our system will compare the selfie with your ID photo
                automatically using AI face-matching.
              </p>

              {isDocUploaded && (
                <div className="space-y-4">
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-2xl p-6 bg-background/25 cursor-pointer hover:bg-background/45 hover:border-primary/50 transition-smooth">
                    <Camera className="size-10 text-muted-foreground" />
                    <span className="text-sm font-bold text-foreground mt-2">
                      Take or upload a Selfie
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      JPEG, PNG up to 5MB
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleSelfieChange}
                    />
                  </label>

                  {selfiePreview && (
                    <div className="space-y-3">
                      <div className="relative size-40 mx-auto overflow-hidden rounded-full border-4 border-primary/25">
                        <img
                          src={selfiePreview}
                          alt="Selfie Preview"
                          className="size-full object-cover"
                        />
                      </div>
                      <Button
                        onClick={submitSelfie}
                        className="w-full"
                        variant="hero"
                        disabled={uploadingSelfie}
                      >
                        {uploadingSelfie ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" /> Comparing face
                            matches...
                          </>
                        ) : (
                          "Verify My Face"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
