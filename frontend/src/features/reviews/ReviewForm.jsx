import React, { useState } from "react";
import { Star, X, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/services/apiClient";

export default function ReviewForm({ rideId, isOpen, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating (1-5 stars).");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await apiClient.post("/reviews", {
        rideId,
        rating,
        comment,
      });
      setSuccess("Thank you! Your review has been submitted successfully.");
      setTimeout(() => {
        onSuccess?.();
        onClose();
        // Reset states
        setRating(0);
        setComment("");
        setSuccess("");
      }, 2000);
    } catch (err) {
      console.error("Submit review error:", err);
      setError(err.response?.data?.message || "Failed to submit your review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-3xl border border-border/40 bg-card/90 backdrop-blur-md p-6 shadow-lift animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <h3 className="font-display text-xl font-bold text-foreground">Write a Review</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Share your experience to help the community build trust.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-gradient-mint/10 p-3 text-xs text-primary border border-primary/20">
            <CheckCircle className="size-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Star Selection */}
          <div className="flex flex-col items-center gap-1.5 py-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Your Rating
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-smooth transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`size-8 transition-smooth ${
                        isFilled
                          ? "fill-trust text-trust"
                          : "text-muted-foreground/40 hover:text-muted-foreground/60"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment Text Area */}
          <div className="flex flex-col gap-1.5 rounded-2xl border border-border/40 bg-background/25 px-4 py-3 transition-smooth focus-within:bg-background/55 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/15">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
              Review Comment (Optional)
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the ride? Talk about safety, punctuality, comfort, conversation..."
              rows={3}
              className="bg-transparent text-sm text-foreground outline-none resize-none w-full placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-border/60"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" variant="hero" className="flex-1" disabled={loading || !!success}>
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
