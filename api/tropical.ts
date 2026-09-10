const FETCH_TTL_MS = 30 * 60 * 1000;
const NHC_FEED = "https://www.nhc.noaa.gov/index-at.xml";
const USER_AGENT = "DivechainPro/1.0 (https://divechain.pro; ops@divechain.pro)";

interface CacheEntry {
  expires: number;
  body: unknown;
}

let cache: CacheEntry | null = null;

interface OutlookItem {
  title: string;
  summary: string;
  pubDate: string;
}

function decode(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
}

async function fetchOutlook(): Promise<OutlookItem[]> {
  const res = await fetch(NHC_FEED, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`nhc feed -> ${res.status}`);
  const xml = await res.text();
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return items.slice(0, 4).map((block) => ({
    title: tag(block, "title"),
    summary: tag(block, "description").slice(0, 400),
    pubDate: tag(block, "pubDate"),
  }));
}

export default async function handler(): Promise<Response> {
  const headers = {
    "Cache-Control": `public, max-age=0, s-maxage=${FETCH_TTL_MS / 1000}, stale-while-revalidate=3600`,
  };

  if (cache && cache.expires > Date.now()) {
    return Response.json(cache.body, { headers });
  }

  try {
    const items = await fetchOutlook();
    const body = { updatedAt: Date.now(), source: "NOAA NHC", items };
    cache = { expires: Date.now() + FETCH_TTL_MS, body };
    return Response.json(body, { headers });
  } catch {
    return Response.json(
      { updatedAt: Date.now(), source: "NOAA NHC", items: [], available: false },
      { headers },
    );
  }
}
