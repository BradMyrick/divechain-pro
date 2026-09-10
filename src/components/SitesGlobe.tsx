import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import type { DiveSite } from "../data/diveSites";
import type { DiveShop } from "../data/diveShops";

const SITE_COLOR = "#22d3ee";
const SITE_SELECTED = "#f5c542";
const SHOP_COLOR = "#14b8a6";
const BROWSE_ALTITUDE = 2.6;
const DETAIL_ALTITUDE = 1.35;
const RAD = Math.PI / 180;

const PIN_SVG = (color: string, filled: boolean) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="${filled ? color : "none"}" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>${filled ? `<circle cx="12" cy="10" r="2.6" fill="#04121c"/>` : `<circle cx="12" cy="10" r="3"/>`}</svg>`;

interface HtmlPin {
  lat: number;
  lng: number;
  el: HTMLDivElement;
}

interface Datum {
  lat: number;
  lng: number;
  id: string;
  name: string;
  color: string;
  size: number;
  filled: boolean;
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
  const htmlPins = useRef(new Map<string, HtmlPin>());
  const firstSelection = useRef(true);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [globeReady, setGlobeReady] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV && globeRef.current) {
      (window as unknown as Record<string, unknown>).__sitesGlobe = globeRef.current;
    }
  });

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

  const data = useMemo<Datum[]>(
    () => [
      ...sites.map((s): Datum => {
        const selected = selectedSite?.id === s.id;
        return {
          lat: s.lat,
          lng: s.lng,
          id: s.id,
          name: s.name,
          color: selected ? SITE_SELECTED : SITE_COLOR,
          size: selected ? 34 : 20,
          filled: selected,
          site: s,
        };
      }),
      ...shops.map(
        (s): Datum => ({
          lat: s.lat,
          lng: s.lng,
          id: s.id,
          name: s.name,
          color: SHOP_COLOR,
          size: 14,
          filled: true,
          shop: s,
        }),
      ),
    ],
    [sites, shops, selectedSite],
  );

  const makeElement = useCallback((d: Datum): HTMLDivElement => {
    const el = document.createElement("div");
    const tipOffset = d.shop ? -d.size / 2 : -d.size;
    el.style.cssText =
      `width:${d.size}px;height:${d.size}px;cursor:pointer;` +
      `margin-left:${-d.size / 2}px;margin-top:${tipOffset}px;` +
      `filter:drop-shadow(0 0 6px ${d.color}aa);transition:opacity .25s;`;
    el.title = d.name;
    el.innerHTML = PIN_SVG(d.color, d.filled);
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (d.site) onSelectSite(d.site);
      else if (d.shop) onSelectShop(d.shop);
    });
    htmlPins.current.set(d.id, { lat: d.lat, lng: d.lng, el });
    return el;
  }, [onSelectSite, onSelectShop]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !globeReady) return;

    globe.pointOfView({ lat: 15, lng: -55, altitude: BROWSE_ALTITUDE }, 0);

    const controls = globe.controls() as unknown as {
      addEventListener: (t: string, fn: () => void) => void;
      removeEventListener: (t: string, fn: () => void) => void;
      minDistance: number;
      maxDistance: number;
    };
    controls.minDistance = 110;
    controls.maxDistance = 700;

    const updateOcclusion = () => {
      const pov = globe.pointOfView() as { lat: number; lng: number; altitude: number };
      const camDist = 100 * (1 + pov.altitude);
      const threshold = 100 / camDist + 0.06;
      const cosLat = Math.cos(pov.lat * RAD);
      const sinLat = Math.sin(pov.lat * RAD);
      for (const pin of htmlPins.current.values()) {
        const dot =
          Math.cos(pin.lat * RAD) * cosLat * Math.cos((pin.lng - pov.lng) * RAD) +
          Math.sin(pin.lat * RAD) * sinLat;
        const visible = dot > threshold;
        pin.el.style.opacity = visible ? "1" : "0";
        pin.el.style.pointerEvents = visible ? "auto" : "none";
      }
    };
    controls.addEventListener("change", updateOcclusion);
    updateOcclusion();
    return () => controls.removeEventListener("change", updateOcclusion);
  }, [globeReady]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !globeReady) return;
    if (firstSelection.current) {
      firstSelection.current = false;
      if (selectedSite) return;
    }
    if (selectedSite) {
      globe.pointOfView(
        { lat: selectedSite.lat, lng: selectedSite.lng, altitude: DETAIL_ALTITUDE },
        800,
      );
    } else {
      const pov = globe.pointOfView() as { lat: number; lng: number };
      globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: BROWSE_ALTITUDE }, 650);
    }
  }, [selectedSite, globeReady]);

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
          onGlobeReady={() => setGlobeReady(true)}
          htmlElementsData={data}
          htmlLat={(d: object) => (d as Datum).lat}
          htmlLng={(d: object) => (d as Datum).lng}
          htmlElement={(d: object) => makeElement(d as Datum)}
          htmlTransitionDuration={200}
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
