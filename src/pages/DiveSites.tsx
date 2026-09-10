import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Anchor, Building2, Waves, Thermometer, Eye, Calendar,
  Gauge, Globe, Search, ExternalLink,
} from "lucide-react";
import { DIVE_SITES, REGIONS, type DiveSite } from "../data/diveSites";
import { DIVE_SHOPS, type DiveShop } from "../data/diveShops";
import SiteConditions from "../components/SiteConditions";

const SITE_ICON = L.divIcon({
  html: `<div style="width:24px;height:24px;border-radius:50%;background:rgba(34,211,238,0.9);border:3px solid #0d9488;box-shadow:0 0 16px rgba(34,211,238,0.6);display:flex;align-items:center;justify-content:center;font-size:10px">&#x2B07;</div>`,
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -28],
});

const SHOP_ICON = L.divIcon({
  html: `<div style="width:28px;height:28px;border-radius:6px;background:#0d9488;border:2px solid #22d3ee;box-shadow:0 0 12px rgba(13,148,136,0.5);display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff">&#x2693;</div>`,
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 12, { duration: 1.2 });
  }, [lat, lng, map]);
  return null;
}

/**
 * Keyless basemap providers. Esri World Imagery (satellite — reefs and atolls
 * are visible), the Esri Ocean basemap (bathymetry), and OpenStreetMap.
 */
type BasemapKey = "satellite" | "ocean" | "street";

const BASEMAPS: Record<
  BasemapKey,
  { label: string; url: string; attribution: string; maxNativeZoom: number; dim?: boolean }
> = {
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    maxNativeZoom: 19,
  },
  ocean: {
    label: "Ocean",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri",
    maxNativeZoom: 13,
  },
  street: {
    label: "Street",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
    dim: true,
  },
};

