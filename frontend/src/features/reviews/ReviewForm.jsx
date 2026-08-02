import React, { useState } from "react";
import { Star, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/services/apiClient";

export default function ReviewForm({ rideId, toUserId, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (rating === 0) {
      setError("Please select a rating of at least 1 star.");
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post("/reviews", {
        rideId,
        toUserId,
        rating,
        comment,
      });
      setSuccess("Thank you! Your review has been submitted.");
      if (onSuccess) {
        setTimeout(() => {
          onSuccess(response.data);
        }, 1500);
      }
    } catch (err) {
      console.error("Submit review error:", err);
      setError(err.response?.data?.message || "Failed to submit your review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-6 shadow-soft w-full max-w-lg mx-auto">
      <h3 className="font-display text-xl font-bold text-foreground">Rate your trip</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Share your experience to help improve the community trust score.
      </p>

      {success && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-gradient-mint/10 p-3.5 text-sm text-primary border border-primary/20">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Star Rating Selector */}
          <div className="flex flex-col items-center justify-center py-4 bg-background/20 rounded-2xl border border-border/20">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">
              Your Rating
            </span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((starValue) => {
                const isHighlighted = (hoverRating || rating) >= starValue;
                return (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`size-8 transition-colors ${
                        isHighlighted
                          ? "fill-trust text-trust"
                          : "text-muted-foreground/45"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-semibold text-muted-foreground mt-2">
              {rating ? `${rating} of 5 Stars` : "Select a rating"}
            </span>
          </div>

          {/* Comment TextArea */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-border/40 bg-background/25 px-3.5 py-2.5 transition-smooth hover:bg-background/40 hover:border-primary/30 focus-within:bg-background/55 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/15">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
              Written Review
            </span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What went well or could have been better?"
              rows={3}
              className="bg-transparent text-sm text-foreground outline-none w-full resize-none"
            />
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Submitting...
              </>
            ) : (
              "Submit Review"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
