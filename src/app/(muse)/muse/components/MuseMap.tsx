"use client";

import { useRef, useEffect, useState } from "react";
import { CITY_GEO } from "./types";
import { ALL_STUDIOS } from "./studios";

// Mapbox zoom levels run roughly 0 (whole world) to 22 (building-level);
// there's no native "percentage" concept, but a 0-22 -> 0-100% mapping
// gives Torreé a quick, familiar readout for describing where on the map
// a marker only becomes visible ("it shows up around 40% zoom").
const MAX_ZOOM_LEVEL = 22;
function zoomToPercent(z: number): number {
  return Math.round((z / MAX_ZOOM_LEVEL) * 100);
}

export default function MuseMap({ filteredProfiles, myGeo, onClose }: { filteredProfiles: any[], myGeo?: {lat:number,lng:number}, onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [loadError, setLoadError] = useState(false);
  // Debug readout (Torreé's ask, 2026-09-16): a live zoom% + lat/lng overlay
  // so she can pinpoint exactly where/at what zoom the off-screen studio
  // markers actually become visible, instead of describing it verbally.
  const [debugInfo, setDebugInfo] = useState<{ zoom: number; lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const w = window as any;
    const init = () => {
      try {
      w.mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
      const center: [number, number] = myGeo ? [myGeo.lng, myGeo.lat] : [-98.5, 39.8];
      // Only used as the initial paint before fitBounds (below) adjusts to
      // the real marker cluster; kept as a reasonable fallback for the rare
      // case no marker matches (fitBounds is skipped when there are none).
      const zoom = myGeo ? 9 : 4.2;
      const map = new w.mapboxgl.Map({ container: containerRef.current!, style: "mapbox://styles/mapbox/dark-v11", center, zoom, attributionControl: false });
      map.addControl(new w.mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }), "bottom-right");
      map.addControl(new w.mapboxgl.AttributionControl({ compact: true }), "bottom-left");
      mapRef.current = map;
      // Live zoom%/lat-lng readout — updates on every pan/zoom (move covers
      // both drags and the NavigationControl's +/- buttons, zoom covers
      // pinch/scroll specifically) so the overlay never goes stale mid-drag.
      const updateDebugInfo = () => {
        const c = map.getCenter();
        setDebugInfo({ zoom: map.getZoom(), lat: c.lat, lng: c.lng });
      };
      map.on("move", updateDebugInfo);
      map.on("zoom", updateDebugInfo);
      updateDebugInfo();
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
      // Audit fix: the map used to always open at a fixed, far-out zoom
      // (3.5 — a whole-continent view) unless the viewer's own location was
      // known, in which case it opened at a fixed zoom 9 centered on THEM
      // regardless of where any markers actually were. Neither reflected
      // where the real marker cluster sat, so most markers rendered as tiny
      // dots (or were off-screen entirely) until the viewer manually
      // zoomed/panned. Instead, collect every marker's coordinates as we go
      // and fit the map to their real bounds once they're all placed.
      const allCoords: [number, number][] = [];
      for (const [cityKey, { geo, count }] of byCity) {
        const el = document.createElement("div");
        el.style.cssText = "min-width:30px;height:30px;padding:0 8px;border-radius:15px;background:linear-gradient(135deg,#FFD700,#FF8A80);border:2px solid #0a0612;box-shadow:0 0 14px rgba(255,215,0,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;color:#0a0612;font-weight:800;font-size:12px";
        el.textContent = String(count);
        new w.mapboxgl.Marker({ element: el })
          .setLngLat([geo.long, geo.lat])
          .setPopup(new w.mapboxgl.Popup({ offset: 25 }).setText(`${cityKey}: ${count} creative${count === 1 ? "" : "s"}`))
          .addTo(map);
        allCoords.push([geo.long, geo.lat]);
      }
      // Studio locations (Torreé batch Part B item 5): plot every FD Photo
      // Studio building AND every other advertised studio (studios.ts's
      // ALL_STUDIOS = FD_STUDIO + OTHER_STUDIOS), not just FD. Each
      // StudioBuilding now carries a real geocoded address (US Census
      // Bureau geocoder), which is what was missing — see the removed
      // comment this replaces. Styled as a camera-pin (magenta/purple,
      // square-ish) so it reads as clearly distinct from the round
      // gold/coral anonymous city-count markers above; unlike those, a
      // studio's exact address is public info a client needs to book it,
      // so the popup names the building and gives the address, not just a
      // count.
      for (const profile of ALL_STUDIOS) {
        for (const building of profile.buildings) {
          if (!building.geo) continue;
          const el = document.createElement("div");
          el.style.cssText = `width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,${profile.color[0]},${profile.color[1]});border:2px solid #0a0612;box-shadow:0 0 14px rgba(233,30,99,0.5);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px`;
          el.textContent = building.emoji || "🎬";
          el.setAttribute("aria-label", `${profile.name} — ${building.label}`);
          new w.mapboxgl.Marker({ element: el })
            .setLngLat([building.geo.long, building.geo.lat])
            .setPopup(new w.mapboxgl.Popup({ offset: 25 }).setHTML(
              `<strong>${profile.name} — ${building.label}</strong><br/>${building.address || ""}<br/>${building.studios.length} stage${building.studios.length === 1 ? "" : "s"} · from ${building.studios.reduce((min, s) => (parseFloat(s.price.replace(/[^0-9.]/g, "")) < parseFloat(min.replace(/[^0-9.]/g, "")) ? s.price : min), building.studios[0]?.price || "")}`
            ))
            .addTo(map);
          allCoords.push([building.geo.long, building.geo.lat]);
        }
      }
      // Fit to the real cluster of markers just placed instead of a fixed
      // zoom. A single marker (or a viewer-location center with no markers
      // nearby) would make fitBounds zoom in absurdly close, so cap it with
      // maxZoom; an empty result set (no cities matched, no studios) just
      // keeps the constructor's initial center/zoom from above.
      if (allCoords.length > 0) {
        const bounds = allCoords.reduce(
          (b, c) => b.extend(c),
          new w.mapboxgl.LngLatBounds(allCoords[0], allCoords[0])
        );
        // Live-verified bug (2026-09-16): this map mounts inside a freshly
        // rendered position:fixed overlay, so on the very first render frame
        // the container can still report a stale/zero size to mapbox-gl's
        // constructor even though the DOM element itself is already the
        // right dimensions — mapbox computes its internal transform from
        // whatever size it read at construction, not from the CSS box, so
        // fitBounds below was projecting against that stale transform and
        // every marker rendered 300-450px below the visible canvas (all 19
        // markers verified present in the DOM via .mapboxgl-marker, zero of
        // them within the viewport's bounding rect). map.resize() forces
        // mapbox to re-read the container's real current size immediately
        // before fitBounds runs, so the projection matches what's on screen.
        map.resize();
        map.fitBounds(bounds, { padding: 64, maxZoom: myGeo ? 11 : 10, duration: 0 });
      }
      } catch (err) { setLoadError(true); console.error("Map failed to initialize", err); }
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
      s.onerror = () => setLoadError(true);
      document.head.appendChild(s);
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [filteredProfiles, myGeo]);

  if (loadError) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "#0a0612", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Map failed to load</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 18 }}>The map provider could not be reached. Check your connection and try again.</div>
          <button onClick={onClose} style={{ background: "rgba(10,6,18,0.85)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 16px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(8px)" }}>← Back to cards</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "#0a0612" }}>
      <div style={{ position: "absolute", top: 30, left: 16, right: 16, zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onClose} style={{ background: "rgba(10,6,18,0.85)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 12, padding: "10px 16px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(8px)" }}>← Back to cards</button>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>Studios</div>
      </div>
      <div ref={containerRef} style={{ position: "absolute", inset: 0, touchAction: "none" }} />
      {debugInfo && (
        <div
          style={{
            position: "absolute", top: 78, left: 16, zIndex: 2,
            background: "rgba(10,6,18,0.85)", border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 10, padding: "6px 10px", backdropFilter: "blur(8px)",
            color: "#fff", fontSize: 11, fontFamily: "monospace", lineHeight: 1.5,
            pointerEvents: "none", whiteSpace: "nowrap",
          }}
        >
          <div>Zoom {zoomToPercent(debugInfo.zoom)}% <span style={{ color: "rgba(255,255,255,0.5)" }}>(z{debugInfo.zoom.toFixed(2)} / {MAX_ZOOM_LEVEL})</span></div>
          <div>{debugInfo.lat.toFixed(5)}, {debugInfo.lng.toFixed(5)}</div>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 24, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 12, zIndex: 2, pointerEvents: "none" }}>Tap a marker to see creative studios nearby</div>
    </div>
  );
}
