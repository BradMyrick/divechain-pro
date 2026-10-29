import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Drawer } from "vaul";
import { useAccount, usePublicClient } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatEther, formatGwei } from "viem";
import {
  Upload, FileJson, Pencil, X, AlertTriangle, CheckCircle2, Loader2,
  ExternalLink, Play, RotateCcw, BookOpen, Ban, ClipboardPaste,
} from "lucide-react";
import { useDiveContract } from "../contexts/DiveContractContext";
import { useLogbookData } from "../hooks/useLogbook";
import { useBatchSend } from "../hooks/useBatchSend";
import { useLocalStorage } from "../hooks/useLocalStorage";
import DiveForm from "../components/DiveForm";
import FlagChip from "../components/FlagChip";
import {
  diveFormToInput,
  diveInputToForm,
  type DiveFormState,
} from "../lib/diveForm";
import {
  DIVE_PURPOSE_LABELS,
  depthUnit,
  UnitSystem,
  SOVEREIGN_DIVE_LOG_ABI,
} from "../lib/contracts";
import {
  parseDiveFile,
  analyzeRows,
  buildChainIndex,
  chunkInputs,
  DIVES_PER_TX,
  type ParsedRow,
  type AnalyzedRow,
  type RowStatus,
} from "../lib/batchImport";
import { useMediaQuery } from "../hooks/useMediaQuery";

const EXPLORERS: Record<number, string> = {
  43113: "https://testnet.snowtrace.io",
  43114: "https://snowtrace.io",
};

const EXAMPLE_BATCH_JSON = [
  {
    date: "2026-07-04",
    units: "imperial",
    mode: "scuba",
    purpose: "recreational",
    suit: "wet",
    maxDepth: 58,
    averageDepth: 32,
    bottomTimeMinutes: 41,
    times: { leftSurface: "09:20", leftBottom: "09:48", reachedSurface: "10:01" },
    gas: { type: "nitrox", o2Percent: 32 },
    environment: { location: "Buccoo Reef, Tobago", latitude: 11.212, longitude: -60.935, waterTemp: 82, bottomType: "coral" },
    remarks: "Turtle at the coral head; 60 ft viz",
  },
  {
    date: "2026-07-05",
    units: "imperial",
    maxDepth: 47,
    bottomTimeMinutes: 36,
    environment: { location: "Mt Irvine Wall, Tobago" },
    surfaceIntervalMinutes: 1290,
    remarks: "Drift dive, mild current",
  },
];

interface ImportDraft {
  fileName: string;
  formatLabel: string;
  notes: string[];
  rows: ParsedRow[];
}

type Filter = "all" | "new" | "problems" | "skipped";

const dayLabel = (unix: number): string =>
  new Date(unix * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });

const fmtGas = (gas: bigint): string => `${(Number(gas) / 1e6).toFixed(2)}M`;
const fmtAvax = (wei: bigint): string => {
  const n = Number(formatEther(wei));
  return n === 0 ? "0" : n.toPrecision(3);
};

