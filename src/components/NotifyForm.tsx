import { useState } from "react";
import { BellRing, Check } from "lucide-react";

type Status = "idle" | "sending" | "done" | "error";

export default function NotifyForm({ source }: { source: string }) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company, source }),
      });
      setStatus(r.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="glass-card-inner p-4 max-w-sm mx-auto flex items-center gap-3">
        <Check className="w-5 h-5 text-kelp shrink-0" />
        <p className="text-sm text-text-secondary">
          You&apos;re on the list. We&apos;ll email you when watch sync launches.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <form
        onSubmit={handleNotify}
        className="flex flex-col sm:flex-row items-center gap-2 max-w-md mx-auto"
      >
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="absolute -left-[9999px]"
          aria-hidden="true"
        />
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="!py-3 !text-sm"
          disabled={status === "sending"}
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn-primary text-sm w-full sm:w-auto shrink-0"
        >
          <BellRing className="w-4 h-4" />
          {status === "sending" ? "Saving…" : "Notify me"}
        </button>
      </form>
      {status === "error" && (
        <p className="text-xs text-danger mt-2 text-center">
          Couldn&apos;t save that. Try again in a minute.
        </p>
      )}
      <p className="text-[11px] text-text-tertiary mt-3 text-center">
        One email when watch sync launches. Unsubscribe anytime.
      </p>
    </div>
  );
}
