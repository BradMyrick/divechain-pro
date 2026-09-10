import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import type { DiveSite } from "../data/diveSites";
import type { DiveShop } from "../data/diveShops";

const SITE_COLOR = "#22d3ee";
const SITE_SELECTED = "#f5c542";
const SHOP_COLOR = "#0d9488";

interface PinDatum {
  lat: number;
  lng: number;
  color: string;
  radius: number;
  altitude: number;
  site?: DiveSite;
  shop?: DiveShop;
}

export default function SitesGlobe({
  sites,
  shops,
  selectedSite,
  onSelectSite,
  onSelectShop,
}: {
  sites: DiveSite[];
  shops: DiveShop[];
  selectedSite: DiveSite | null;
  onSelectSite: (site: DiveSite) => void;
  onSelectShop: (shop: DiveShop) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver(() => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    });
    observer.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  const pins = useMemo<PinDatum[]>(
    () => [
      ...sites.map(
        (s): PinDatum => ({
          lat: s.lat,
          lng: s.lng,
          color: selectedSite?.id === s.id ? SITE_SELECTED : SITE_COLOR,
          radius: selectedSite?.id === s.id ? 0.24 : 0.11,
          altitude: selectedSite?.id === s.id ? 0.68 : 0.42,
          site: s,
        }),
      ),
      ...shops.map(
        (s): PinDatum => ({
          lat: s.lat,
          lng: s.lng,
          color: SHOP_COLOR,
          radius: 0.13,
          altitude: 0.32,
          shop: s,
        }),
      ),
    ],
    [sites, shops, selectedSite],
  );

  useEffect(() => {
    const target = selectedSite;
    if (target && globeRef.current) {
      globeRef.current.pointOfView({ lat: target.lat, lng: target.lng, altitude: 1.4 }, 750);
    }
  }, [selectedSite]);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-abyss">
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="/globe/earth-blue-marble.jpg"
          atmosphereColor="#22d3ee"
          atmosphereAltitude={0.17}
          onGlobeReady={() => {
            globeRef.current?.pointOfView({ lat: 15, lng: -55, altitude: 2.6 }, 0);
          }}
          pointsData={pins}
          pointLat={(d: object) => (d as PinDatum).lat}
          pointLng={(d: object) => (d as PinDatum).lng}
          pointColor={(d: object) => (d as PinDatum).color}
          pointRadius={(d: object) => (d as PinDatum).radius}
          pointAltitude={(d: object) => (d as PinDatum).altitude}
          pointResolution={10}
          pointsTransitionDuration={350}
          onPointClick={(d: object) => {
            const pin = d as PinDatum;
            if (pin.site) onSelectSite(pin.site);
            else if (pin.shop) onSelectShop(pin.shop);
          }}
          ringsData={
            selectedSite
              ? [{ lat: selectedSite.lat, lng: selectedSite.lng }]
              : []
          }
          ringLat={(d: object) => (d as { lat: number }).lat}
          ringLng={(d: object) => (d as { lng: number }).lng}
          ringColor={() => (t: number) => `rgba(34,211,238,${Math.max(0, 1 - t).toFixed(3)})`}
          ringMaxRadius={3.2}
          ringPropagationSpeed={2.4}
          ringRepeatPeriod={900}
        />
      )}
    </div>
  );
}
