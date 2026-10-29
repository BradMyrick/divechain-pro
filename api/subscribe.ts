const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const allowed = (process.env.SUBSCRIBE_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = request.headers.get("origin") ?? "";
  if (allowed.length && !allowed.includes(origin)) {
    return json(403, { ok: false, error: "origin" });
  }

  let body: { email?: string; company?: string; source?: string };
  try {
    body = (await request.json()) as { email?: string; company?: string; source?: string };
  } catch {
    return json(400, { ok: false, error: "bad_json" });
  }

  // Honeypot: real users never fill the hidden "company" field.
  if (body.company) return json(200, { ok: true });

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json(400, { ok: false, error: "invalid_email" });
  }

  const key = process.env.RESEND_API_KEY;
  const segment = process.env.RESEND_SEGMENT_ID;
  if (!key || !segment) {
    return json(500, { ok: false, error: "not_configured" });
  }

  const res = await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      unsubscribed: false,
      segments: [{ id: segment }],
      properties: {
        source: String(body.source ?? "home-watch-sync").slice(0, 64),
      },
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (res.ok) return json(200, { ok: true });

  const text = await res.text();
  // Treat "already exists" as success so re-submits don't show an error.
  if (res.status === 409 || /exist/i.test(text)) {
    return json(200, { ok: true });
  }

  console.error("resend contacts error", res.status, text.slice(0, 300));
  return json(502, { ok: false, error: "upstream" });
}
