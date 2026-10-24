"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface MapInstitution {
  slug: string;
  name: string;
  artworkCount: number;
  lat: number;
  lng: number;
}

/**
 * Real Leaflet map with a pin per institution — ticket 10. Client-only (Leaflet needs the
 * DOM); the page's accessible institution list is a separate, always-rendered element
 * (see /map/page.tsx), never gated behind this component mounting, per "not map-only."
 */
export default function InstitutionMap({ institutions }: { institutions: MapInstitution[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || institutions.length === 0) return;

    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !containerRef.current) return;

      // Default marker icon paths break under bundlers — point at the package's own
      // published assets instead of guessing a bundled path.
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      map = L.map(containerRef.current).setView(
        [institutions[0].lat, institutions[0].lng],
        institutions.length > 1 ? 4 : 12
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const bounds = L.latLngBounds(institutions.map((i) => [i.lat, i.lng]));
      for (const institution of institutions) {
        L.marker([institution.lat, institution.lng])
          .addTo(map!)
          .bindPopup(
            `<a href="/museum/${institution.slug}">${institution.name}</a><br>${institution.artworkCount} artworks`
          );
      }
      if (institutions.length > 1) map.fitBounds(bounds, { padding: [40, 40] });
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [institutions]);

  // No role="img" here — Leaflet's zoom controls and marker popups are real interactive
  // children (buttons, links), and role="img" would tell assistive tech to treat them as
  // flattened image content, masking them. aria-label on the region is enough; Leaflet
  // supplies its own accessible names for the controls it renders inside.
  return (
    <div
      ref={containerRef}
      style={{ height: "min(60dvh, 32rem)", width: "100%" }}
      aria-label="Map of holding institutions"
    />
  );
}
