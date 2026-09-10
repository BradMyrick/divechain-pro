import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { DiveSite } from "../data/diveSites";
import { sunTimes, formatInZone } from "../lib/sun";
import { Wind, Waves, Thermometer, Sunrise, Sunset, Sun, ExternalLink, CloudSun, CloudLightning } from "lucide-react";

interface NwsPeriod {
  name: string;
  text: string;
}

interface NdbcObs {
  observedAt: string;
  waveHeightM?: number;
  domPeriodS?: number;
  windDirDeg?: number;
  windKt?: number;
  airTempC?: number;
  waterTempC?: number;
}

interface ConditionsPayload {
  site: string;
  updatedAt: number;
  forecast?: NwsPeriod[];
  obs?: NdbcObs;
  tides?: { station: string; points: { t: string; v: string }[] };
  sources: string[];
}

interface TropicalPayload {
  updatedAt: number;
  items: { title: string; summary: string; pubDate: string }[];
  available?: boolean;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

const compass = (deg?: number) => {
  if (deg === undefined) return "";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
};

function ObsChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-ocean/20 border border-card-border rounded-lg px-2 py-1.5">
      <span className="text-surf">{icon}</span>
      <div className="leading-none">
        <p className="text-[10px] text-text-tertiary uppercase tracking-wide">{label}</p>
        <p className="text-[11px] text-white font-medium tabular-nums mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function TideSparkline({ points, tz }: { points: { t: string; v: string }[]; tz: string }) {
  const { path, nextHigh, nextLow } = useMemo(() => {
    const vals = points.map((p) => Number(p.v)).filter(Number.isFinite);
    if (vals.length < 3) return { path: "", nextHigh: undefined, nextLow: undefined };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const coords = points.map((p, i) => {
      const x = (i / (points.length - 1)) * 200;
      const y = 34 - ((Number(p.v) - min) / span) * 28;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    let high: { t: string; v: number } | undefined;
    let low: { t: string; v: number } | undefined;
    for (let i = 1; i < points.length - 1; i++) {
      const a = Number(points[i - 1].v);
      const b = Number(points[i].v);
      const c = Number(points[i + 1].v);
      if (b >= a && b >= c && (!high || b > high.v)) high = { t: points[i].t, v: b };
      if (b <= a && b <= c && (!low || b < low.v)) low = { t: points[i].t, v: b };
    }
    return {
      path: coords.join(" "),
      nextHigh: high,
      nextLow: low,
    };
  }, [points]);

  const label = (t?: string) =>
    t ? formatInZone(new Date(t.replace(" ", "T") + "Z"), tz) : "--";

  return (
    <div>
      <svg viewBox="0 0 200 40" className="w-full h-10 text-surf" preserveAspectRatio="none">
        <polyline points={path} fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <div className="flex justify-between text-[10px] text-text-secondary tabular-nums">
        <span className="text-surf">High {label(nextHigh?.t)}</span>
        <span>MLLW</span>
        <span className="text-bismuth">Low {label(nextLow?.t)}</span>
      </div>
    </div>
  );
}

function TropicalBanner({ lat }: { lat: number }) {
  const { data } = useQuery({
    queryKey: ["tropical"],
    queryFn: () => fetchJson<TropicalPayload>("/api/tropical"),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  const item = data?.items?.[0];
  if (!item) return null;

  return (
    <a
      href="https://www.nhc.noaa.gov"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 bg-warn/10 border border-warn/25 rounded-lg p-2.5 hover:bg-warn/15 transition-colors"
    >
      <CloudLightning className="w-4 h-4 text-warn shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-warn truncate">NHC Atlantic Outlook — {lat.toFixed(0)}°N</p>
        <p className="text-[10px] text-text-secondary line-clamp-2">{item.title}</p>
      </div>
      <ExternalLink className="w-3 h-3 text-text-tertiary shrink-0 mt-1" />
    </a>
  );
}

export default function SiteConditions({ site }: { site: DiveSite }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["conditions", site.id],
    queryFn: () => fetchJson<ConditionsPayload>(`/api/conditions?site=${site.id}`),
    staleTime: 15 * 60 * 1000,
    retry: false,
  });

  const sun = useMemo(() => sunTimes(new Date(), site.lat, site.lng), [site.lat, site.lng]);
  const wantsLive = site.us || Boolean(site.ndbc) || Boolean(site.tides);
  const hasLive = Boolean(data?.forecast?.length || data?.obs || data?.tides);

  return (
    <div className="space-y-3 border-t border-card-border pt-3">
      {site.region === "Caribbean" && <TropicalBanner lat={site.lat} />}

      {isLoading && wantsLive && (
        <p className="text-[11px] text-text-tertiary animate-pulse">Checking NOAA conditions…</p>
      )}

      {data?.forecast && data.forecast.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5 flex items-center gap-1">
            <CloudSun className="w-3 h-3" /> Marine forecast
          </p>
          <div className="space-y-1">
            {data.forecast.map((p) => (
              <div key={p.name} className="text-[11px] flex gap-2">
                <span className="text-text-tertiary w-24 shrink-0">{p.name}</span>
                <span className="text-text-secondary flex-1">{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data?.obs && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
            Buoy obs · {site.ndbc} · {data.obs.observedAt}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {data.obs.waveHeightM !== undefined && (
              <ObsChip icon={<Waves className="w-3.5 h-3.5" />} label="Waves" value={`${data.obs.waveHeightM.toFixed(1)} m`} />
            )}
            {data.obs.windKt !== undefined && (
              <ObsChip icon={<Wind className="w-3.5 h-3.5" />} label="Wind" value={`${compass(data.obs.windDirDeg)} ${data.obs.windKt} kt`} />
            )}
            {data.obs.domPeriodS !== undefined && (
              <ObsChip icon={<Waves className="w-3.5 h-3.5" />} label="Swell period" value={`${data.obs.domPeriodS.toFixed(0)} s`} />
            )}
            {data.obs.waterTempC !== undefined && (
              <ObsChip icon={<Thermometer className="w-3.5 h-3.5" />} label="Water" value={`${data.obs.waterTempC.toFixed(0)}°C`} />
            )}
          </div>
        </div>
      )}

      {data?.tides && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1">Tides · next 36 h</p>
          <TideSparkline points={data.tides.points} tz={site.tz} />
        </div>
      )}

      {wantsLive && !hasLive && !isLoading && (
        <p className="text-[11px] text-text-tertiary">
          {isError ? "Live conditions temporarily unavailable." : "No NOAA coverage for this point."}
        </p>
      )}

      {!wantsLive && (
        <div className="text-[11px] text-text-tertiary space-y-1.5">
          <p>
            No public-domain live feed covers this site — trust the local briefing.{" "}
            {site.conditions} is the typical pattern; best window {site.bestSeason.toLowerCase()}.
          </p>
          {site.metUrl && (
            <a
              href={site.metUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-surf hover:underline"
            >
              Official marine weather <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-card-border/50 pt-2 text-[10px] text-text-tertiary">
        <span className="flex items-center gap-2.5">
          <span className="flex items-center gap-1"><Sunrise className="w-3 h-3 text-gold" />{sun.sunriseUtc ? formatInZone(sun.sunriseUtc, site.tz) : "--"}</span>
          <span className="flex items-center gap-1"><Sun className="w-3 h-3 text-gold" />{formatInZone(sun.solarNoonUtc, site.tz)}</span>
          <span className="flex items-center gap-1"><Sunset className="w-3 h-3 text-bismuth" />{sun.sunsetUtc ? formatInZone(sun.sunsetUtc, site.tz) : "--"}</span>
        </span>
        <span className="shrink-0">{site.tz.split("/").pop()?.replace(/_/g, " ")}</span>
      </div>

      {hasLive && data?.sources?.length ? (
        <p className="text-[9px] text-text-tertiary/70">Live data: {data.sources.join(", ")} · public domain</p>
      ) : null}
    </div>
  );
}
