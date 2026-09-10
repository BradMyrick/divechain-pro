import { useState, useMemo, lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Anchor, Building2, Waves, Thermometer, Eye, Calendar,
  Gauge, Globe, Search, ExternalLink, Star, X, Link2, Check,
} from "lucide-react";
import {
  DIVE_SITES, REGIONS, SITE_TYPE_ORDER, DIFFICULTY_ORDER,
  type DiveSite, type SiteType, type Difficulty,
} from "../data/diveSites";
import { DIVE_SHOPS, type DiveShop } from "../data/diveShops";
import SiteConditions from "../components/SiteConditions";
import { useLocalStorage } from "../hooks/useLocalStorage";

const SitesGlobe = lazy(() => import("../components/SitesGlobe"));

const DIFFICULTY_RANK: Record<Difficulty, number> = {
  Beginner: 0, Intermediate: 1, Advanced: 2, Technical: 3,
};

const DIFFICULTY_PILL: Record<Difficulty, string> = {
  Beginner: "pill-kelp", Intermediate: "pill-surf", Advanced: "pill-warn", Technical: "pill-danger",
};

type SortKey = "rating" | "name" | "country" | "difficulty";

const SORTS: [SortKey, string][] = [
  ["rating", "Top rated"],
  ["name", "Name A\u2013Z"],
  ["country", "Country"],
  ["difficulty", "Easiest first"],
];

