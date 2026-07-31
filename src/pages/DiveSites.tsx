import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Anchor, Building2, Waves, Thermometer, Eye, Calendar,
  Gauge, Globe, Search, ExternalLink,
} from "lucide-react";

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

interface DiveSite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
  description: string;
  depthRange: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Technical";
  conditions: string;
  visibility: string;
  temp: string;
  bestSeason: string;
  rating: number;
}

interface DiveShop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
  address: string;
  website: string;
  services: string[];
}

const DIVE_SITES: DiveSite[] = [
  {
    id: "bonaire", name: "Bonaire Marine Park", lat: 12.15, lng: -68.28, region: "Caribbean",
    description: "Shore diving paradise with 86 marked sites along the leeward coast. Pristine reefs with easy access from shore.",
    depthRange: "5-40m", difficulty: "Beginner", conditions: "Calm, mild current", visibility: "20-40m", temp: "26-29°C",
    bestSeason: "Year-round", rating: 5,
  },
  {
    id: "cozumel", name: "Palancar Reef, Cozumel", lat: 20.34, lng: -87.02, region: "Caribbean",
    description: "Drift diving along towering coral formations and swim-throughs in crystal-clear Yucatan current.",
    depthRange: "10-40m", difficulty: "Intermediate", conditions: "Moderate drift", visibility: "30-50m", temp: "26-28°C",
    bestSeason: "Dec-Apr", rating: 5,
  },
  {
    id: "belize", name: "Great Blue Hole, Belize", lat: 17.31, lng: -87.53, region: "Caribbean",
    description: "Iconic 300m-wide sinkhole with stalactite formations at 40m. A UNESCO World Heritage Site.",
    depthRange: "10-40m+", difficulty: "Advanced", conditions: "Still, low light", visibility: "15-30m", temp: "24-27°C",
    bestSeason: "Mar-Jun", rating: 4,
  },
  {
    id: "cayman", name: "Stingray City, Grand Cayman", lat: 19.35, lng: -81.27, region: "Caribbean",
    description: "Shallow sandbar where Southern stingrays gather. Feed and interact with these gentle giants.",
    depthRange: "3-5m", difficulty: "Beginner", conditions: "Calm", visibility: "20-30m", temp: "27-29°C",
    bestSeason: "Year-round", rating: 4,
  },
  {
    id: "raja-ampat", name: "Cape Kri, Raja Ampat", lat: -0.55, lng: 130.68, region: "Indo-Pacific",
    description: "Holds the record for most fish species on a single dive (374). The heart of the Coral Triangle.",
    depthRange: "5-40m", difficulty: "Intermediate", conditions: "Variable current", visibility: "15-30m", temp: "27-30°C",
    bestSeason: "Oct-Apr", rating: 5,
  },
  {
    id: "gbr-ribbon", name: "Ribbon Reefs, GBR", lat: -15.4, lng: 145.8, region: "Indo-Pacific",
    description: "Pristine northern Great Barrier Reef with giant potato cod, maori wrasse, and vibrant coral gardens.",
    depthRange: "5-30m", difficulty: "Beginner", conditions: "Gentle current", visibility: "15-30m", temp: "24-29°C",
    bestSeason: "Jun-Nov", rating: 5,
  },
  {
    id: "bunaken", name: "Lekuan Walls, Bunaken", lat: 1.62, lng: 124.77, region: "Indo-Pacific",
    description: "Vertical coral walls plunging to 200m with turtles, reef sharks, and spectacular barrel sponges.",
    depthRange: "5-40m+", difficulty: "Intermediate", conditions: "Can have current", visibility: "20-35m", temp: "27-29°C",
    bestSeason: "Apr-Nov", rating: 4,
  },
  {
    id: "sipadan", name: "Barracuda Point, Sipadan", lat: 4.11, lng: 118.63, region: "Indo-Pacific",
    description: "Famous tornado of barracuda, schooling jacks, and green turtles. Jacques Cousteau's favorite site.",
    depthRange: "5-40m", difficulty: "Intermediate", conditions: "Strong current", visibility: "20-40m", temp: "27-30°C",
    bestSeason: "Apr-Dec", rating: 5,
  },
  {
    id: "ras-mohammed", name: "Shark & Yolanda Reef, Ras Mohammed", lat: 27.72, lng: 34.25, region: "Red Sea",
    description: "Dual reef system at the tip of Sinai with hammerheads, turtles, and the cargo of the wrecked Yolanda.",
    depthRange: "10-40m+", difficulty: "Intermediate", conditions: "Can be choppy", visibility: "30-50m", temp: "22-28°C",
    bestSeason: "Jun-Sep", rating: 5,
  },
  {
    id: "thistlegorm", name: "SS Thistlegorm Wreck", lat: 27.81, lng: 33.92, region: "Red Sea",
    description: "WWII British supply ship sunk in 1941. Intact cargo of motorcycles, trucks, rifles, and locomotives.",
    depthRange: "16-33m", difficulty: "Intermediate", conditions: "Can have current", visibility: "20-40m", temp: "22-28°C",
    bestSeason: "Mar-Nov", rating: 5,
  },
  {
    id: "brothers", name: "Brothers Islands", lat: 26.31, lng: 34.86, region: "Red Sea",
    description: "Remote offshore pinnacles with oceanic whitetips, thresher sharks, and magnificent soft corals.",
    depthRange: "10-40m+", difficulty: "Advanced", conditions: "Strong current", visibility: "25-50m", temp: "21-27°C",
    bestSeason: "May-Sep", rating: 5,
  },
  {
    id: "komodo", name: "Batu Bolong, Komodo", lat: -8.54, lng: 119.57, region: "Southeast Asia",
    description: "Pinnacle rising from 70m with mantas, sharks, turtles, and vibrant coral in nutrient-rich currents.",
    depthRange: "5-40m+", difficulty: "Advanced", conditions: "Strong current", visibility: "15-30m", temp: "24-28°C",
    bestSeason: "Apr-Nov", rating: 5,
  },
  {
    id: "malapascua", name: "Monad Shoal, Malapascua", lat: 11.33, lng: 124.12, region: "Southeast Asia",
    description: "The only place in the world where thresher sharks visit a cleaning station daily at sunrise.",
    depthRange: "15-30m", difficulty: "Intermediate", conditions: "Moderate current", visibility: "10-25m", temp: "26-29°C",
    bestSeason: "Year-round", rating: 4,
  },
  {
    id: "similan", name: "Richelieu Rock, Similan Islands", lat: 9.36, lng: 97.68, region: "Southeast Asia",
    description: "Horseshoe-shaped pinnacle with whale sharks (Feb-May), seahorses, frogfish, and massive schools.",
    depthRange: "5-35m", difficulty: "Intermediate", conditions: "Variable current", visibility: "15-30m", temp: "27-30°C",
    bestSeason: "Nov-May", rating: 5,
  },
  {
    id: "darwin", name: "Darwin Island, Galápagos", lat: 1.68, lng: -92.0, region: "Galápagos",
    description: "The northernmost Galápagos islet. Massive schools of hammerheads, whale sharks, and Galápagos sharks.",
    depthRange: "10-40m+", difficulty: "Advanced", conditions: "Strong current, surge", visibility: "10-25m", temp: "18-26°C",
    bestSeason: "Jun-Nov", rating: 5,
  },
  {
    id: "socorro", name: "Roca Partida, Socorro Islands", lat: 19.0, lng: -112.07, region: "Mexico Pacific",
    description: "Remote volcanic pinnacle 360km offshore. Giant mantas (up to 7m), hammerheads, dolphins, and whale sharks.",
    depthRange: "10-40m+", difficulty: "Advanced", conditions: "Strong current", visibility: "20-40m", temp: "20-26°C",
    bestSeason: "Nov-May", rating: 5,
  },
  {
    id: "cenote", name: "Dos Ojos Cenote, Yucatán", lat: 20.32, lng: -87.39, region: "Mexico Pacific",
    description: "World's longest underwater cave system. Stunning halocline, stalactites, and crystalline freshwater.",
    depthRange: "5-10m", difficulty: "Beginner", conditions: "Still, overhead (guided)", visibility: "50m+", temp: "25°C",
    bestSeason: "Year-round", rating: 4,
  },
  {
    id: "truk", name: "Fujikawa Maru, Truk Lagoon", lat: 7.38, lng: 151.87, region: "Micronesia",
    description: "The crown jewel of Truk's ghost fleet. Intact Zero fighter planes, sake bottles, and engine rooms.",
    depthRange: "15-34m", difficulty: "Intermediate", conditions: "Calm, enclosed", visibility: "20-40m", temp: "28-30°C",
    bestSeason: "Year-round", rating: 5,
  },
  {
    id: "palau", name: "Blue Corner, Palau", lat: 7.13, lng: 134.25, region: "Micronesia",
    description: "Corner of the reef with hook-in drift diving. Gray reef sharks, eagle rays, and Napoleon wrasse.",
    depthRange: "10-40m+", difficulty: "Advanced", conditions: "Strong current", visibility: "30-50m", temp: "28-30°C",
    bestSeason: "Nov-Apr", rating: 5,
  },
  {
    id: "scapa", name: "Scapa Flow Wrecks, Scotland", lat: 58.89, lng: -3.05, region: "Northern Europe",
    description: "The scuttled German High Seas Fleet (1919). Seven battleships and cruisers in cold, dark water.",
    depthRange: "12-45m", difficulty: "Technical", conditions: "Cold, dark, tidal", visibility: "5-15m", temp: "4-14°C",
    bestSeason: "May-Sep", rating: 4,
  },
  {
    id: "silfra", name: "Silfra Fissure, Iceland", lat: 64.25, lng: -21.12, region: "Northern Europe",
    description: "Dive between the Eurasian and North American tectonic plates. Drink the purest glacial water on Earth.",
    depthRange: "5-18m", difficulty: "Beginner", conditions: "Still, cold", visibility: "100m+", temp: "2-4°C",
    bestSeason: "Year-round", rating: 4,
  },
  {
    id: "sodwana", name: "Seven Mile Reef, Sodwana Bay", lat: -27.54, lng: 32.68, region: "South Africa",
    description: "Southernmost coral reefs with raggies, turtles, coelacanths (deep), and seasonal whale shark visits.",
    depthRange: "10-30m", difficulty: "Intermediate", conditions: "Surge, occasional current", visibility: "10-25m", temp: "20-26°C",
    bestSeason: "Apr-Sep", rating: 4,
  },
  {
    id: "maldives", name: "Maaya Thila, Ari Atoll", lat: 3.9, lng: 72.7, region: "Indian Ocean",
    description: "Night dive hotspot with whitetip reef sharks hunting by torchlight. Overhangs, caves, and soft corals.",
    depthRange: "5-30m", difficulty: "Intermediate", conditions: "Moderate current", visibility: "20-35m", temp: "27-30°C",
    bestSeason: "Dec-Apr", rating: 5,
  },
  {
    id: "molokini", name: "Molokini Crater, Hawaii", lat: 20.63, lng: -156.5, region: "Pacific",
    description: "Sunken volcanic crater with 250+ fish species, reef sharks, monk seals, and humpbacks (seasonal).",
    depthRange: "5-30m", difficulty: "Beginner", conditions: "Protected inside", visibility: "30-50m", temp: "24-27°C",
    bestSeason: "Year-round", rating: 4,
  },
  {
    id: "zenobia", name: "Zenobia Wreck, Cyprus", lat: 34.88, lng: 33.65, region: "Mediterranean",
    description: "174m roll-on ferry that sank on her maiden voyage in 1980. 104 articulated lorries still on board.",
    depthRange: "16-42m", difficulty: "Advanced", conditions: "Calm, deep", visibility: "15-25m", temp: "16-28°C",
    bestSeason: "May-Oct", rating: 4,
  },
];