export default function DiveSites() {
  const [selectedSite, setSelectedSite] = useState<DiveSite | null>(null);
  const [selectedShop, setSelectedShop] = useState<DiveShop | null>(null);
  const [activeTab, setActiveTab] = useState<"sites" | "shops">("sites");
  const [filterRegion, setFilterRegion] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [basemapKey, setBasemapKey] = useState<BasemapKey>("satellite");
  const mapRef = useRef<L.Map | null>(null);

  const filteredSites = DIVE_SITES.filter((s) => {
    if (filterRegion !== "All" && s.region !== filterRegion) return false;
    if (search) {
      const q = search.toLowerCase();
      const hit = s.name.toLowerCase().includes(q) || s.country.toLowerCase().includes(q) || s.region.toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  const filteredShops = DIVE_SHOPS.filter((s) => {
    if (filterRegion !== "All" && s.region !== filterRegion) return false;
    if (search) {
      const q = search.toLowerCase();
      const hit = s.name.toLowerCase().includes(q) || s.country.toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  const ratingStars = (r: number) => "★".repeat(r) + "☆".repeat(5 - r);

  return (
    <div className="-mx-3 sm:-mx-6 lg:-mx-8 -mt-1 -mb-4 sm:-mt-2 sm:-mb-6 lg:-mt-4 lg:-mb-8 flex flex-col flex-1">
      <div className="absolute bottom-20 left-4 right-4 lg:right-8 z-[1000] pointer-events-none">
        <div className="flex flex-col items-end gap-2">
          {selectedSite && (
            <div className="glass-card p-4 w-full sm:max-w-sm pointer-events-auto animate-slide-up shadow-xl shadow-surf/10 border-surf/20 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedSite.name}</h3>
                  <p className="text-xs text-surf">{selectedSite.country} · {selectedSite.region}</p>
                </div>
                <button onClick={() => setSelectedSite(null)} className="text-text-tertiary hover:text-white p-1">✕</button>
              </div>
              <p className="text-xs text-text-secondary mb-3">{selectedSite.description}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-2">
                <div className="flex items-center gap-1.5 text-text-secondary"><Gauge className="w-3 h-3 text-surf" /> {selectedSite.depthRange}</div>
                <div className="flex items-center gap-1.5 text-text-secondary"><Waves className="w-3 h-3 text-surf" /> {selectedSite.difficulty}</div>
                <div className="flex items-center gap-1.5 text-text-secondary"><Eye className="w-3 h-3 text-surf" /> {selectedSite.visibility}</div>
                <div className="flex items-center gap-1.5 text-text-secondary"><Thermometer className="w-3 h-3 text-surf" /> {selectedSite.temp}</div>
                <div className="flex items-center gap-1.5 text-text-secondary"><Calendar className="w-3 h-3 text-surf" /> {selectedSite.bestSeason}</div>
                <div className="flex items-center gap-1.5 text-amber-400">{ratingStars(selectedSite.rating)}</div>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {selectedSite.types.map((t) => (
                  <span key={t} className="pill pill-teal text-[9px] py-0">{t}</span>
                ))}
              </div>
              <SiteConditions site={selectedSite} />
            </div>
          )}
          {selectedShop && (
            <div className="glass-card p-4 max-w-sm pointer-events-auto animate-slide-up shadow-xl shadow-teal/10 border-teal/20">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal" />{selectedShop.name}
                  </h3>
                  <p className="text-xs text-teal">{selectedShop.country} · {selectedShop.address}</p>
                </div>
                <button onClick={() => setSelectedShop(null)} className="text-text-tertiary hover:text-white p-1">✕</button>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedShop.services.map((s) => (
                  <span key={s} className="pill pill-teal text-[10px]">{s}</span>
                ))}
              </div>
              <a href={selectedShop.website} target="_blank" rel="noopener noreferrer" className="text-xs text-surf flex items-center gap-1 hover:underline">
                <ExternalLink className="w-3 h-3" /> Visit website
              </a>
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-card/80 backdrop-blur-sm border-b border-card-border z-[1001]">
        <h1 className="text-lg font-bold text-white flex items-center gap-2 shrink-0">
          <Globe className="w-5 h-5 text-surf" /> Dive Sites Explorer
        </h1>

        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              placeholder="Search sites, shops, countries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="!pl-8 !py-2 !text-sm !rounded-lg"
            />
          </div>
          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="!w-auto !py-2 !text-sm !rounded-lg shrink-0"
          >
            <option value="All">All Regions</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => setActiveTab("sites")}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all touch-manipulation ${
              activeTab === "sites" ? "bg-surf/15 text-surf border border-surf/25" : "text-text-secondary border border-card-border hover:text-gray-200"
            }`}
          >
            <Anchor className="w-3.5 h-3.5 inline mr-1" />Sites ({filteredSites.length})
          </button>
          <button
            onClick={() => setActiveTab("shops")}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all touch-manipulation ${
              activeTab === "shops" ? "bg-teal/15 text-teal border border-teal/25" : "text-text-secondary border border-card-border hover:text-gray-200"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 inline mr-1" />Shops ({filteredShops.length})
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-full lg:w-[300px] xl:w-[340px] shrink-0 border-r border-card-border overflow-y-auto custom-scrollbar bg-card/40">
          <div className="p-3 space-y-2">
            {activeTab === "sites" ? (
              filteredSites.length === 0 ? (
                <p className="text-xs text-text-tertiary text-center py-8">No sites match your search.</p>
              ) : (
                filteredSites.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => { setSelectedSite(site); setSelectedShop(null); }}
                    className={`w-full text-left glass-card p-3 transition-all touch-manipulation ${
                      selectedSite?.id === site.id ? "border-surf/40 bg-navy/30" : "hover:border-card-border-bright"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-white truncate">{site.name}</p>
                      <span className={`pill text-[9px] py-0 shrink-0 ml-2 ${
                        site.difficulty === "Beginner" ? "pill-kelp" : site.difficulty === "Intermediate" ? "pill-surf" : site.difficulty === "Advanced" ? "pill-warn" : "pill-danger"
                      }`}>{site.difficulty}</span>
                    </div>
                    <p className="text-xs text-text-tertiary mb-1.5">{site.country}</p>
                    <div className="flex items-center gap-3 text-xs text-text-secondary">
                      <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{site.depthRange}</span>
                      <span className="text-amber-400/80">{ratingStars(site.rating)}</span>
                    </div>
                  </button>
                ))
              )
            ) : (
              filteredShops.length === 0 ? (
                <p className="text-xs text-text-tertiary text-center py-8">No shops match your search.</p>
              ) : (
                filteredShops.map((shop) => (
                  <button
                    key={shop.id}
                    onClick={() => { setSelectedShop(shop); setSelectedSite(null); }}
                    className={`w-full text-left glass-card p-3 transition-all touch-manipulation ${
                      selectedShop?.id === shop.id ? "border-teal/40 bg-navy/30" : "hover:border-card-border-bright"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-white truncate">{shop.name}</p>
                      <Building2 className="w-3.5 h-3.5 text-teal shrink-0 ml-2" />
                    </div>
                    <p className="text-xs text-text-tertiary mb-1">{shop.country} · {shop.address}</p>
                    <div className="flex flex-wrap gap-1">
                      {shop.services.slice(0, 3).map((s) => (
                        <span key={s} className="pill pill-teal text-[9px] py-0 leading-none">{s}</span>
                      ))}
                    </div>
                  </button>
                ))
              )
            )}
          </div>
        </div>

        <div className="flex-1 relative">
          <MapContainer
            center={[5, 20]}
            zoom={2.5}
            minZoom={2}
            maxZoom={16}
            style={{ height: "100%", width: "100%", background: "#040b14" }}
            zoomControl={false}
            ref={mapRef}
          >
            <TileLayer
              key={basemapKey}
              url={BASEMAPS[basemapKey].url}
              attribution={BASEMAPS[basemapKey].attribution}
              maxNativeZoom={BASEMAPS[basemapKey].maxNativeZoom}
              maxZoom={16}
              className={BASEMAPS[basemapKey].dim ? "basemap-dim" : undefined}
            />
            {activeTab === "sites" && filteredSites.map((site) => (
              <Marker
                key={site.id}
                position={[site.lat, site.lng]}
                icon={SITE_ICON}
                eventHandlers={{ click: () => setSelectedSite(site) }}
              />
            ))}
            {activeTab === "shops" && filteredShops.map((shop) => (
              <Marker
                key={shop.id}
                position={[shop.lat, shop.lng]}
                icon={SHOP_ICON}
                eventHandlers={{ click: () => setSelectedShop(shop) }}
              />
            ))}
            {(selectedSite || selectedShop) && (
              <FlyTo lat={selectedSite?.lat ?? selectedShop!.lat} lng={selectedSite?.lng ?? selectedShop!.lng} />
            )}
          </MapContainer>

          <div className="absolute top-3 right-3 z-[1000] flex gap-1 bg-card/80 backdrop-blur-sm p-1 rounded-lg border border-card-border">
            {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setBasemapKey(key)}
                className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-md transition-all touch-manipulation ${
                  basemapKey === key
                    ? "bg-surf/15 text-surf border border-surf/25"
                    : "text-text-secondary border border-transparent hover:text-gray-200"
                }`}
                title={`${BASEMAPS[key].label} basemap`}
              >
                {BASEMAPS[key].label}
              </button>
            ))}
          </div>

          <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-text-secondary bg-card/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-card-border">
              <span className="w-2.5 h-2.5 rounded-full bg-surf/90 border border-teal inline-block" /> Dive Sites
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-text-secondary bg-card/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-card-border">
              <span className="w-2.5 h-2.5 rounded bg-teal border border-surf inline-block" /> Dive Shops
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
