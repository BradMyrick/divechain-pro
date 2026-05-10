import { useState } from "react";
import { GlobeAltIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface DiveRegion {
  id: string;
  name: string;
  x: number;
  y: number;
  temp: string;
  visibility: string;
  bestSeason: string;
  topSites: string[];
  description: string;
}

const REGIONS: DiveRegion[] = [
  {
    id: "caribbean",
    name: "Caribbean",
    x: 26, y: 42,
    temp: "26-29\u00B0C",
    visibility: "20-40m",
    bestSeason: "Dec-Apr",
    topSites: ["Bonaire", "Cozumel", "Grand Cayman", "Belize Blue Hole"],
    description: "Crystal clear waters, vibrant coral reefs, and warm temperatures year-round.",
  },
  {
    id: "indopacific",
    name: "Indo-Pacific",
    x: 75, y: 48,
    temp: "27-30\u00B0C",
    visibility: "15-40m",
    bestSeason: "Apr-Nov",
    topSites: ["Raja Ampat", "Great Barrier Reef", "Bunaken", "Sipadan"],
    description: "The world's most biodiverse marine region with 3,000+ fish species.",
  },
  {
    id: "mediterranean",
    name: "Mediterranean",
    x: 52, y: 32,
    temp: "16-26\u00B0C",
    visibility: "10-30m",
    bestSeason: "May-Oct",
    topSites: ["Blue Hole Malta", "Chios Wreck", "Medes Islands", "Capo Testa"],
    description: "Historic wreck diving through ancient trade routes and empires.",
  },
  {
    id: "redsea",
    name: "Red Sea",
    x: 56, y: 40,
    temp: "22-28\u00B0C",
    visibility: "20-50m",
    bestSeason: "Mar-Nov",
    topSites: ["Ras Mohammed", "Thistlegorm", "Brothers Islands", "Daedalus Reef"],
    description: "Legendary visibility and world-class wall dives along the Sinai.",
  },
  {
    id: "southeast_asia",
    name: "Southeast Asia",
    x: 70, y: 48,
    temp: "27-30\u00B0C",
    visibility: "10-30m",
    bestSeason: "Mar-Oct",
    topSites: ["Similan Islands", "Komodo", "Malapascua", "Anilao"],
    description: "Thailand, Philippines, and Indonesia offer unmatched variety and value.",
  },
  {
    id: "galapagos",
    name: "Gal\u00E1pagos",
    x: 20, y: 50,
    temp: "18-26\u00B0C",
    visibility: "10-25m",
    bestSeason: "Jun-Nov",
    topSites: ["Darwin Island", "Wolf Island", "Gordon Rocks", "Cabo Douglas"],
    description: "Big animal encounters: hammerheads, whale sharks, marine iguanas.",
  },
  {
    id: "mexico_pacific",
    name: "Mexico Pacific",
    x: 16, y: 44,
    temp: "20-28\u00B0C",
    visibility: "10-30m",
    bestSeason: "Aug-Mar",
    topSites: ["Socorro Islands", "Guadalupe", "Cabo Pulmo", "Cenotes"],
    description: "From great whites to cenote cavern dives in the Yucatan jungle.",
  },
  {
    id: "south_africa",
    name: "South Africa",
    x: 55, y: 68,
    temp: "16-24\u00B0C",
    visibility: "5-20m",
    bestSeason: "May-Sep",
    topSites: ["Aliwal Shoal", "Sodwana Bay", "Protea Banks", "Cape Town Kelp"],
    description: "Sardine run, shark encounters, and the otherworldly kelp forests.",
  },
  {
    id: "micronesia",
    name: "Micronesia",
    x: 82, y: 42,
    temp: "28-30\u00B0C",
    visibility: "20-50m",
    bestSeason: "Year-round",
    topSites: ["Truk Lagoon", "Palau", "Yap", "Pohnpei"],
    description: "The ultimate wreck diving destination with 60+ WWII shipwrecks.",
  },
  {
    id: "northern_europe",
    name: "Northern Europe",
    x: 48, y: 22,
    temp: "4-16\u00B0C",
    visibility: "5-20m",
    bestSeason: "May-Sep",
    topSites: ["Scapa Flow", "Lofoten", "Silfra", "Farnes Islands"],
    description: "Cold water diving at its finest: wrecks, drysuit adventures, seal encounters.",
  },
];

export default function DiveSites() {
  const [selected, setSelected] = useState<DiveRegion | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Dive Sites Explorer</h1>
          <p className="text-xs text-gray-500 mt-1">Select a region to explore conditions and top dive sites.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
        <div className="lg:col-span-2">
          <div className="glass-card p-4 relative">
            <div className="relative w-full" style={{ aspectRatio: "2/1" }}>
              <svg viewBox="0 0 100 50" className="w-full h-full" style={{ background: "linear-gradient(180deg, #041c32 0%, #04293a 100%)", borderRadius: "0.5rem" }}>
                <defs>
                  <radialGradient id="pin-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {REGIONS.map((r) => (
                  <g
                    key={r.id}
                    onClick={() => setSelected(r)}
                    onMouseEnter={() => setHovered(r.id)}
                    onMouseLeave={() => setHovered(null)}
                    className="cursor-pointer"
                  >
                    <circle cx={r.x} cy={r.y} r={hovered === r.id || selected?.id === r.id ? "3" : "1.5"} fill="#22d3ee" opacity={hovered === r.id || selected?.id === r.id ? 1 : 0.6}>
                      <animate attributeName="r" values={selected?.id === r.id ? "1.5;3;1.5" : "1.5;2;1.5"} dur="2s" repeatCount="indefinite" />
                    </circle>
                    {(hovered === r.id || selected?.id === r.id) && (
                      <>
                        <circle cx={r.x} cy={r.y} r="4" fill="url(#pin-glow)" />
                        <text x={r.x} y={r.y - 3} textAnchor="middle" fill="#67e8f9" fontSize="2.2" fontWeight="600">
                          {r.name}
                        </text>
                      </>
                    )}
                  </g>
                ))}
                <line x1="0" y1="25" x2="100" y2="25" stroke="#064663" strokeWidth="0.15" strokeDasharray="1,2" />
                <text x="2" y="4" fill="#4a6a80" fontSize="1.8">Divechain{" "}{"\u00B7"}{" "}Global Dive Conditions</text>
                <text x="85" y="48" fill="#4a6a80" fontSize="1.5">Click a pin</text>
              </svg>
            </div>

            <div className="grid grid-cols-5 gap-2 mt-4">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`text-xs px-2 py-1.5 rounded-lg transition-all ${
                    selected?.id === r.id
                      ? "bg-teal/20 text-surf border border-teal/30"
                      : "bg-ocean/30 text-gray-400 border border-card-border hover:border-bismuth/30 hover:text-gray-200"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          {selected ? (
            <div className="glass-card p-5 space-y-4">
              <h2 className="text-lg font-bold text-white">{selected.name}</h2>
              <p className="text-sm text-gray-400">{selected.description}</p>

              <div className="grid grid-cols-3 gap-2">
                <div className="stat-box">
                  <p className="text-sm font-bold text-surf">{selected.temp}</p>
                  <p className="text-[9px] text-gray-500 uppercase">Water</p>
                </div>
                <div className="stat-box">
                  <p className="text-sm font-bold text-surf">{selected.visibility}</p>
                  <p className="text-[9px] text-gray-500 uppercase">Visibility</p>
                </div>
                <div className="stat-box">
                  <p className="text-sm font-bold text-surf">{selected.bestSeason}</p>
                  <p className="text-[9px] text-gray-500 uppercase">Season</p>
                </div>
              </div>

              <div>
                <div className="section-title">Top Dive Sites</div>
                <ul className="space-y-1.5">
                  {selected.topSites.map((site) => (
                    <li key={site} className="flex items-center gap-2 text-sm text-gray-300">
                      <ChevronRightIcon className="w-3 h-3 text-teal shrink-0" />
                      {site}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="glass-card p-6 text-center">
              <GlobeAltIcon className="w-10 h-10 text-bismuth/50 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Click a region on the map or select from the list to explore dive conditions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
