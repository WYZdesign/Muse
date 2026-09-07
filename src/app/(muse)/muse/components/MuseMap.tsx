"use client";

import { useRef, useEffect } from "react";
import { CITY_GEO } from "./types";

export default function MuseMap({ filteredProfiles, myGeo, onClose }: { filteredProfiles: any[], myGeo?: {lat:number,lng:number}, onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const w = window as any;
    const init = () => {
      w.mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
      const center: [number, number] = myGeo ? [myGeo.lng, myGeo.lat] : [-98.5, 39.8];
      const zoom = myGeo ? 9 : 3.5;
      const map = new w.mapboxgl.Map({ container: containerRef.current!, style: "mapbox://styles/mapbox/dark-v11", center, zoom });
      mapRef.current = map;
      // Privacy: this used to drop one marker per profile with a popup naming
      // that person ("{name} · {type}") right on the map — effectively an
      // opt-out-free "here's exactly who's in this city" directory. Instead,
      // group profiles by city and show a single anonymous count marker per
      // city (no names, no per-person popups). Nobody's individual presence
      // is pinned or identifiable from the map itself.
      const byCity = new Map<string, { geo: { lat: number; long: number }; count: number }>();
      for (const p of filteredProfiles || []) {
        const loc = String(p.loc || "");
        let geo = CITY_GEO[loc];
        let cityKey = loc;
        if (!geo) {
          const city = loc.split(",")[0].trim();
          geo = CITY_GEO[city];
          cityKey = city;
        }
        if (!geo) continue;
        const existing = byCity.get(cityKey);
        if (existing) existing.count += 1;
        else byCity.set(cityKey, { geo, count: 1 });
      }
      for (const [cityKey, { geo, count }] of byCity) {
        const el = document.createElement("div");
        el.style.cssText = "min-width:30px;height:30px;padding:0 8px;border-radius:15px;background:linear-gradient(135deg,#FFD700,#FF8A80);border:2px solid #0a0612;box-shadow:0 0 14px rgba(255,215,0,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#0a0612;font-weight:800;font-size:12px";
        el.textContent = String(count);
        new w.mapboxgl.Marker({ element: el })
          .setLngLat([geo.long, geo.lat])
          .setPopup(new w.mapboxgl.Popup({ offset: 25 }).setText(`${cityKey}: ${count} creative${count === 1 ? "" : "s"}`))
          .addTo(map);
      }
      // Studio locations: intentionally not rendered yet. FD Studios' buildings
      // (studios.ts) only store phone numbers and building labels today, no
      // street address or lat/long — plotting them accurately needs real
      // coordinates supplied for each building, not guessed ones. Once that
      // data exists (e.g. a STUDIO_GEO map keyed by building id, same shape as
      // CITY_GEO above), add a second marker loop here styled to visually
      // distinguish studio pins from the city-count pins.
    };
    if (w.mapboxgl) {
      init();
    } else {
      // Mapbox GL requires BOTH the CSS and JS — CSS is what makes markers
      // position/scale correctly (without it the map renders blank/markerless).
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css";
      document.head.appendChild(css);
      const s = document.createElement("script");
      s.src = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js";
      s.async = true;
      s.onload = init;
      document.head.appendChild(s);
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [filteredProfiles, myGeo]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "#0a0612" }}>
      <div style={{ position: "absolute", top: 18, left: 16, right: 16, zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onClose} style={{ background: "rgba(10,6,18,0.85)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 16px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(8px)" }}>← Back to cards</button>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>Creatives near you</div>
      </div>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", bottom: 24, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 12, zIndex: 2, pointerEvents: "none" }}>Tap a marker to see how many creatives are active nearby</div>
    </div>
  );
}