export default function ImportDives() {
  const navigate = useNavigate();
  const { address, chain, connector } = useAccount();
  const { hasContract, contractAddress, walletKey, chainId } = useDiveContract();
  const { dives, owner } = useLogbookData(contractAddress);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const publicClient = usePublicClient();
  const { txs, running, send, resume, stop } = useBatchSend(contractAddress, chainId, connector?.id);

  const [draft, setDraft, clearDraft] = useLocalStorage<ImportDraft | null>(
    `divechain-import-draft-${walletKey}`,
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<{ key: string; form: DiveFormState } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const scrolledToProgress = useRef(false);

  // Bring the signing progress into view the moment sending starts — with a
  // long import the panel would otherwise sit below the fold.
  useEffect(() => {
    if (txs.length > 0 && !scrolledToProgress.current) {
      scrolledToProgress.current = true;
      progressRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (txs.length === 0) scrolledToProgress.current = false;
  }, [txs.length]);

  const explorer = chain ? EXPLORERS[chain.id] ?? "" : "";
  const isOwner = !!address && !!owner && address.toLowerCase() === owner.toLowerCase();

  const chainIndex = useMemo(
    () =>
      buildChainIndex(
        dives.map((d) => ({
          id: d.id,
          diveDate: Number(d.diveDate),
          units: Number(d.units),
          bottomTimeMinutes: Number(d.data.bottomTimeMinutes),
          maxDepth: Number(d.data.maxDepth),
        })),
      ),
    [dives],
  );

  const analyzed = useMemo(
    () => analyzeRows(draft?.rows ?? [], chainIndex),
    [draft, chainIndex],
  );

  const counts = useMemo(() => {
    const c: Record<RowStatus, number> = { "new": 0, "on-chain": 0, duplicate: 0, invalid: 0 };
    for (const r of analyzed) c[r.status]++;
    return c;
  }, [analyzed]);

  const readyInputs = useMemo(
    () => analyzed.filter((r) => r.status === "new").map((r) => r.input),
    [analyzed],
  );

  const chunks = useMemo(() => chunkInputs(readyInputs), [readyInputs]);
  const chunkVersion = useMemo(
    () => JSON.stringify(chunks.map((c) => c.length)) + chunks.length,
    [chunks],
  );

  // Estimates for the pre-flight gas panel — a react-query job (pool of 4 so
  // public RPCs are not hammered); failures degrade to "—" per tx and
  // MetaMask still shows the exact fee at signing time.
  const canEstimate = !!publicClient && !!contractAddress && !!address && chunks.length > 0;
  const { data: estData, isLoading: estLoading } = useQuery({
    queryKey: ["importGasEstimates", contractAddress, address, chunkVersion],
    enabled: canEstimate && !running,
    staleTime: Infinity,
    retry: 1,
    queryFn: async (): Promise<{ estimates: bigint[]; gasPrice: bigint | null }> => {
      const client = publicClient;
      const logbook = contractAddress;
      const account = address;
      if (!client || !logbook || !account) throw new Error("not ready");
      let price: bigint | null = null;
      try {
        price = await client.getGasPrice();
      } catch {
        /* gas price unavailable — panel shows per-tx gas only */
      }
      const out: bigint[] = new Array(chunks.length).fill(0n);
      let cursor = 0;
      const worker = async (): Promise<void> => {
        while (cursor < chunks.length) {
          const i = cursor++;
          try {
            out[i] = await client.estimateContractGas({
              address: logbook,
              abi: SOVEREIGN_DIVE_LOG_ABI,
              functionName: "batchLogDives",
              args: [chunks[i]],
              account,
            });
          } catch {
            out[i] = 0n;
          }
        }
      };
      await Promise.all([worker(), worker(), worker(), worker()]);
      return { estimates: out, gasPrice: price };
    },
  });
  const gasEstimates = useMemo(() => estData?.estimates ?? [], [estData]);
  const gasPrice = estData?.gasPrice ?? null;
  const estimating = canEstimate && estLoading;

  const totalGas = useMemo(
    () => gasEstimates.reduce((a, b) => a + b, 0n),
    [gasEstimates],
  );
  const missingEstimates = gasEstimates.length > 0 && gasEstimates.some((g) => g === 0n);

  const allConfirmed = txs.length > 0 && txs.every((t) => t.status === "confirmed");
  const someFailed = txs.some((t) => t.status === "failed" || t.status === "stopped");
  const lastError = useMemo(() => txs.find((x) => x.status === "failed" && x.error)?.error, [txs]);

  const loadText = (text: string, fileName: string): void => {
    try {
      const res = parseDiveFile(text);
      if (res.rows.length === 0) {
        setError("No dive records found in this file.");
        return;
      }
      setDraft({ fileName, formatLabel: res.formatLabel, notes: res.notes, rows: res.rows });
      setError(null);
      setFilter("all");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onFile = (file: File | undefined): void => {
    if (!file) return;
    void file.text().then((t) => loadText(t, file.name));
  };

  const removeRow = (key: string): void => {
    if (!draft) return;
    setDraft({ ...draft, rows: draft.rows.filter((r) => r.key !== key) });
  };

  const saveEdit = (): void => {
    if (!draft || !editing) return;
    setDraft({
      ...draft,
      rows: draft.rows.map((r) =>
        r.key === editing.key ? { ...r, input: diveFormToInput(editing.form), warnings: [] } : r,
      ),
    });
    setEditing(null);
  };

  const visibleRows = useMemo(() => {
    switch (filter) {
      case "new": return analyzed.filter((r) => r.status === "new");
      case "problems": return analyzed.filter((r) => r.status === "invalid");
      case "skipped": return analyzed.filter((r) => r.status === "on-chain" || r.status === "duplicate");
      default: return analyzed;
    }
  }, [analyzed, filter]);

  const downloadExample = (): void => {
    const blob = new Blob([JSON.stringify(EXAMPLE_BATCH_JSON, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "divechain-batch-example.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!hasContract) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="glass-card hairline p-8">
          <BookOpen className="w-12 h-12 text-bismuth/50 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">No logbook found</h2>
          <p className="text-sm text-text-secondary mb-6">Claim your sovereign logbook before importing history.</p>
          <button onClick={() => navigate("/deploy")} className="btn-primary">Claim Logbook</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-rise">
      <div className="mb-6">
        <h1 className="text-3xl font-bold gradient-text">Import dives</h1>
        <p className="text-sm text-text-tertiary mt-1">
          Parse a dive log file, review every entry, then log it on-chain in batches. Nothing leaves your
          browser until you sign.
        </p>
      </div>

      {/* ------------------------------------------------------------- upload */}
      {!draft && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onFile(e.dataTransfer.files?.[0]);
            }}
            className={`glass-card hairline p-10 text-center transition-all cursor-pointer ${dragOver ? "border-surf/50 bg-navy/20" : "hover:border-card-border-bright"}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-bismuth/60 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white">Drop a JSON file here</p>
            <p className="text-xs text-text-tertiary mt-1">or click to browse — parsed locally, in your browser</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json,.txt"
              className="hidden"
              onChange={(e) => { onFile(e.target.files?.[0]); e.currentTarget.value = ""; }}
            />
          </div>

          <div className="text-center">
            <button type="button" onClick={() => setPasteOpen((v) => !v)} className="btn-ghost text-xs">
              <ClipboardPaste className="w-3.5 h-3.5" /> {pasteOpen ? "Hide paste box" : "Or paste JSON"}
            </button>
          </div>

          {pasteOpen && (
            <div className="glass-card hairline p-4 space-y-3">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={6}
                placeholder='[{"date": "2026-07-04", "maxDepth": 58, "bottomTimeMinutes": 41, …}]'
                className="font-mono text-xs"
              />
              <button
                type="button"
                disabled={!pasteText.trim()}
                onClick={() => loadText(pasteText, "pasted.json")}
                className="btn-primary text-sm"
              >
                Parse pasted JSON
              </button>
            </div>
          )}

          {error && (
            <div className="glass-card p-4 flex items-start gap-3 border-danger/30">
              <AlertTriangle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-danger font-semibold">Could not read this file</p>
                <p className="text-xs text-text-secondary mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <FormatHelp onDownloadExample={downloadExample} />
        </div>
      )}

      {/* ------------------------------------------------------------- review */}
      {draft && (
        <div className="space-y-4">
          <div className="glass-card hairline p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileJson className="w-5 h-5 text-surf shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{draft.fileName}</p>
                <p className="text-[11px] text-text-tertiary">
                  {draft.formatLabel} · {draft.rows.length} records · draft saved locally
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { clearDraft(); setError(null); }}
              className="btn-ghost text-xs"
            >
              <X className="w-3.5 h-3.5" /> Start over
            </button>
          </div>

          {draft.notes.map((n) => (
            <p key={n} className="text-xs text-text-tertiary glass-card-inner p-3">{n}</p>
          ))}

          {/* signing progress lives at the top — it must never hide below a
              long import list */}
          <div ref={progressRef}>
            {txs.length > 0 && (
              <ProgressPanel
                txs={txs}
                running={running}
                explorer={explorer}
                allConfirmed={allConfirmed}
                someFailed={someFailed}
                onStop={stop}
                onResume={resume}
                onDone={() => { clearDraft(); navigate("/logbook"); }}
              />
            )}
          </div>

          {/* status summary */}
          <div className="grid grid-cols-4 gap-2">
            <StatusCard label="ready to log" value={counts["new"]} tone="kelp" />
            <StatusCard label="already on-chain" value={counts["on-chain"]} tone="teal" />
            <StatusCard label="duplicates in file" value={counts.duplicate} tone="gold" />
            <StatusCard label="needs fixing" value={counts.invalid} tone="danger" />
          </div>

          {/* filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {([["all", "All"], ["new", "Ready"], ["problems", "Needs fixing"], ["skipped", "Skipped"]] as const).map(([f, label]) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`pill ${filter === f ? "pill-surf" : "pill-teal"} cursor-pointer`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {visibleRows.map((row) => (
              <RowCard
                key={row.key}
                row={row}
                onEdit={() => setEditing({ key: row.key, form: diveInputToForm(row.input) })}
                onRemove={() => removeRow(row.key)}
              />
            ))}
            {visibleRows.length === 0 && (
              <p className="text-center text-sm text-text-tertiary py-8">Nothing in this view.</p>
            )}
          </div>

          {/* ------------------------------------------------- pre-flight bar */}
          <div className="glass-card hairline p-5 space-y-4 sticky bottom-3 z-20">
            {!running && lastError && (
              <p className="text-xs text-danger flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {lastError}
              </p>
            )}
            {counts.invalid > 0 && (
              <p className="text-xs text-warn flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {counts.invalid} record{counts.invalid === 1 ? "" : "s"} still need fixing before they can be logged.
              </p>
            )}
            {!isOwner && (
              <p className="text-xs text-warn flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                The connected wallet is not the owner of this logbook — only the owner can log dives.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-text-secondary">
                <span className="text-white font-semibold tabular-nums">{readyInputs.length}</span> dives ready ·{" "}
                <span className="text-white font-semibold tabular-nums">{chunks.length}</span> transaction{chunks.length === 1 ? "" : "s"}
                {" "}({DIVES_PER_TX} per tx)
                {gasPrice !== null && totalGas > 0n && (
                  <> · <span className="text-white font-semibold tabular-nums">{fmtAvax(totalGas * gasPrice)}</span> AVAX
                    {" "}@ {formatGwei(gasPrice)} gwei</>
                )}
                {estimating && <Loader2 className="w-3 h-3 animate-spin inline ml-1.5" />}
                {missingEstimates && !estimating && (
                  <span className="text-text-tertiary"> · some estimates unavailable; MetaMask shows exact fees</span>
                )}
              </div>
              <button
                type="button"
                disabled={readyInputs.length === 0 || !isOwner || running || allConfirmed}
                onClick={() => setConfirmOpen(true)}
                className="btn-primary text-sm"
              >
                <Play className="w-4 h-4" /> Batch Log Dives
              </button>
            </div>
          </div>

          {/* -------------------------------------------------- send progress now lives at the top, right under the file banner */}

          <FormatHelp onDownloadExample={downloadExample} />
        </div>
      )}

      {/* --------------------------------------------------------- edit modal */}
      <Drawer.Root open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }} direction={isDesktop ? "right" : "bottom"}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
          <Drawer.Content
            className={`fixed z-50 bg-card border-card-border outline-none ${
              isDesktop
                ? "right-0 top-0 bottom-0 w-[min(720px,80vw)] border-l rounded-l-2xl"
                : "left-0 right-0 bottom-0 max-h-[92dvh] border-t rounded-t-2xl"
            }`}
          >
            <Drawer.Title className="sr-only">Edit dive</Drawer.Title>
            <div className={isDesktop ? "h-full overflow-y-auto custom-scrollbar p-6" : "max-h-[84dvh] overflow-y-auto custom-scrollbar p-4 pb-8"}>
              {!isDesktop && <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-card-border-bright shrink-0" title="Drag to close" />}
              {editing && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Edit dive</h3>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setEditing(null)} className="btn-ghost text-xs">Cancel</button>
                      <button type="button" onClick={saveEdit} className="btn-primary text-xs">Save changes</button>
                    </div>
                  </div>
                  <DiveForm value={editing.form} onChange={(form) => setEditing({ key: editing.key, form })} />
                  <button type="button" onClick={saveEdit} className="btn-primary w-full text-sm mt-5">Save changes</button>
                </>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* ------------------------------------------------------ confirm modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setConfirmOpen(false)}>
          <div className="glass-card hairline p-6 w-full max-w-md space-y-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">Sign {chunks.length} transaction{chunks.length === 1 ? "" : "s"}?</h3>
            <p className="text-sm text-text-secondary">
              MetaMask will ask you to sign <span className="text-white font-semibold">{chunks.length}</span>{" "}
              transaction{chunks.length === 1 ? "" : "s"}, one at a time. Each logs up to {DIVES_PER_TX} dives
              permanently — records can never be edited or deleted after this.
            </p>
            <p className="text-[11px] text-text-tertiary">
              Signing with <span className="text-text-secondary font-medium">{connector?.name ?? connector?.id ?? "your connected wallet"}</span>
              {chain ? <> on <span className="text-text-secondary font-medium">{chain.name}</span></> : null}
              {" "}— if the prompt does not appear, check the wallet extension icon for a pending request.
            </p>
            <div className="glass-card-inner p-3 space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
              {chunks.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">
                    Tx {i + 1} · {c.length} dive{c.length === 1 ? "" : "s"}
                  </span>
                  <span className="text-text-tertiary tabular-nums">
                    {gasEstimates[i] ? `${fmtGas(gasEstimates[i])} gas` : "—"}
                  </span>
                </div>
              ))}
            </div>
            {gasPrice !== null && totalGas > 0n && (
              <p className="text-xs text-text-tertiary">
                Estimated total: <span className="text-white font-semibold">{fmtGas(totalGas)} gas</span> ≈{" "}
                <span className="text-white font-semibold">{fmtAvax(totalGas * gasPrice)} AVAX</span> at the current
                gas price. MetaMask shows the exact fee per signature.
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} className="btn-ghost flex-1 text-sm">Not yet</button>
              <button
                type="button"
                onClick={() => { setConfirmOpen(false); send(chunks); }}
                className="btn-primary flex-1 text-sm"
              >
                Start signing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function StatusCard({ label, value, tone }: { label: string; value: number; tone: "kelp" | "teal" | "gold" | "danger" }) {
  const color = { kelp: "text-kelp", teal: "text-surf", gold: "text-gold", danger: "text-danger" }[tone];
  return (
    <div className="stat-box px-3 py-2.5 !rounded-lg">
      <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="stat-label !text-[9px] mt-0.5">{label}</p>
    </div>
  );
}

function RowCard({ row, onEdit, onRemove }: { row: AnalyzedRow; onEdit: () => void; onRemove: () => void }) {
  const d = row.input;
  const dU = depthUnit(Number(d.units) as UnitSystem);
  const statusChip = {
    "new": <span className="pill pill-kelp">ready</span>,
    "on-chain": (
      <Link to={`/logbook/${row.matchedDiveId?.toString() ?? ""}`} className="pill pill-teal no-underline hover:text-white">
        on-chain #{row.matchedDiveId?.toString()} <ChevronHint />
      </Link>
    ),
    duplicate: <span className="pill pill-warn">duplicate</span>,
    invalid: <span className="pill pill-danger">needs fixing</span>,
  }[row.status];

  return (
    <div className={`glass-card p-3.5 ${row.status === "invalid" ? "border-danger/30" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">#{row.sourceIndex}</span>
            <span className="text-xs text-text-secondary">{dayLabel(d.diveDate)}</span>
            <FlagChip mode={Number(d.data.mode)} purpose={Number(d.data.purpose)} />
            {statusChip}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs mt-1.5">
            <span className="text-white font-medium tabular-nums">{Number(d.data.maxDepth)}{dU} max</span>
            <span className="text-text-tertiary tabular-nums">{Number(d.data.bottomTimeMinutes)} min BT</span>
            <span className="text-text-tertiary">{DIVE_PURPOSE_LABELS[Number(d.data.purpose)] ?? "—"}</span>
            {Boolean(d.env.location) && (
              <span className="text-text-tertiary truncate max-w-[240px]">{d.env.location}</span>
            )}
          </div>
          {row.status === "invalid" && (
            <ul className="mt-2 space-y-0.5">
              {row.issues.map((issue) => (
                <li key={issue} className="text-[11px] text-danger flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {issue}
                </li>
              ))}
            </ul>
          )}
          {row.warnings.length > 0 && row.status !== "invalid" && (
            <p className="text-[11px] text-warn mt-1.5">{row.warnings.join(" · ")}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onEdit} className="btn-ghost !px-2 !py-1.5" title="Edit this dive">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onRemove} className="btn-ghost !px-2 !py-1.5" title="Remove from this import">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronHint() {
  return <ExternalLink className="w-2.5 h-2.5 inline ml-0.5 opacity-60" />;
}

function ProgressPanel({
  txs, running, explorer, allConfirmed, someFailed, onStop, onResume, onDone,
}: {
  txs: { index: number; diveCount: number; status: string; hash?: `0x${string}`; error?: string; stalled?: boolean }[];
  running: boolean;
  explorer: string;
  allConfirmed: boolean;
  someFailed: boolean;
  onStop: () => void;
  onResume: () => void;
  onDone: () => void;
}) {
  const confirmedDives = txs.filter((t) => t.status === "confirmed").reduce((a, t) => a + t.diveCount, 0);
  const stalled = txs.find((t) => t.stalled && (t.status === "signing" || t.status === "sent"));

  return (
    <div className="glass-card hairline p-5 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          {allConfirmed ? <CheckCircle2 className="w-4 h-4 text-kelp" /> : <Loader2 className={`w-4 h-4 text-surf ${running ? "animate-spin" : ""}`} />}
          {allConfirmed ? "All done" : running ? "Signing — confirm each in your wallet" : "Paused"}
        </h3>
        <div className="flex items-center gap-2">
          {running && (
            <button type="button" onClick={onStop} className="btn-ghost text-xs">
              <Ban className="w-3.5 h-3.5" /> Stop after this tx
            </button>
          )}
          {!running && someFailed && !allConfirmed && (
            <button type="button" onClick={onResume} className="btn-primary text-xs">
              <RotateCcw className="w-3.5 h-3.5" /> Resume
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-text-secondary">
        <span className="text-white font-semibold tabular-nums">{confirmedDives}</span> dives logged permanently
        {" "}· <span className="tabular-nums">{txs.filter((t) => t.status === "confirmed").length}/{txs.length}</span> transactions confirmed
      </p>

      <div className="space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar">
        {txs.map((t) => (
          <div key={t.index} className="flex items-center justify-between gap-3 text-xs glass-card-inner p-2.5">
            <span className="flex items-center gap-2 text-text-secondary min-w-0">
              <TxIcon status={t.status} stalled={t.stalled} />
              Tx {t.index + 1} · {t.diveCount} dive{t.diveCount === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-2 shrink-0">
              {t.hash && explorer && (
                <a href={`${explorer}/tx/${t.hash}`} target="_blank" rel="noopener noreferrer" className="text-surf hover:underline inline-flex items-center gap-0.5">
                  view <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <StatusLabel status={t.status} stalled={t.stalled} />
            </span>
          </div>
        ))}
      </div>

      {stalled?.error && (
        <p className="text-xs text-warn flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {stalled.error}
        </p>
      )}
      {txs.some((t) => t.status === "failed" && t.error) && (
        <p className="text-xs text-danger">{txs.find((t) => t.status === "failed")?.error}</p>
      )}

      {allConfirmed && (
        <div className="glass-card-inner p-4 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-kelp mx-auto" />
          <p className="text-sm text-kelp font-semibold">Every dive in this import is now permanent.</p>
          <button type="button" onClick={onDone} className="btn-primary text-sm">
            <BookOpen className="w-4 h-4" /> Clear draft &amp; view logbook
          </button>
        </div>
      )}
    </div>
  );
}

function TxIcon({ status, stalled }: { status: string; stalled?: boolean }) {
  if (status === "confirmed") return <CheckCircle2 className="w-3.5 h-3.5 text-kelp shrink-0" />;
  if (status === "failed") return <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0" />;
  if (stalled) return <AlertTriangle className="w-3.5 h-3.5 text-warn shrink-0 animate-pulse" />;
  if (status === "signing" || status === "sent") return <Loader2 className="w-3.5 h-3.5 text-surf animate-spin shrink-0" />;
  return <span className="w-3.5 h-3.5 rounded-full border border-card-border-bright shrink-0 inline-block" />;
}

function StatusLabel({ status, stalled }: { status: string; stalled?: boolean }) {
  const map: Record<string, { label: string; cls: string }> = {
    queued: { label: "queued", cls: "text-text-tertiary" },
    signing: { label: "signing…", cls: "text-surf" },
    sent: { label: "confirming…", cls: "text-surf" },
    confirmed: { label: "confirmed", cls: "text-kelp" },
    failed: { label: "failed", cls: "text-danger" },
    stopped: { label: "stopped", cls: "text-warn" },
  };
  const s = stalled ? { label: "waiting for wallet…", cls: "text-warn" } : map[status] ?? map.queued;
  return <span className={`${s.cls} font-medium`}>{s.label}</span>;
}

function FormatHelp({ onDownloadExample }: { onDownloadExample: () => void }) {
  return (
    <details className="glass-card hairline p-4">
      <summary className="text-xs text-text-secondary cursor-pointer select-none font-semibold uppercase tracking-wider">
        Format help — the Divechain Batch JSON standard
      </summary>
      <div className="mt-3 space-y-3 text-xs text-text-secondary">
        <p>
          The importer auto-detects formats: the Divechain Batch JSON standard, commercial repair logs
          (<span className="font-mono">commercial_dive_logs</span>), and best-effort mapping of generic JSON
          (aliases like <span className="font-mono">dive_date</span>, <span className="font-mono">max_depth</span>,{" "}
          <span className="font-mono">duration</span>). Anything it cannot map confidently is flagged for you to
          complete by hand — nothing is guessed silently.
        </p>
        <pre className="glass-card-inner p-3 overflow-x-auto custom-scrollbar text-[10px] leading-relaxed">{`[
  {
    "date": "2026-07-04",             // required, YYYY-MM-DD
    "units": "imperial",              // imperial | metric
    "mode": "scuba",                  // ssa | scuba
    "purpose": "recreational",        // training, inspection, repair, search,
                                      // salvage, recovery, construction, research,
                                      // eod, security, photographic, other
    "suit": "wet",                    // wet | dry | hot-water | swim
    "maxDepth": 58,                   // required, in the units above
    "averageDepth": 32,               // optional, defaults to maxDepth
    "bottomTimeMinutes": 41,          // required
    "times": {                        // optional; "HH:mm" is UTC on the dive date
      "leftSurface": "09:20",
      "leftBottom": "09:48",
      "reachedSurface": "10:01"
    },
    "gas": { "type": "nitrox", "o2Percent": 32 },
    "deco": { "type": "standard", "totalMinutes": 6, "tableSchedule": "60/120" },
    "environment": {
      "location": "Buccoo Reef, Tobago",
      "latitude": 11.212, "longitude": -60.935,
      "waterTemp": 82, "bottomType": "coral"
    },
    "surfaceIntervalMinutes": 1290,
    "remarks": "Turtle at the coral head"
  }
]`}</pre>
        <p className="text-text-tertiary">
          Enum names, not numbers. Depths and temps follow <span className="font-mono">units</span>. Dates are
          stored at noon UTC so they read as the same calendar day everywhere. Every field except date, max
          depth and bottom time is optional.
        </p>
        <button type="button" onClick={onDownloadExample} className="btn-ghost text-xs">
          <FileJson className="w-3.5 h-3.5" /> Download example file
        </button>
        <p className="text-text-tertiary">
          Dive-computer exports (UDDF, Shearwater, Suunto) are on the roadmap — for now, convert to this
          format or paste any JSON and fix what the mapper flags.
        </p>
      </div>
    </details>
  );
}
