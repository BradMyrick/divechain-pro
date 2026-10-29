import type { Region } from "./diveSites";

export interface DiveShop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  region: Region;
  country: string;
  address: string;
  website: string;
  services: string[];
}

export const DIVE_SHOPS: DiveShop[] = [
  { id: "bonaire-dive", name: "Dive Friends Bonaire", lat: 12.173, lng: -68.29, region: "Caribbean", country: "Bonaire", address: "Kaya Gob N Debrot 75, Kralendijk", website: "https://divefriendsbonaire.com", services: ["Rentals", "Guided dives", "Nitrox", "Tech"] },
  { id: "cur-ocean-encounters", name: "Ocean Encounters, Curaçao", lat: 12.112, lng: -68.891, region: "Caribbean", country: "Curaçao", address: "Zanzibar Plaza, Lion's Dive Resort, Curaçao", website: "https://oceanencounters.com", services: ["Boat dives", "Nitrox", "House reef"] },
  { id: "coz-aldora", name: "Aldora Divers", lat: 20.512, lng: -86.951, region: "Caribbean", country: "Mexico", address: "Calle 5 Sur, Cozumel", website: "https://aldora.com", services: ["Steel 120 tanks", "Nitrox", "Drift diving"] },
  { id: "mx-protec-tulum", name: "Protec Tulum", lat: 20.212, lng: -87.466, region: "Caribbean", country: "Mexico", address: "Carretera Tulum-Boca Paila KM 8", website: "https://protecdiving.com", services: ["Cave", "Tech", "Sidemount"] },
  { id: "blz-amigos", name: "Amigos del Mar", lat: 17.912, lng: -87.958, region: "Caribbean", country: "Belize", address: "Front Street, San Pedro, Ambergris Caye", website: "https://amigosdive.com", services: ["Blue Hole trips", "Rentals", "Courses"] },
  { id: "roa-cocoview", name: "Coco View Resort", lat: 12.223, lng: -86.503, region: "Caribbean", country: "Honduras", address: "French Cay, Roatán", website: "https://cocoviewresort.com", services: ["House reef", "Boat dives", "Nitrox"] },
  { id: "roa-akr", name: "Anthony's Key Resort", lat: 12.182, lng: -86.528, region: "Caribbean", country: "Honduras", address: "Sandy Bay, Roatán", website: "https://anthonyskey.com", services: ["Dolphin encounters", "Courses", "Nitrox"] },
  { id: "uti-udc", name: "Utila Dive Center", lat: 16.097, lng: -86.9, region: "Caribbean", country: "Honduras", address: "Utila Cays Road, Utila", website: "https://utiladivecentre.com", services: ["Courses", "Tech", "Whale sharks"] },
  { id: "cy-ocean-frontiers", name: "Ocean Frontiers", lat: 19.301, lng: -81.151, region: "Caribbean", country: "Cayman Islands", address: "Compass Point, East End, Grand Cayman", website: "https://oceanfrontiers.com", services: ["East End walls", "Nitrox", "Rebreathers"] },
  { id: "tci-blue-water", name: "Blue Water Divers", lat: 21.468, lng: -71.137, region: "Caribbean", country: "Turks & Caicos", address: "Front Street, Grand Turk", website: "https://gwdiving.com", services: ["Wall dives", "Small groups", "Courses"] },
  { id: "bah-stuart-cove", name: "Stuart Cove's", lat: 25.028, lng: -77.512, region: "Caribbean", country: "Bahamas", address: "SW Bay Street, Nassau, New Providence", website: "https://stuartcove.com", services: ["Shark dives", "Wreck dives", "Film site"] },
  { id: "bvi-dive-bvi", name: "Dive BVI", lat: 18.442, lng: -64.438, region: "Caribbean", country: "British Virgin Islands", address: "Village Cay Marina, Road Town, Tortola", website: "https://divebvi.com", services: ["Rhone trips", "Courses", "Rentals"] },
  { id: "saba-sea-saba", name: "Sea Saba Dive Center", lat: 17.627, lng: -63.243, region: "Caribbean", country: "Saba", address: "Fort Bay Harbor, Saba", website: "https://seasaba.com", services: ["Pinnacle dives", "Nitrox", "Courses"] },
  { id: "grn-aquanauts", name: "Aquanauts Grenada", lat: 12.052, lng: -61.754, region: "Caribbean", country: "Grenada", address: "Grand Anse, St George's", website: "https://divegrenada.com", services: ["Bianca C trips", "Nitrox", "Courses"] },
  { id: "fl-horizon", name: "Horizon Divers", lat: 25.032, lng: -80.514, region: "North America", country: "United States", address: "100 Ocean Drive, Key Largo, FL", website: "https://horizondivers.com", services: ["Wreck treks", "Tech", "Nitrox"] },
  { id: "fl-fling", name: "MV Fling", lat: 29.013, lng: -95.295, region: "North America", country: "United States", address: "Bridge Harbor Yacht Club, Freeport, TX", website: "https://flingcharters.com", services: ["Flower Gardens liveaboard", "Tech", "Nitrox"] },
  { id: "ca-san-diego", name: "Waterhorse Charters", lat: 32.724, lng: -117.226, region: "North America", country: "United States", address: "Ralphs Launch Ramp, San Diego, CA", website: "https://waterhorsearcharters.com", services: ["Wreck Alley", "Kelp", "Tech"] },
  { id: "soc-nautilus", name: "Nautilus Liveaboards", lat: 24.09, lng: -110.38, region: "Eastern Pacific", country: "Mexico", address: "Cabo San Lucas, BCS", website: "https://nautilusliveaboards.com", services: ["Socorro", "Great whites", "Nitrox"] },
  { id: "raja-papua", name: "Papua Diving", lat: -0.429, lng: 130.75, region: "Southeast Asia", country: "Indonesia", address: "Pulau Mansuar, Raja Ampat", website: "https://papua-diving.com", services: ["House reefs", "Photography", "Nitrox"] },
  { id: "komodo-dc", name: "Komodo Dive Center", lat: -8.577, lng: 119.879, region: "Southeast Asia", country: "Indonesia", address: "Labuan Bajo, Flores", website: "https://komododivecenter.com", services: ["Liveaboards", "Current training", "Nitrox"] },
  { id: "phi-evolution", name: "Evolution Diving", lat: 11.34, lng: 124.123, region: "Southeast Asia", country: "Philippines", address: "Malapascua Island, Cebu", website: "https://evolution.com.ph", services: ["Thresher sharks", "Tech", "Nitrox"] },
  { id: "gbr-mike-ball", name: "Mike Ball Dive Expeditions", lat: -16.919, lng: 145.778, region: "Australia & Pacific", country: "Australia", address: "Cairns Marlin Marina, QLD", website: "https://mikeball.com", services: ["Liveaboard", "Cod Hole", "Minke whales"] },
  { id: "tru-odyssey", name: "Truk Odyssey", lat: 7.452, lng: 151.85, region: "Australia & Pacific", country: "Micronesia", address: "Weno, Chuuk", website: "https://trukodyssey.com", services: ["Wreck", "Tech", "Liveaboard"] },
  { id: "palau-sams", name: "Sam's Tours", lat: 7.342, lng: 134.463, region: "Australia & Pacific", country: "Palau", address: "Ngerbechedet Bay, Koror", website: "https://samstours.com", services: ["Reef hooks", "Nitrox", "Courses"] },
  { id: "redsea-emperor", name: "Emperor Divers", lat: 27.928, lng: 34.336, region: "Red Sea & East Africa", country: "Egypt", address: "Sharm el Sheikh, South Sinai", website: "https://emperordivers.com", services: ["Wrecks", "Liveaboards", "Courses"] },
  { id: "redsea-blue-o-two", name: "blue o two", lat: 25.068, lng: 34.897, region: "Red Sea & East Africa", country: "Egypt", address: "Port Ghalib, Marsa Alam", website: "https://blueotwo.com", services: ["Liveaboards", "Tech", "Nitrox"] },
  { id: "za-aliwal", name: "Agulhas House & Dive", lat: -30.265, lng: 30.836, region: "Africa & Indian Ocean", country: "South Africa", address: "Margate, KwaZulu-Natal", website: "https://agulhashouse.com", services: ["Aliwal Shoal", "Protea Banks", "Shark dives"] },
  { id: "mv-carpe-diem", name: "Carpe Diem Maldives", lat: 4.177, lng: 73.509, region: "Africa & Indian Ocean", country: "Maldives", address: "Male Atoll", website: "https://carpediemmaldives.com", services: ["Liveaboard", "Mantas", "Whale sharks"] },
  { id: "cy-dive-in", name: "Dive-In Cyprus", lat: 34.68, lng: 33.042, region: "Europe & Mediterranean", country: "Cyprus", address: "Larnaca Marina, Larnaca", website: "https://dive-in.com.cy", services: ["Zenobia", "Wreck", "Courses"] },
  { id: "is-dive-is", name: "Dive.is", lat: 64.256, lng: -21.125, region: "Europe & Mediterranean", country: "Iceland", address: "Thingvellir National Park", website: "https://dive.is", services: ["Drysuit", "Silfra guides", "Courses"] },
];
