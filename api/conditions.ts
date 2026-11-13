import { siteById } from "../src/data/diveSites";

const USER_AGENT = "DivechainPro/1.0 (https://divechain.pro; ops@divechain.pro)";
const FETCH_TTL_MS = 20 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 8000;

interface CacheEntry {
  expires: number;
  body: unknown;
}

const cache = new Map<string, CacheEntry>();

async function getJson(url: string, accept: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: accept },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
}

interface NwsPeriod {
  name: string;
  text: string;
}

function normalizeOffice(cwa: string): string {
  if (cwa === "SJU") return "TJSJ";
  if (cwa === "HFO" || cwa === "GUM" || cwa.startsWith("AF") || cwa.startsWith("AJ") || cwa.startsWith("AE") || cwa.startsWith("AR")) {
    return "P" + cwa;
  }
  return "K" + cwa;
}

/** Expand a UGC header token like GMZ042>044, GMZ042,044 into individual zone ids. */
export function expandUgc(token: string, prefix: string): string[] {
  const out: string[] = [];
  for (const part of token.split(",")) {
    const range = part.match(/^([A-Z]{3})(\d{3})>(\d{3})$/);
    const bare = part.match(/^(\d{3})$/);
    if (range && range[1] === prefix) {
      for (let i = Number(range[2]); i <= Number(range[3]); i++) {
        out.push(prefix + String(i).padStart(3, "0"));
      }
    } else if (part.startsWith(prefix)) {
      out.push(part);
    } else if (bare && bare[1]) {
      out.push(prefix + bare[1]);
    }
  }
  return out;
}

export function parseZoneSegments(productText: string, zone: string): NwsPeriod[] {
  for (const segment of productText.split("$$")) {
    const header = segment.trim().match(/^([A-Z]{3}[\d>,>]+)-\d{6}-/);
    if (!header || !expandUgc(header[1], zone.slice(0, 3)).includes(zone)) continue;

    const periods: NwsPeriod[] = [];
    const lines = segment.split("\n");
    let current: NwsPeriod | null = null;
    for (const line of lines) {
      const periodMatch = line.match(/^\.([A-Z][A-Z /]+?)\.\.\.(.*)$/);
      if (periodMatch) {
        if (current && periods.length < 4) periods.push(current);
        if (periods.length >= 4) break;
        current = { name: titleCase(periodMatch[1]), text: periodMatch[2].trim() };
      } else if (current && line.trim()) {
        current.text += " " + line.trim();
      }
    }
    if (current && periods.length < 4) periods.push(current);
    if (periods.length) return periods.map((p) => ({ ...p, text: p.text.replace(/\s+/g, " ") }));
  }
  return [];
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function nwsForecast(
  lat: number,
  lng: number,
  fallbackZone?: string,
  fallbackOffice?: string,
): Promise<NwsPeriod[]> {
  let zone = fallbackZone;
  let office = fallbackOffice;

  const points = (await getJson(
    `https://api.weather.gov/points/${lat.toFixed(4)},${lng.toFixed(4)}`,
    "application/geo+json",
  )) as {
    properties?: {
      cwa?: string;
      type?: string;
      forecastZone?: string;
    };
  };
  const props = points.properties;
  if (props?.type === "marine" && props.forecastZone) {
    const resolved = props.forecastZone.split("/").pop();
    if (resolved) zone = resolved;
    if (props.cwa) office = normalizeOffice(props.cwa);
  }
  if (!office && props?.cwa) office = normalizeOffice(props.cwa);
  if (!zone || !office) throw new Error("no marine zone for point");

  const productList = (await getJson(
    "https://api.weather.gov/products/types/CWF",
    "application/ld+json",
  )) as {
    "@graph"?: { id: string; issuingOffice?: string; issuanceTime?: string }[];
  };
  const products = (productList["@graph"] ?? [])
    .filter((g) => g.issuingOffice === office)
    .sort((a, b) => (a.issuanceTime ?? "").localeCompare(b.issuanceTime ?? ""))
    .slice(-3)
    .reverse();
  if (!products.length) throw new Error(`no CWF product for ${office}`);

  for (const product of products) {
    const full = (await getJson(
      `https://api.weather.gov/products/${product.id}`,
      "application/ld+json",
    )) as { productText?: string };
    const periods = full.productText ? parseZoneSegments(full.productText, zone) : [];
    if (periods.length) return periods;
  }
  throw new Error(`zone ${zone} missing from ${office} CWF`);
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

async function ndbcObservation(station: string): Promise<NdbcObs> {
  const text = await getText(`https://www.ndbc.noaa.gov/data/realtime2/${station}.txt`);
  const row = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith("#"));
  if (!row) throw new Error("no observation rows");
  const cols = row.split(/\s+/);
  const num = (i: number) => {
    const v = cols[i];
    const n = Number(v);
    return v !== "MM" && Number.isFinite(n) ? n : undefined;
  };
  const [yy, mo, dd, hh, mi] = cols.slice(0, 5);
  return {
    observedAt: `${yy}-${mo}-${dd} ${hh}:${mi} UTC`,
    windDirDeg: num(5),
    windKt: num(6) !== undefined ? Math.round(num(6)! * 1.94384) : undefined,
    waveHeightM: num(8),
    domPeriodS: num(9),
    airTempC: num(13),
    waterTempC: num(14),
  };
}

interface TidePoint {
  t: string;
  v: string;
}

async function tidePredictions(station: string): Promise<TidePoint[]> {
  const data = (await getJson(
    `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&station=${station}&datum=mllw&units=metric&time_zone=gmt&interval=30&format=json&range=36`,
    "application/json",
  )) as { predictions?: TidePoint[]; error?: unknown };
  if (!data.predictions) throw new Error("no tide predictions");
  return data.predictions;
}

const SUCCESS_HEADERS = {
  "Cache-Control": "s-maxage=600, stale-while-revalidate=3600",
};

export async function GET(request: Request): Promise<Response> {
  const siteId = new URL(request.url).searchParams.get("site");
  if (!siteId) {
    return Response.json({ error: "missing site" }, { status: 400 });
  }
  const site = siteById(siteId);
  if (!site) {
    return Response.json({ error: "unknown site" }, { status: 404 });
  }

  const cached = cache.get(site.id);
  if (cached && cached.expires > Date.now()) {
    return Response.json(cached.body, { headers: SUCCESS_HEADERS });
  }

  try {
    const sources: string[] = [];
    const [forecast, obs, tides] = await Promise.all([
      site.us
        ? nwsForecast(site.lat, site.lng, site.nwsZone, site.nwsOffice).then(
            (p) => (sources.push("NWS"), p),
            () => undefined,
          )
        : Promise.resolve(undefined),
      site.ndbc
        ? ndbcObservation(site.ndbc).then(
            (o) => (sources.push("NDBC"), o),
            () => undefined,
          )
        : Promise.resolve(undefined),
      site.tides
        ? tidePredictions(site.tides).then(
            (p) => (sources.push("NOAA CO-OPS"), p),
            () => undefined,
          )
        : Promise.resolve(undefined),
    ]);

    const body = {
      site: site.id,
      updatedAt: Date.now(),
      forecast,
      obs,
      tides: tides ? { station: site.tides, points: tides } : undefined,
      sources,
    };

    cache.set(site.id, { expires: Date.now() + FETCH_TTL_MS, body });
    return Response.json(body, { headers: SUCCESS_HEADERS });
  } catch {
    return Response.json({ error: "upstream_unavailable" }, { status: 502 });
  }
}
