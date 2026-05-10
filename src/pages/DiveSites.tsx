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
                <g fill="#064663" fillOpacity="0.35" stroke="#0d7a8a" strokeWidth="0.15" strokeLinejoin="round">
                  <path d="M14,8 L17,7 20,8 21,10 19,12 18,14 20,16 22,17 24,18 26,19 25,22 23,24 20,25 18,26 16,24 14,22 12,20 13,17 14,14 13,12 12,10Z" />
                  <path d="M21,10 L24,9 27,10 29,12 30,14 28,16 26,17 24,18 22,17 20,16 18,14 19,12Z" />
                  <path d="M22,17 L24,20 26,22 28,24 30,28 32,30 34,32 33,35 31,37 29,38 27,36 25,34 23,30 22,28 20,25 18,26 16,24 14,22 16,20 18,19 20,18Z" />
                  <path d="M45,5 L48,4 51,5 54,7 53,10 51,12 49,11 47,10 45,8Z" />
                  <path d="M47,10 L50,11 52,13 53,15 51,17 49,18 47,16 46,14 45,12 47,10Z" />
                  <path d="M44,7 L47,8 48,10 47,12 45,14 44,12 43,10 44,7Z" />
                  <path d="M49,18 L52,18 55,19 58,21 60,23 59,26 57,28 55,30 53,29 51,27 49,25 47,23 46,21 47,19 49,18Z" />
                  <path d="M53,29 L56,30 58,32 59,34 57,36 55,37 53,35 51,33 52,31Z" />
                  <path d="M55,37 L58,38 60,40 58,42 56,41 55,39Z" />
                  <path d="M57,28 L60,27 63,28 66,30 68,32 70,34 72,36 73,38 71,40 69,42 67,40 65,38 63,36 61,34 59,32 57,30Z" />
                  <path d="M68,22 L71,21 74,22 77,24 79,26 78,28 76,30 74,29 72,27 70,25 68,23Z" />
                  <path d="M79,26 L82,25 85,26 88,28 90,30 89,33 87,35 85,37 83,36 81,34 79,32 78,30 79,28Z" />
                  <path d="M85,37 L88,36 91,38 93,40 92,42 90,44 88,43 86,41 85,39Z" />
                  <path d="M76,30 L79,32 81,34 83,36 85,37 84,39 82,41 80,40 78,38 76,36 75,34 76,32Z" />
                  <path d="M63,28 L66,27 69,28 72,30 74,32 72,34 70,36 68,34 66,32 64,30Z" />
                  <path d="M60,4 L63,3 66,4 68,6 67,8 65,10 63,9 61,7 60,5Z" />
                  <path d="M58,32 L61,33 63,35 62,37 60,38 58,37 57,35Z" />
                  <path d="M81,10 L84,11 87,12 90,14 91,17 90,20 88,22 86,20 84,18 82,16 80,14 81,12Z" />
                  <path d="M38,14 L41,13 44,14 47,16 46,19 44,21 42,20 40,18 39,16Z" />
                </g>
                <g fill="none" stroke="#0d7a8a" strokeWidth="0.08" strokeOpacity="0.2">
                  <line x1="0" y1="12.5" x2="100" y2="12.5" />
                  <line x1="0" y1="37.5" x2="100" y2="37.5" />
                  <line x1="25" y1="0" x2="25" y2="50" />
                  <line x1="50" y1="0" x2="50" y2="50" />
                  <line x1="75" y1="0" x2="75" y2="50" />
                </g>
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
