import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  CalendarDays,
  Users,
  IndianRupee,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/services/apiClient";

// Reusable intermediate stop input component with Nominatim autocomplete
function StopInput({ value, onChange, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showList, setShowList] = useState(false);
  const [loading, setLoading] = useState(false);
  const selectedRef = useRef(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current = false;
      return;
    }
    if (!value || value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=1&countrycodes=in`,
        );
        if (response.ok) {
          const data = await response.json();
          const uniqueResults = data.map((item) => {
            const parts = item.display_name.split(", ");
            const shortName = parts.slice(0, 3).join(", ");
            return {
              fullName: item.display_name,
              shortName: shortName,
            };
          });
          setSuggestions(uniqueResults);
        }
      } catch (err) {
        console.error("Stop autocomplete fetch error:", err);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fieldStyle =
    "flex flex-1 items-center gap-2.5 rounded-xl border border-border/40 bg-background/25 px-3.5 py-3 transition-smooth hover:bg-background/45 hover:border-primary/30 focus-within:bg-background/55 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/15 focus-within:ring-offset-2 focus-within:ring-offset-background";

  return (
    <div ref={containerRef} className="relative w-full">
      <label className={fieldStyle}>
        {loading ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
        ) : (
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
        )}
        <input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowList(true);
          }}
          onFocus={() => setShowList(true)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      {showList && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 z-50 mt-2 w-full max-h-40 overflow-y-auto rounded-2xl border border-border/40 bg-card/95 p-1.5 shadow-lift backdrop-blur-md">
          {suggestions.map((s, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => {
                  selectedRef.current = true;
                  onChange(s.fullName);
                  setSuggestions([]);
                  setShowList(false);
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground/80 hover:bg-secondary/70 hover:text-primary transition-smooth"
              >
                {s.shortName}
                <span className="block mt-0.5 text-[9px] font-medium text-muted-foreground truncate">
                  {s.fullName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CreateRideForm() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [seatsAvailable, setSeatsAvailable] = useState("3");
  const [price, setPrice] = useState("350");

  // Intermediate stops and filters states
  const [stops, setStops] = useState([]);
  const [womenOnly, setWomenOnly] = useState(false);
  const [instantBook, setInstantBook] = useState(false);

  // Autocomplete suggestions states for start/end
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showOriginList, setShowOriginList] = useState(false);
  const [showDestList, setShowDestList] = useState(false);
  const [loadingOrigin, setLoadingOrigin] = useState(false);
  const [loadingDest, setLoadingDest] = useState(false);

  // Refs for tracking selection vs typing
  const originSelectedRef = useRef(false);
  const destSelectedRef = useRef(false);
  const originContainerRef = useRef(null);
  const destContainerRef = useRef(null);

  // Form submission and validation states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successRideId, setSuccessRideId] = useState(null);

  // Debounced search for Origin (Leaving From)
  useEffect(() => {
    if (originSelectedRef.current) {
      originSelectedRef.current = false;
      return;
    }

    if (!origin || origin.trim().length < 3) {
      setOriginSuggestions([]);
      return;
    }

    setLoadingOrigin(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(origin)}&format=json&limit=5&addressdetails=1&countrycodes=in`,
        );
        if (response.ok) {
          const data = await response.json();
          const uniqueResults = data.map((item) => {
            const parts = item.display_name.split(", ");
            const shortName = parts.slice(0, 3).join(", ");
            return {
              fullName: item.display_name,
              shortName: shortName,
              name: item.name || parts[0],
            };
          });
          setOriginSuggestions(uniqueResults);
        }
      } catch (err) {
        console.error("OSM origin autocomplete fetch error:", err);
      } finally {
        setLoadingOrigin(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [origin]);

  // Debounced search for Destination (Going To)
  useEffect(() => {
    if (destSelectedRef.current) {
      destSelectedRef.current = false;
      return;
    }

    if (!destination || destination.trim().length < 3) {
      setDestSuggestions([]);
      return;
    }

    setLoadingDest(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=5&addressdetails=1&countrycodes=in`,
        );
        if (response.ok) {
          const data = await response.json();
          const uniqueResults = data.map((item) => {
            const parts = item.display_name.split(", ");
            const shortName = parts.slice(0, 3).join(", ");
            return {
              fullName: item.display_name,
              shortName: shortName,
              name: item.name || parts[0],
            };
          });
          setDestSuggestions(uniqueResults);
        }
      } catch (err) {
        console.error("OSM destination autocomplete fetch error:", err);
      } finally {
        setLoadingDest(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [destination]);

  // Clicks outside dropdown lists listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (originContainerRef.current && !originContainerRef.current.contains(event.target)) {
        setShowOriginList(false);
      }
      if (destContainerRef.current && !destContainerRef.current.contains(event.target)) {
        setShowDestList(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectOrigin = (suggestion) => {
    originSelectedRef.current = true;
    setOrigin(suggestion.fullName);
    setOriginSuggestions([]);
    setShowOriginList(false);
  };

  const handleSelectDest = (suggestion) => {
    destSelectedRef.current = true;
    setDestination(suggestion.fullName);
    setDestSuggestions([]);
    setShowDestList(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!origin || !destination || !dateTime || !seatsAvailable || !price) {
      setError("All fields are required to publish a ride.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await apiClient.post("/rides", {
        origin,
        destination,
        dateTime,
        seatsAvailable: parseInt(seatsAvailable, 10),
        price: parseFloat(price),
        stops: stops.filter((s) => s && s.trim()), // save geocoded stops
        womenOnly,
        instantBook,
        route: [],
      });

      const newRide = response.data.ride;
      setSuccessRideId(newRide._id);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to publish the ride. Please check that your locations are valid and you are registered as a driver.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (successRideId) {
    return (
      <div className="rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-8 text-center shadow-lift max-w-lg mx-auto">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-mint shadow-glow mx-auto animate-bounce">
          <CheckCircle2 className="size-7 text-primary-foreground" strokeWidth={2.4} />
        </div>
        <h2 className="mt-6 font-display text-2xl font-bold">Ride Published Successfully!</h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Your ride from <strong className="text-foreground">{origin.split(",")[0]}</strong> to{" "}
          <strong className="text-foreground">{destination.split(",")[0]}</strong> has been created
          and is now active for bookings.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button asChild variant="hero" size="xl" className="w-full">
            <Link to={`/ride/${successRideId}`}>View ride details</Link>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setOrigin("");
              setDestination("");
              setDateTime("");
              setStops([]);
              setWomenOnly(false);
              setInstantBook(false);
              setSuccessRideId(null);
            }}
          >
            Offer another ride
          </Button>
        </div>
      </div>
    );
  }

  const fieldStyle =
    "flex items-center gap-2.5 rounded-xl border border-border/40 bg-background/25 px-3.5 py-3 transition-smooth hover:bg-background/45 hover:border-primary/30 focus-within:bg-background/55 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/15 focus-within:ring-offset-2 focus-within:ring-offset-background";

  return (
    <form
      className="space-y-5 rounded-3xl border border-border/40 bg-card/45 backdrop-blur-md p-7 shadow-lift max-w-lg mx-auto"
      onSubmit={handleSubmit}
    >
      <h2 className="font-display text-xl font-bold text-foreground">Ride Details</h2>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3.5 text-sm text-destructive border border-destructive/20">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Origin Input */}
      <div ref={originContainerRef} className="relative">
        <label className={fieldStyle}>
          {loadingOrigin ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
          ) : (
            <MapPin className="size-4 shrink-0 text-primary" />
          )}
          <span className="sr-only">Leaving from</span>
          <input
            value={origin}
            onChange={(e) => {
              setOrigin(e.target.value);
              setShowOriginList(true);
            }}
            onFocus={() => setShowOriginList(true)}
            placeholder="Leaving from"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>

        {showOriginList && originSuggestions.length > 0 && (
          <ul className="absolute top-full left-0 z-50 mt-2 w-full max-h-48 overflow-y-auto rounded-2xl border border-border/40 bg-card/95 p-1.5 shadow-lift backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            {originSuggestions.map((s, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => handleSelectOrigin(s)}
                  className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground/80 hover:bg-secondary/70 hover:text-primary transition-smooth"
                >
                  {s.shortName}
                  <span className="block mt-0.5 text-[9px] font-medium text-muted-foreground truncate">
                    {s.fullName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Intermediate Stops Editor */}
      <div className="space-y-3.5 border-t border-border/20 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Intermediate Stops
          </span>
          <button
            type="button"
            onClick={() => setStops([...stops, ""])}
            className="flex items-center gap-1 text-xs font-bold text-primary hover:underline hover:scale-105 transition-transform"
          >
            <Plus className="size-3.5" /> Add Stop
          </button>
        </div>

        {stops.map((stop, index) => (
          <div key={index} className="flex items-center gap-2">
            <StopInput
              value={stop}
              onChange={(val) => {
                const updated = [...stops];
                updated[index] = val;
                setStops(updated);
              }}
              placeholder={`Intermediate Stop #${index + 1}`}
            />
            <button
              type="button"
              onClick={() => setStops(stops.filter((_, idx) => idx !== index))}
              className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 hover:scale-105 active:scale-95 transition-smooth"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Destination Input */}
      <div ref={destContainerRef} className="relative border-t border-border/20 pt-4">
        <label className={fieldStyle}>
          {loadingDest ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
          ) : (
            <MapPin className="size-4 shrink-0 text-primary" />
          )}
          <span className="sr-only">Going to</span>
          <input
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setShowDestList(true);
            }}
            onFocus={() => setShowDestList(true)}
            placeholder="Going to"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>

        {showDestList && destSuggestions.length > 0 && (
          <ul className="absolute top-full left-0 z-50 mt-2 w-full max-h-48 overflow-y-auto rounded-2xl border border-border/40 bg-card/95 p-1.5 shadow-lift backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            {destSuggestions.map((s, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => handleSelectDest(s)}
                  className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground/80 hover:bg-secondary/70 hover:text-primary transition-smooth"
                >
                  {s.shortName}
                  <span className="block mt-0.5 text-[9px] font-medium text-muted-foreground truncate">
                    {s.fullName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Date & Seats Row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={fieldStyle}>
          <CalendarDays className="size-4 shrink-0 text-primary" />
          <span className="sr-only">Date and Time</span>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground/85 outline-none"
          />
        </label>

        <label className={fieldStyle}>
          <Users className="size-4 shrink-0 text-primary" />
          <span className="sr-only">Seats</span>
          <input
            type="number"
            min={1}
            max={6}
            value={seatsAvailable}
            onChange={(e) => setSeatsAvailable(e.target.value)}
            placeholder="Seats"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {/* Price Input */}
      <label className={fieldStyle}>
        <IndianRupee className="size-4 shrink-0 text-primary" />
        <span className="sr-only">Price per seat</span>
        <input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price per seat"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      {/* Filter Checkboxes */}
      <div className="flex flex-wrap gap-4 pt-2">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-muted-foreground hover:text-foreground transition-smooth">
          <input
            type="checkbox"
            checked={womenOnly}
            onChange={(e) => setWomenOnly(e.target.checked)}
            className="rounded border-border/40 text-primary focus:ring-primary/20 accent-primary"
          />
          Women-only ride
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-muted-foreground hover:text-foreground transition-smooth">
          <input
            type="checkbox"
            checked={instantBook}
            onChange={(e) => setInstantBook(e.target.checked)}
            className="rounded border-border/40 text-primary focus:ring-primary/20 accent-primary"
          />
          Instant booking
        </label>
      </div>

      <Button variant="hero" size="xl" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" /> Publishing...
          </>
        ) : (
          "Publish ride"
        )}
      </Button>
    </form>
  );
}
