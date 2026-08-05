import React, { useEffect, useState, useRef } from "react";
import { trackingSocket } from "../services/socket";
import {
  Loader2,
  Navigation,
  Compass,
  ShieldAlert,
  Play,
  Square,
  Route,
  Clock,
} from "lucide-react";
import { Button } from "../components/ui/button";

// Helper to geocode city name dynamically if coordinates are missing
const geocodeCity = async (cityName) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`,
    );
    const data = await res.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lon), parseFloat(data[0].lat)]; // [longitude, latitude]
    }
  } catch (err) {
    console.error("Geocoding failed for city:", cityName, err);
  }
  return null;
};

export default function LiveTrackingMap({
  rideId,
  role = "passenger",
  origin,
  destination,
  originCoords, // [longitude, latitude]
  destinationCoords, // [longitude, latitude]
}) {
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [location, setLocation] = useState(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  // Real Route Data from OSRM
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [routeGeometry, setRouteGeometry] = useState([]);
  const [resolvedStart, setResolvedStart] = useState(null); // [lat, lng]
  const [resolvedEnd, setResolvedEnd] = useState(null); // [lat, lng]
  const [mapLoading, setMapLoading] = useState(true);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const polylineRef = useRef(null);
  const watchIdRef = useRef(null);

  // 1. Load Leaflet CSS and JS dynamically
  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setLeafletLoaded(true);
    script.onerror = () => {
      setErrorMsg("Failed to load Leaflet Map library.");
      setMapLoading(false);
    };
    document.head.appendChild(script);
  }, []);

  // 2. Fetch coordinates (if missing) and query OSRM Route Data
  useEffect(() => {
    const resolveCoordsAndRoute = async () => {
      setMapLoading(true);
      try {
        let startCoords = originCoords;
        let endCoords = destinationCoords;

        // If coordinates are missing, geocode them dynamically
        if ((!startCoords || startCoords.length === 0) && origin) {
          console.log(`Resolving coordinates for start city: ${origin}`);
          startCoords = await geocodeCity(origin);
        }
        if ((!endCoords || endCoords.length === 0) && destination) {
          console.log(`Resolving coordinates for destination city: ${destination}`);
          endCoords = await geocodeCity(destination);
        }

        if (startCoords && endCoords) {
          const startLng = startCoords[0];
          const startLat = startCoords[1];
          const endLng = endCoords[0];
          const endLat = endCoords[1];

          setResolvedStart([startLat, startLng]);
          setResolvedEnd([endLat, endLng]);

          // Fetch route from OSRM
          const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();

          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            // Convert OSRM [lng, lat] format to Leaflet [lat, lng]
            const latLngs = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
            setRouteGeometry(latLngs);
            setDistance((route.distance / 1000).toFixed(1)); // km

            const durMinutes = Math.round(route.duration / 60);
            if (durMinutes >= 60) {
              setDuration(`${Math.floor(durMinutes / 60)}h ${durMinutes % 60}m`);
            } else {
              setDuration(`${durMinutes}m`);
            }
          }
        } else {
          setErrorMsg("Could not resolve routing coordinates for this ride.");
        }
      } catch (err) {
        console.error("OSRM Route fetching error", err);
        setErrorMsg("Failed to load real road route. Using fallback connection.");
      } finally {
        setMapLoading(false);
      }
    };

    resolveCoordsAndRoute();
  }, [origin, destination, originCoords, destinationCoords]);

  // 3. Connect to Socket.IO Namespace
  useEffect(() => {
    trackingSocket.connect();

    trackingSocket.on("connect", () => {
      setConnectionStatus("connected");
      trackingSocket.emit("join_ride", { rideId });
    });

    trackingSocket.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    // Listen for driver location emissions
    if (role === "passenger") {
      trackingSocket.on("location_updated", (data) => {
        const { latitude, longitude, speed: s, heading: h } = data;
        setLocation({ lat: latitude, lng: longitude });
        if (s !== undefined) setSpeed(s);
        if (h !== undefined) setHeading(h);

        // Render moving marker on Map
        if (mapRef.current && window.L) {
          const newPos = [latitude, longitude];
          if (markerRef.current) {
            markerRef.current.setLatLng(newPos);
          } else {
            const carIcon = window.L.divIcon({
              html: `<div class="size-8 bg-primary text-white rounded-full shadow-lg border-2 border-white flex items-center justify-center animate-pulse">
                       <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="transform: rotate(${h || 0}deg)"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                     </div>`,
              className: "",
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });
            markerRef.current = window.L.marker(newPos, { icon: carIcon }).addTo(mapRef.current);
          }
          mapRef.current.panTo(newPos);
        }
      });
    }

    return () => {
      trackingSocket.off("connect");
      trackingSocket.off("disconnect");
      trackingSocket.off("location_updated");
      trackingSocket.disconnect();
    };
  }, [rideId, role]);

  // 4. Initialize Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || mapLoading || !mapContainerRef.current) return;
    if (!resolvedStart || !resolvedEnd) return;

    // Check if map instance is already active
    if (mapRef.current) return;

    const L = window.L;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(resolvedStart, 12);

    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Custom A/B markers
    const startIcon = L.divIcon({
      html: `<div class="size-6 bg-primary text-white rounded-full border-2 border-white flex items-center justify-center shadow-lg font-bold text-[10px]">A</div>`,
      className: "",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const endIcon = L.divIcon({
      html: `<div class="size-6 bg-emerald-500 text-white rounded-full border-2 border-white flex items-center justify-center shadow-lg font-bold text-[10px]">B</div>`,
      className: "",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    startMarkerRef.current = L.marker(resolvedStart, { icon: startIcon }).addTo(map);
    endMarkerRef.current = L.marker(resolvedEnd, { icon: endIcon }).addTo(map);

    // Draw route geometry
    if (routeGeometry.length > 0) {
      polylineRef.current = L.polyline(routeGeometry, {
        color: "#6366f1",
        weight: 5,
        opacity: 0.8,
      }).addTo(map);

      map.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
    } else {
      polylineRef.current = L.polyline([resolvedStart, resolvedEnd], {
        color: "#94a3b8",
        weight: 4,
        dashArray: "5, 10",
      }).addTo(map);
      map.fitBounds(polylineRef.current.getBounds(), { padding: [40, 40] });
    }
  }, [leafletLoaded, mapLoading, routeGeometry, resolvedStart, resolvedEnd]);

  // 5. Watch driver location and broadcast
  const startTracking = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation not supported by this browser.");
      return;
    }

    setErrorMsg("");
    setTrackingActive(true);

    const L = window.L;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed: s, heading: h } = position.coords;
        const curLocation = { lat: latitude, lng: longitude };
        setLocation(curLocation);
        setSpeed(Math.round((s || 0) * 3.6));
        setHeading(h || 0);

        trackingSocket.emit("update_location", {
          rideId,
          latitude,
          longitude,
          speed: Math.round((s || 0) * 3.6),
          heading: h || 0,
        });

        if (mapRef.current && L) {
          const newPos = [latitude, longitude];
          if (markerRef.current) {
            markerRef.current.setLatLng(newPos);
          } else {
            const carIcon = L.divIcon({
              html: `<div class="size-8 bg-primary text-white rounded-full shadow-lg border-2 border-white flex items-center justify-center animate-pulse">
                       <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="transform: rotate(${h || 0}deg)"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                     </div>`,
              className: "",
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });
            markerRef.current = L.marker(newPos, { icon: carIcon }).addTo(mapRef.current);
          }
          mapRef.current.panTo(newPos);
        }
      },
      (err) => {
        console.error("GPS Watch error:", err);
        setErrorMsg(`GPS Access error: ${err.message}. Ensure location permissions are granted.`);
        setTrackingActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingActive(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border/40 bg-card/35 backdrop-blur-md p-6 shadow-soft w-full h-full">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-bold text-foreground">Live Route Tracking</h3>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <span
              className={`size-2 rounded-full ${
                connectionStatus === "connected" ? "bg-emerald-500 animate-ping" : "bg-destructive"
              }`}
            />
            Socket: {connectionStatus} {trackingActive ? "| GPS Active" : ""}
          </span>
        </div>

        {role === "driver" && (
          <div className="flex items-center gap-2">
            {!trackingActive ? (
              <Button onClick={startTracking} variant="hero" size="sm" className="gap-1.5 shrink-0">
                <Play className="size-3.5 fill-current" /> Start GPS
              </Button>
            ) : (
              <Button
                onClick={stopTracking}
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive border-destructive/20 hover:bg-destructive/10 shrink-0"
              >
                <Square className="size-3.5 fill-current" /> Stop GPS
              </Button>
            )}
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3 text-xs text-destructive border border-destructive/20">
          <ShieldAlert className="size-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Map Frame wrapper with explicit height */}
      <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-border/40 bg-background/30 flex items-center justify-center shadow-inner">
        {mapLoading ? (
          <div className="text-center py-4 flex flex-col items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary mb-2" />
            <span className="text-xs text-muted-foreground font-semibold">
              Calculating route geometry...
            </span>
          </div>
        ) : (
          <div ref={mapContainerRef} className="size-full z-10" />
        )}
      </div>

      {/* Telemetry info row - 2x2 Grid alignment for optimal spacing in split column view */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-background/30 rounded-2xl border border-border/40 p-4">
        {/* Distance */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Route className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Distance
            </div>
            <div className="text-xs font-bold text-foreground truncate">
              {distance ? `${distance} km` : "Calculating..."}
            </div>
          </div>
        </div>

        {/* Est Duration */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <Clock className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Duration
            </div>
            <div className="text-xs font-bold text-foreground truncate">
              {duration ? duration : "Calculating..."}
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <Navigation
              className="size-4.5 transition-transform duration-300"
              style={{ transform: `rotate(${heading}deg)` }}
            />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Heading
            </div>
            <div className="text-xs font-bold text-foreground truncate">{heading}°</div>
          </div>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <Compass className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Speed
            </div>
            <div className="text-xs font-bold text-foreground truncate">
              {speed} <span className="text-[10px] text-muted-foreground font-medium">km/h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
