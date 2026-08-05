import React, { useState } from "react";
import { AlertOctagon, Loader2, ShieldAlert, Check } from "lucide-react";
import { Button } from "./ui/button";
import apiClient from "../services/apiClient";

export default function SOSButton({ rideId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle"); // idle, success, error
  const [errorMsg, setErrorMsg] = useState("");

  const handleTriggerSOS = async () => {
    setLoading(true);
    setErrorMsg("");

    // Helper function to send SOS request
    const sendSOSRequest = async (lat = null, lng = null) => {
      try {
        await apiClient.post("/sos", {
          rideId,
          latitude: lat,
          longitude: lng,
        });
        setStatus("success");
        setTimeout(() => {
          setIsOpen(false);
          setStatus("idle");
        }, 5000);
      } catch (err) {
        console.error("SOS Trigger failure", err);
        setErrorMsg(err.response?.data?.message || "Failed to trigger SOS alert.");
        setStatus("error");
      } finally {
        setLoading(false);
      }
    };

    // Attempt to grab GPS coordinates first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendSOSRequest(position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          console.warn(
            "Geolocation permission denied or timed out for SOS, sending without coords",
            err,
          );
          sendSOSRequest();
        },
        { timeout: 5000, enableHighAccuracy: true },
      );
    } else {
      sendSOSRequest();
    }
  };

  return (
    <>
      {/* Floating Panic Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-destructive text-white shadow-lg hover:scale-105 active:scale-95 transition-smooth hover:bg-destructive/90 animate-pulse border-4 border-destructive/25"
        title="Emergency SOS"
      >
        <AlertOctagon className="size-7" />
      </button>

      {/* Confirmation Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-destructive/20 bg-card p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/25 animate-bounce">
              <ShieldAlert className="size-8" />
            </div>

            {status === "idle" ? (
              <>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Trigger Emergency SOS?</h3>
                  <p className="text-xs text-muted-foreground">
                    This will immediately notify emergency contacts and log a safety alert on our
                    servers with your coordinates.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-2">
                  <Button
                    onClick={handleTriggerSOS}
                    variant="hero"
                    disabled={loading}
                    className="bg-destructive hover:bg-destructive/90 text-white w-full border-none shadow-md py-5 font-bold text-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" /> Triggering SOS...
                      </>
                    ) : (
                      "CONFIRM EMERGENCY SOS"
                    )}
                  </Button>
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="outline"
                    disabled={loading}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            ) : status === "success" ? (
              <div className="py-4 space-y-3">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Check className="size-6 text-emerald-500" />
                </div>
                <h4 className="text-base font-bold text-foreground">Emergency Alerts Dispatched</h4>
                <p className="text-xs text-muted-foreground">
                  Your SOS alert was recorded. Support is notified and help is on the way. Please
                  keep calm.
                </p>
                <div className="pt-2 text-[10px] text-muted-foreground animate-pulse">
                  This panel will automatically close shortly...
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-3">
                <h4 className="text-base font-bold text-destructive">Failed to Send SOS</h4>
                <p className="text-xs text-muted-foreground">{errorMsg}</p>
                <div className="flex gap-2.5 pt-2">
                  <Button onClick={handleTriggerSOS} className="flex-1" variant="hero">
                    Retry
                  </Button>
                  <Button onClick={() => setIsOpen(false)} className="flex-1" variant="outline">
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
