import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetVehicleLocation, useGetCurrentEcuData, getGetVehicleLocationQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation, Gauge, Thermometer, Zap, Droplets, MapPin, Clock, LocateFixed, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";

// Inject Leaflet CSS once
const leafletCssId = "leaflet-css";
if (!document.getElementById(leafletCssId)) {
  const link = document.createElement("link");
  link.id = leafletCssId;
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);
}

function headingToCompass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function calcDistanceKm(trail: Array<{ latitude: number; longitude: number }>): number {
  let total = 0;
  for (let i = 1; i < trail.length; i++) {
    const R = 6371;
    const dLat = ((trail[i].latitude - trail[i - 1].latitude) * Math.PI) / 180;
    const dLng = ((trail[i].longitude - trail[i - 1].longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((trail[i - 1].latitude * Math.PI) / 180) *
        Math.cos((trail[i].latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return Math.round(total * 100) / 100;
}

type GeoStatus = "requesting" | "granted" | "denied" | "unavailable";

export default function TrackingView() {
  const queryClient = useQueryClient();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("requesting");

  const { data: locationRes } = useGetVehicleLocation();
  const { data: ecuRes } = useGetCurrentEcuData();

  const location = locationRes?.data;
  const ecuData = ecuRes?.data;

  // Poll for location every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetVehicleLocationQueryKey() });
    }, 5000);
    return () => clearInterval(interval);
  }, [queryClient]);

  // Request browser geolocation and reset the backend GPS origin
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus("unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await axios.post("/api/ecu/location/reset", { latitude, longitude });
          setGeoStatus("granted");
          // Re-center the map to real location if already initialized
          if (leafletMapRef.current) {
            leafletMapRef.current.setView([latitude, longitude], 15);
          }
        } catch {
          setGeoStatus("denied");
        }
      },
      () => setGeoStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    import("leaflet").then((L) => {
      const map = L.map(mapRef.current!, {
        center: [28.6139, 77.209],
        zoom: 14,
        zoomControl: true,
      });

      // Dark-toned OSM tile layer (CartoDB Dark Matter)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom car marker icon
      const carIcon = L.divIcon({
        html: `<div style="
          width: 36px; height: 36px;
          background: hsl(217, 91%, 60%);
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(59,130,246,0.8);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
        ">🚗</div>`,
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([28.6139, 77.209], { icon: carIcon }).addTo(map);
      marker.bindPopup("<b>Vehicle Position</b>").openPopup();

      const polyline = L.polyline([], {
        color: "#3b82f6",
        weight: 3,
        opacity: 0.8,
        dashArray: "6 4",
      }).addTo(map);

      leafletMapRef.current = map;
      markerRef.current = marker;
      polylineRef.current = polyline;
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update marker + trail when location changes
  useEffect(() => {
    if (!location || !leafletMapRef.current || !markerRef.current || !polylineRef.current) return;

    const { latitude, longitude } = location.current;
    const latlng: [number, number] = [latitude, longitude];

    markerRef.current.setLatLng(latlng);
    markerRef.current.setPopupContent(
      `<b>Vehicle Position</b><br/>
       Lat: ${latitude.toFixed(5)}<br/>
       Lng: ${longitude.toFixed(5)}<br/>
       Speed: ${location.current.speed} km/h<br/>
       Heading: ${location.current.heading}° ${headingToCompass(location.current.heading)}`
    );

    const trailCoords: [number, number][] = location.trail.map((p: any) => [p.latitude, p.longitude]);
    polylineRef.current.setLatLngs(trailCoords);

    // Pan map to follow vehicle
    leafletMapRef.current.panTo(latlng, { animate: true, duration: 1 });
  }, [location]);

  const distanceKm = location?.trail ? calcDistanceKm(location.trail) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-mono uppercase tracking-wider flex items-center gap-3">
          <MapPin className="w-8 h-8 text-primary" />
          Vehicle Tracking
        </h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Live GPS Position &amp; Movement Trail</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* MAP — takes 2/3 width */}
        <div className="xl:col-span-2">
          <Card className="overflow-hidden border-border">
            <CardHeader className="pb-0 pt-4 px-4">
            <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live Map
                <span className="ml-auto">
                  {geoStatus === "requesting" && (
                    <Badge variant="outline" className="text-[10px] font-mono animate-pulse">
                      <LocateFixed className="w-3 h-3 mr-1" />Locating...
                    </Badge>
                  )}
                  {geoStatus === "granted" && (
                    <Badge className="text-[10px] font-mono bg-green-500/20 text-green-400 border-0">
                      <LocateFixed className="w-3 h-3 mr-1" />Your Location
                    </Badge>
                  )}
                  {(geoStatus === "denied" || geoStatus === "unavailable") && (
                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                      <AlertCircle className="w-3 h-3 mr-1" />Default Region
                    </Badge>
                  )}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-3">
              <div
                ref={mapRef}
                className="w-full rounded-b-lg"
                style={{ height: "480px" }}
              />
            </CardContent>
          </Card>
        </div>

        {/* DETAILS PANEL — takes 1/3 width */}
        <div className="flex flex-col gap-4">
          {/* Coordinates */}
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider">GPS Coordinates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-muted-foreground">Latitude</span>
                <span className="font-mono font-bold text-sm">
                  {location ? location.current.latitude.toFixed(5) : "—"}°
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-muted-foreground">Longitude</span>
                <span className="font-mono font-bold text-sm">
                  {location ? location.current.longitude.toFixed(5) : "—"}°
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-muted-foreground">Trail Points</span>
                <Badge variant="outline" className="font-mono text-xs">{location?.trail.length ?? 0}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Movement */}
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Movement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <Navigation className="w-3 h-3" /> Heading
                </span>
                <span className="font-mono font-bold text-sm">
                  {location ? `${location.current.heading}° ${headingToCompass(location.current.heading)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <Gauge className="w-3 h-3" /> Speed
                </span>
                <span className="font-mono font-bold text-sm">
                  {location ? `${location.current.speed} km/h` : "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-muted-foreground">Distance (session)</span>
                <span className="font-mono font-bold text-sm">{distanceKm} km</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Updated
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {location ? format(new Date(location.current.updatedAt), "HH:mm:ss") : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Vitals */}
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Engine Vitals</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-muted/40 border border-border text-center">
                <Thermometer className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                <p className="text-[10px] font-mono text-muted-foreground uppercase">Engine Temp</p>
                <p className="font-mono font-bold text-sm">{ecuData?.engineTemp ?? "—"}°C</p>
              </div>
              <div className="p-3 rounded-md bg-muted/40 border border-border text-center">
                <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <p className="text-[10px] font-mono text-muted-foreground uppercase">Fuel Level</p>
                <p className="font-mono font-bold text-sm">{ecuData?.fuelLevel ?? "—"}%</p>
              </div>
              <div className="p-3 rounded-md bg-muted/40 border border-border text-center">
                <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                <p className="text-[10px] font-mono text-muted-foreground uppercase">Battery</p>
                <p className="font-mono font-bold text-sm">{ecuData?.batteryVoltage ?? "—"}V</p>
              </div>
              <div className="p-3 rounded-md bg-muted/40 border border-border text-center">
                <div className="text-green-400 font-mono text-base font-bold mx-auto mb-1">PSI</div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase">Oil Pressure</p>
                <p className="font-mono font-bold text-sm">{ecuData?.oilPressure ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
