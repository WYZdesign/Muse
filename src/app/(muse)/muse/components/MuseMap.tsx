"use client";

import { useRef, useEffect } from "react";

export default function MuseMap({ filteredProfiles, myGeo, containerRef, show }: { filteredProfiles: any[], myGeo?: {lat:number,lng:number}, containerRef: React.RefObject<HTMLDivElement|null>, show: boolean }) {
  const initialized = useRef(false);
  const mapEl = useRef<any>(null);
  useEffect(() => {
    if (!show || !containerRef.current || initialized.current) return;
    initialized.current = true;
    const w = window as any;
    if (!w.mapboxgl) {
      const s = document.createElement("script");
      s.src = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js";
      s.async = true;
      s.onload = () => initMap();
      document.head.appendChild(s);
    } else { initMap(); }
    function initMap() {
      w.mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";
      const center = myGeo ? [myGeo.lng, myGeo.lat] : [-118.2437, 34.0522];
      const map = new w.mapboxgl.Map({ container: containerRef.current!, style: "mapbox://styles/mapbox/dark-v11", center, zoom: 12 });
      mapEl.current = map;
      filteredProfiles.forEach(p => {
        if (p.lat && p.lng) {
          const el = document.createElement("div"); el.className = "map-marker";
          const dot = document.createElement("div");
          dot.style.cssText = "width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#FFD700,#FF8A80);border:2px solid #0a0612;box-shadow:0 0 12px rgba(255,215,0,0.4);cursor:pointer";
          el.appendChild(dot);
          new w.mapboxgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(new w.mapboxgl.Popup({ offset: 25 }).setText(p.name + " · " + p.type)).addTo(map);
        }
      });
    }
    return () => { if (mapEl.current) { mapEl.current.remove(); mapEl.current = null; initialized.current = false; } };
  }, [show, myGeo]);
  return <div ref={containerRef} style={{ width: "100%", height: "60vh", borderRadius: 16, overflow: "hidden", marginTop: 8 }} />;
}