const DIVE_SHOPS: DiveShop[] = [
  { id: "bonaire-dive", name: "Dive Friends Bonaire", lat: 12.17, lng: -68.29, region: "Caribbean", address: "Kaya Gob N Debrot 75, Kralendijk, Bonaire", website: "https://divefriendsbonaire.com", services: ["Rentals", "Guided dives", "Nitrox", "Tech"] },
  { id: "coz-shop", name: "Aldora Divers", lat: 20.51, lng: -86.95, region: "Caribbean", address: "Calle 5 Sur, Cozumel, Mexico", website: "https://aldora.com", services: ["Steel 120 tanks", "Nitrox", "Drift diving"] },
  { id: "belize-shop", name: "Amigos del Mar", lat: 17.91, lng: -87.96, region: "Caribbean", address: "Front Street, San Pedro, Ambergris Caye", website: "https://amigosdive.com", services: ["Blue Hole trips", "Rentals", "Courses"] },
  { id: "raja-shop", name: "Papua Diving", lat: -0.43, lng: 130.75, region: "Indo-Pacific", address: "Pulau Mansuar, Raja Ampat, Indonesia", website: "https://papua-diving.com", services: ["Liveaboards", "Guided dives", "Photography"] },
  { id: "gbr-shop", name: "Mike Ball Dive Expeditions", lat: -16.92, lng: 145.78, region: "Indo-Pacific", address: "Cairns Marina, QLD, Australia", website: "https://mikeball.com", services: ["Liveaboards", "Cod Hole", "Coral Sea"] },
  { id: "bunaken-shop", name: "Two Fish Divers", lat: 1.61, lng: 124.76, region: "Indo-Pacific", address: "Bunaken Island, North Sulawesi", website: "https://twofishdivers.com", services: ["Courses", "Rentals", "Macro"] },
  { id: "thistlegorm-shop", name: "Emperor Divers", lat: 27.93, lng: 34.34, region: "Red Sea", address: "Sharm el Sheikh, South Sinai, Egypt", website: "https://emperordivers.com", services: ["Wreck", "Liveaboards", "Courses"] },
  { id: "brothers-shop", name: "Blue O Two", lat: 25.07, lng: 34.9, region: "Red Sea", address: "Marsa Alam, Red Sea, Egypt", website: "https://blueotwo.com", services: ["Liveaboards", "Tech", "Wreck"] },
  { id: "komodo-shop", name: "Komodo Dive Center", lat: -8.58, lng: 119.88, region: "Southeast Asia", address: "Labuan Bajo, Flores, Indonesia", website: "https://komododivecenter.com", services: ["Liveaboards", "Current training", "Nitrox"] },
  { id: "malapascua-shop", name: "Evolution Diving", lat: 11.34, lng: 124.12, region: "Southeast Asia", address: "Malapascua Island, Cebu, Philippines", website: "https://evolution.com.ph", services: ["Thresher shark", "Courses", "Nitrox"] },
  { id: "socorro-shop", name: "Nautilus Liveaboards", lat: 24.09, lng: -110.38, region: "Mexico Pacific", address: "Cabo San Lucas, BCS, Mexico", website: "https://nautilusliveaboards.com", services: ["Mantas", "Great whites", "Liveaboards"] },
  { id: "cenote-shop", name: "Protec Tulum", lat: 20.21, lng: -87.47, region: "Mexico Pacific", address: "Carretera Tulum-Boca Paila KM 8", website: "https://protecdiving.com", services: ["Cave", "Tech", "Sidemount"] },
  { id: "truk-shop", name: "Odyssey Adventures", lat: 7.45, lng: 151.85, region: "Micronesia", address: "Weno, Chuuk, FSM", website: "https://trukodyssey.com", services: ["Wreck", "Tech", "Liveaboards"] },
  { id: "palau-shop", name: "Sam's Tours", lat: 7.34, lng: 134.52, region: "Micronesia", address: "Koror, Palau", website: "https://samstours.com", services: ["Reef hook", "Rentals", "Courses"] },
  { id: "scapa-shop", name: "Scapa Scuba", lat: 58.89, lng: -2.89, region: "Northern Europe", address: "Stromness, Orkney, Scotland", website: "https://scapascuba.co.uk", services: ["Wreck", "Tech", "Drysuit"] },
  { id: "silfra-shop", name: "Dive.is", lat: 64.26, lng: -21.12, region: "Northern Europe", address: "Thingvellir, Iceland", website: "https://dive.is", services: ["Dry suit", "Silfra guides", "Courses"] },
  { id: "maldives-shop", name: "Carpe Diem Maldives", lat: 3.95, lng: 72.75, region: "Indian Ocean", address: "Ari Atoll, Maldives", website: "https://carpediemmaldives.com", services: ["Liveaboards", "Manta", "Whale shark"] },
  { id: "molokini-shop", name: "Maui Dive Shop", lat: 20.71, lng: -156.44, region: "Pacific", address: "1455 S Kihei Rd, Maui, HI", website: "https://mauidiveshop.com", services: ["Molokini", "Rentals", "Courses"] },
  { id: "zenobia-shop", name: "Dive-In Cyprus", lat: 34.68, lng: 33.04, region: "Mediterranean", address: "Larnaca Marina, Cyprus", website: "https://dive-in.com.cy", services: ["Zenobia", "Wreck", "Courses"] },
];