export default function DiveSites() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSite, setSelectedSite] = useState<DiveSite | null>(() => {
    const id = searchParams.get("site");
    return id ? DIVE_SITES.find((s) => s.id === id) ?? null : null;
  });
  const [selectedShop, setSelectedShop] = useState<DiveShop | null>(null);
  const [activeTab, setActiveTab] = useState<"sites" | "shops">("sites");
  const [filterRegion, setFilterRegion] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("rating");
  const [typeFilters, setTypeFilters] = useState<SiteType[]>([]);
  const [difficultyFilters, setDifficultyFilters] = useState<Difficulty[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useLocalStorage<string[]>("dc_fav_sites", []);
  const [copied, setCopied] = useState(false);

  const presentTypes = useMemo(
    () => SITE_TYPE_ORDER.filter((t) => DIVE_SITES.some((s) => s.types.includes(t))),
    [],
  );

  const selectSite = (site: DiveSite | null) => {
    setSelectedSite(site);
    setSelectedShop(null);
    setSearchParams(site ? { site: site.id } : {}, { replace: true });
  };

  const isFavorite = (id: string) => favorites.includes(id);
  const toggleFavorite = (id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const toggleType = (t: SiteType) => {
    setTypeFilters((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };
  const toggleDifficulty = (d: Difficulty) => {
    setDifficultyFilters((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };
  const filtersActive = typeFilters.length > 0 || difficultyFilters.length > 0 || favoritesOnly || filterRegion !== "All" || search !== "";
  const clearFilters = () => {
    setTypeFilters([]);
    setDifficultyFilters([]);
    setFavoritesOnly(false);
    setFilterRegion("All");
    setSearch("");
  };

  const filteredSites = useMemo(() => {
    const q = search.toLowerCase();
    const sites = DIVE_SITES.filter((s) => {
      if (filterRegion !== "All" && s.region !== filterRegion) return false;
      if (favoritesOnly && !favorites.includes(s.id)) return false;
      if (typeFilters.length > 0 && !s.types.some((t) => typeFilters.includes(t))) return false;
      if (difficultyFilters.length > 0 && !difficultyFilters.includes(s.difficulty)) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.country.toLowerCase().includes(q) && !s.region.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
    const byName = (a: DiveSite, b: DiveSite) => a.name.localeCompare(b.name);
    switch (sort) {
      case "name":
        return sites.sort(byName);
      case "country":
        return sites.sort((a, b) => a.country.localeCompare(b.country) || byName(a, b));
      case "difficulty":
        return sites.sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] || byName(a, b));
      default:
        return sites.sort((a, b) => b.rating - a.rating || byName(a, b));
    }
  }, [search, filterRegion, favoritesOnly, favorites, typeFilters, difficultyFilters, sort]);

  const filteredShops = useMemo(() => {
    const q = search.toLowerCase();
    return DIVE_SHOPS.filter((s) => {
      if (filterRegion !== "All" && s.region !== filterRegion) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.country.toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [search, filterRegion]);

  const copyLink = () => {
    const url = `${window.location.origin}/dive-sites?site=${selectedSite!.id}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const ratingStars = (r: number) => "\u2605".repeat(r) + "\u2606".repeat(5 - r);

  return (
    <div className="-mx-3 sm:-mx-6 lg:-mx-8 -mt-1 -mb-4 sm:-mt-2 sm:-mb-6 lg:-mt-4 lg:-mb-8 flex flex-col flex-1 min-h-0 h-full">
      <div className="absolute bottom-20 left-4 right-4 lg:right-8 z-[1000] pointer-events-none">
        <div className="flex flex-col items-end gap-2">
          {selectedSite && (
            <div className="glass-card p-4 w-full sm:max-w-sm pointer-events-auto animate-slide-up shadow-xl shadow-surf/10 border-surf/20 max-h-[55vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedSite.name}</h3>
                  <p className="text-xs text-surf">{selectedSite.country} · {selectedSite.region}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleFavorite(selectedSite.id)}
                    className={`p-1.5 rounded-lg transition-colors ${isFavorite(selectedSite.id) ? "text-gold" : "text-text-tertiary hover:text-gold"}`}
                    title={isFavorite(selectedSite.id) ? "Remove from saved" : "Save site"}
                  >
                    <Star className="w-4 h-4" fill={isFavorite(selectedSite.id) ? "currentColor" : "none"} />
                  </button>
                  <button onClick={copyLink} className="p-1.5 rounded-lg text-text-tertiary hover:text-surf transition-colors" title="Copy link">
                    {copied ? <Check className="w-4 h-4 text-kelp" /> : <Link2 className="w-4 h-4" />}
                  </button>
                  <button onClick={() => selectSite(null)} className="text-text-tertiary hover:text-white p-1.5" title="Close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
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
                <button onClick={() => { setSelectedShop(null); setSearchParams({}, { replace: true }); }} className="text-text-tertiary hover:text-white p-1.5" title="Close">
                  <X className="w-4 h-4" />
                </button>
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

      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-2.5 bg-card/80 backdrop-blur-sm border-b border-card-border z-[1001]">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white flex items-center gap-2 shrink-0">
            <Globe className="w-5 h-5 text-surf" /> Dive Sites
          </h1>
          <div className="flex gap-1 ml-auto shrink-0">
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

        <div className="flex items-center gap-2 flex-1 w-full">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
            <input
              type="text"
              placeholder="Search sites, shops, countries…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="!pl-8 !py-2 !text-sm !rounded-lg w-full"
            />
          </div>
          {activeTab === "sites" && (
            <>
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
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="!w-auto !py-2 !text-sm !rounded-lg shrink-0"
              >
                {SORTS.map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <button
                onClick={() => setFavoritesOnly((v) => !v)}
                className={`text-xs px-2.5 py-2 rounded-lg shrink-0 flex items-center gap-1.5 transition-all touch-manipulation ${
                  favoritesOnly ? "bg-gold/15 text-gold border border-gold/30" : "text-text-secondary border border-card-border hover:text-gray-200"
                }`}
                title="Saved sites"
              >
                <Star className="w-3.5 h-3.5" fill={favoritesOnly ? "currentColor" : "none"} />
                {favorites.length > 0 && <span className="tabular-nums">{favorites.length}</span>}
              </button>
            </>
          )}
        </div>

        {activeTab === "sites" && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {DIFFICULTY_ORDER.map((d) => (
              <button
                key={d}
                onClick={() => toggleDifficulty(d)}
                className={`pill text-[10px] px-2.5 py-1 transition-all touch-manipulation ${
                  difficultyFilters.includes(d) ? DIFFICULTY_PILL[d] : "bg-ocean/20 text-text-secondary border border-card-border hover:text-gray-200"
                }`}
              >
                {d}
              </button>
            ))}
            <span className="w-px h-4 bg-card-border mx-0.5" />
            {presentTypes.map((t) => (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={`pill text-[10px] px-2.5 py-1 transition-all touch-manipulation ${
                  typeFilters.includes(t) ? "pill-teal" : "bg-ocean/20 text-text-secondary border border-card-border hover:text-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
            {filtersActive && (
              <button onClick={clearFilters} className="pill text-[10px] px-2.5 py-1 bg-danger/10 text-danger border border-danger/25 hover:bg-danger/20 transition-all touch-manipulation">
                Clear <X className="w-3 h-3 inline" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row flex-1 lg:flex-none lg:h-[calc(100dvh-12.25rem)] min-h-0">
        <div className="w-full lg:w-[300px] xl:w-[340px] shrink-0 min-h-0 max-h-[42vh] lg:max-h-[80dvh] border-t lg:border-t-0 lg:border-r border-card-border overflow-y-auto custom-scrollbar bg-card/40 order-2 lg:order-1">
          <div className="p-3 space-y-2">
            {activeTab === "sites" ? (
              filteredSites.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <p className="text-xs text-text-tertiary">
                    {favoritesOnly && favorites.length === 0
                      ? "No saved sites yet — tap the star on any site."
                      : "No sites match your filters."}
                  </p>
                  {filtersActive && (
                    <button onClick={clearFilters} className="btn-ghost text-xs">Clear filters</button>
                  )}
                </div>
              ) : sort === "country" ? (
                Object.entries(
                  filteredSites.reduce<Record<string, DiveSite[]>>((groups, s) => {
                    (groups[s.country] ??= []).push(s);
                    return groups;
                  }, {}),
                ).map(([country, sites]) => (
                  <div key={country} className="space-y-2">
                    <p className="sticky top-0 bg-card/95 backdrop-blur-sm text-[10px] uppercase tracking-widest text-text-tertiary font-semibold px-1 pt-1 pb-1.5 z-10">
                      {country} <span className="text-text-tertiary/60">({sites.length})</span>
                    </p>
                    {sites.map((site) => (
                      <SiteCard
                        key={site.id}
                        site={site}
                        selected={selectedSite?.id === site.id}
                        favorite={isFavorite(site.id)}
                        onSelect={() => selectSite(site)}
                        onToggleFavorite={() => toggleFavorite(site.id)}
                      />
                    ))}
                  </div>
                ))
              ) : (
                filteredSites.map((site) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    selected={selectedSite?.id === site.id}
                    favorite={isFavorite(site.id)}
                    onSelect={() => selectSite(site)}
                    onToggleFavorite={() => toggleFavorite(site.id)}
                  />
                ))
              )
            ) : filteredShops.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center py-8">No shops match your search.</p>
            ) : (
              filteredShops.map((shop) => (
                <button
                  key={shop.id}
                  onClick={() => { setSelectedShop(shop); selectSite(null); }}
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
            )}
          </div>
        </div>

        <div className="flex-1 relative min-h-[58vh] lg:min-h-0 max-h-dvh order-1 lg:order-2">
          <Suspense
            fallback={
              <div className="absolute inset-0 bg-abyss flex items-center justify-center">
                <p className="text-xs text-text-tertiary animate-pulse">Spinning up the globe…</p>
              </div>
            }
          >
            <SitesGlobe
              sites={activeTab === "sites" ? filteredSites : []}
              shops={activeTab === "shops" ? filteredShops : []}
              selectedSite={selectedSite}
              onSelectSite={(site) => selectSite(site)}
              onSelectShop={(shop) => { setSelectedShop(shop); selectSite(null); }}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function SiteCard({
  site, selected, favorite, onSelect, onToggleFavorite,
}: {
  site: DiveSite;
  selected: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      className={`w-full text-left glass-card p-3 transition-all touch-manipulation cursor-pointer ${
        selected ? "border-surf/40 bg-navy/30" : "hover:border-card-border-bright"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-white truncate flex-1">{site.name}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={`shrink-0 p-1 -m-1 rounded-md transition-colors ${favorite ? "text-gold" : "text-text-tertiary/60 hover:text-gold"}`}
          title={favorite ? "Remove from saved" : "Save site"}
        >
          <Star className="w-3.5 h-3.5" fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
      <p className="text-xs text-text-tertiary mb-1.5">{site.country}</p>
      <div className="flex items-center gap-2.5 text-xs text-text-secondary flex-wrap">
        <span className="flex items-center gap-1"><Gauge className="w-3 h-3" />{site.depthRange}</span>
        <span className={`pill ${DIFFICULTY_PILL[site.difficulty]} text-[9px] py-0`}>{site.difficulty}</span>
        <span className="text-amber-400/80 ml-auto">{ratingStarsRow(site.rating)}</span>
      </div>
    </div>
  );
}

function ratingStarsRow(r: number) {
  return "\u2605".repeat(r) + "\u2606".repeat(5 - r);
}