const REGIONS = Array.from(new Set(DIVE_SITES.map((s) => s.region))).sort();

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 12, { duration: 1.2 });
  }, [lat, lng, map]);
  return null;
}

export default function DiveSites() {
  const [selectedSite, setSelectedSite] = useState<DiveSite | null>(null);
  const [selectedShop, setSelectedShop] = useState<DiveShop | null>(null);
  const [activeTab, setActiveTab] = useState<"sites" | "shops">("sites");
  const [filterRegion, setFilterRegion] = useState<string>("All");
  const [search, setSearch] = useState("");
  const mapRef = useRef<L.Map | null>(null);

  const filteredSites = DIVE_SITES.filter((s) => {
    if (filterRegion !== "All" && s.region !== filterRegion) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.region.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredShops = DIVE_SHOPS.filter((s) => {
    if (filterRegion !== "All" && s.region !== filterRegion) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const ratingStars = (r: number) => "★".repeat(r) + "☆".repeat(5 - r);

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6 lg:-my-8 h-[calc(100dvh-2rem)] lg:h-[calc(100vh-2rem)] flex flex-col">
      <div className="absolute bottom-20 left-4 right-4 lg:right-8 z-[1000] pointer-events-none">
        <div className="flex flex-col items-end gap-2">
          {selectedSite && (
            <div className="glass-card p-4 max-w-sm pointer-events-auto animate-slide-up shadow-xl shadow-surf/10 border-surf/20">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedSite.name}</h3>
                  <p className="text-xs text-surf">{selectedSite.region}</p>
                </div>
                <button onClick={() => setSelectedSite(null)} className="text-text-tertiary hover:text-white p-1">✕</button>
              </div>
              <p className="text-xs text-text-secondary mb-3">{selectedSite.description}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-text-secondary"><Gauge className="w-3 h-3 text-surf" /> {selectedSite.depthRange}</div>
                <div className="flex items-center gap-1.5 text-text-secondary"><Waves className="w-3 h-3 text-surf" /> {selectedSite.difficulty}</div>
                <div className="flex items-center gap-1.5 text-text-secondary"><Eye className="w-3 h-3 text-surf" /> {selectedSite.visibility}</div>
                <div className="flex items-center gap-1.5 text-text-secondary"><Thermometer className="w-3 h-3 text-surf" /> {selectedSite.temp}</div>
                <div className="flex items-center gap-1.5 text-text-secondary"><Calendar className="w-3 h-3 text-surf" /> {selectedSite.bestSeason}</div>
                <div className="flex items-center gap-1.5 text-amber-400">{ratingStars(selectedSite.rating)}</div>
              </div>
            </div>
          )}
          {selectedShop && (
            <div className="glass-card p-4 max-w-sm pointer-events-auto animate-slide-up shadow-xl shadow-teal/10 border-teal/20">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-teal" />{selectedShop.name}
                  </h3>
                  <p className="text-xs text-teal">{selectedShop.region} · {selectedShop.address}</p>
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
              placeholder="Search sites or shops…"
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
                    <p className="text-xs text-text-tertiary mb-1.5">{site.region}</p>
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
                    <p className="text-xs text-text-tertiary mb-1">{shop.region} · {shop.address}</p>
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
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
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
