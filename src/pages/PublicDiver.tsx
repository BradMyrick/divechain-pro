import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useNavigate, Link } from "react-router-dom";
import { useReadContract } from "wagmi";
import { useLogbookData } from "../hooks/useLogbook";
import { computeDiverStats, formatMinutes, type NormalizedDive } from "../lib/diverStats";
import { attesterBadge } from "../lib/diverStats";
import { DIVE_LOG_FACTORY_ABI, factoryAddress } from "../lib/factory";
import { resolveEnsLogbook, isEnsName, isAddressRef } from "../lib/ens";
import { useQuery } from "@tanstack/react-query";
import { exportLogbookSheet, exportDiveResume } from "../lib/pdf";
import FlagChip from "../components/FlagChip";
import DiveProfileSketch from "../components/DiveProfileSketch";
import QRCode from "../components/QRCode";
import { DiverDownFlag, AlphaFlag, DivechainMark } from "../components/flags/Flags";
import {
  DIVE_MODE_LABELS, DIVE_PURPOSE_LABELS, BREATHING_GAS_LABELS, depthUnit, DiveMode, DivePurpose, BreathingGas, UnitSystem,
} from "../lib/contracts";
import {
  Anchor, Clock, Waves, ShieldCheck, Loader2, MapPin, ChevronDown, ChevronRight,
  FileDown, UserRound, Copy, Check, AlertTriangle, ExternalLink, Activity,
} from "lucide-react";

const EXPLORERS: Record<number, string> = {
  43113: "https://testnet.snowtrace.io",
  43114: "https://snowtrace.io",
};
const CHAIN_NAMES: Record<number, string> = {
  43113: "Avalanche Fuji",
  43114: "Avalanche C-Chain",
};

interface PublicDiverProps {
  demo?: boolean;
}

export default function PublicDiver({ demo = false }: PublicDiverProps) {
  const { ref = "" } = useParams<{ ref: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const verify = params.get("verify") === "1";
  const directContract = params.get("contract");

  const isAddress = isAddressRef(ref);
  const isName = isEnsName(ref);

  // ENS resolution (name → erc8260 text record → { logbook, chainId })
  const ensQuery = useQuery({
    queryKey: ["ens-logbook", ref],
    queryFn: () => resolveEnsLogbook(ref),
    enabled: !demo && isName,
    staleTime: 60_000,
  });

  const chainParam = Number(params.get("chain"));
  const chainId = demo
    ? 43114
    : ensQuery.data?.chainId
    ?? (chainParam || 43114);

  // Direct contract override beats the registry
  const factory = factoryAddress(chainId);
  const lookupAddress = isAddress ? (ref as `0x${string}`) : undefined;

  // Registry lookup (cross-chain read via wagmi chainId override)
  const { data: factoryLogbook, isLoading: factoryLoading } = useReadContract({
    address: factory,
    abi: DIVE_LOG_FACTORY_ABI,
    functionName: "logbookOf",
    args: [lookupAddress],
    chainId,
    query: { enabled: !demo && !!factory && !!lookupAddress && !ensQuery.isLoading },
  });

  const resolving = !demo && ((isName && ensQuery.isLoading) || (!!lookupAddress && factoryLoading));

  const logbook: `0x${string}` | undefined = demo
    ? ("0x4E1aD5c09b5E6A7f3D2C8b9A0e6D5c4b3A2F1e0D" as `0x${string}`)
    : ensQuery.data?.logbook
    ?? (factoryLogbook && factoryLogbook !== "0x0000000000000000000000000000000000000000"
      ? (factoryLogbook as `0x${string}`)
      : undefined)
    ?? (directContract && directContract.startsWith("0x") && directContract.length === 42
      ? (directContract as `0x${string}`)
      : undefined);

  const data = useLogbookData(demo ? undefined : logbook, { demo });
  const stats = useMemo(() => computeDiverStats(data.dives), [data.dives]);

  // === States: resolving / not found / ready ===
  if (!demo && !isAddress && !isName) {
    return (
      <Center>
        <AlertTriangle className="w-10 h-10 text-warn mx-auto mb-3" />
        <h1 className="text-xl font-bold text-white mb-2">Invalid diver reference</h1>
        <p className="text-sm text-text-secondary mb-6">
          Use a wallet address (0x…) or an ENS name that sets the <code>erc8260</code> text record.
        </p>
        <Link to="/" className="btn-primary">Go home</Link>
      </Center>
    );
  }

  if (resolving) {
    return (
      <Center>
        <Loader2 className="w-8 h-8 text-bismuth/60 mx-auto mb-3 animate-spin" />
        <p className="text-text-secondary">Resolving diver…</p>
      </Center>
    );
  }

  if (!demo && !logbook) {
    return (
      <Center>
        <Anchor className="w-10 h-10 text-bismuth/60 mx-auto mb-3" />
        <h1 className="text-xl font-bold text-white mb-2">No logbook registered</h1>
        <p className="text-sm text-text-secondary mb-6 break-all font-mono text-xs">{ref}</p>
        <p className="text-xs text-text-tertiary max-w-sm mb-6">
          {isName
            ? `The ENS name doesn't set an erc8260 text record, or it points to a chain without a deployed DiveLogFactory.`
            : `This wallet has no registered ERC-8260 logbook on ${CHAIN_NAMES[chainId] ?? `chain ${chainId}`}, they may dive under a different flag elsewhere.`}
        </p>
        <Link to="/" className="btn-primary">Go home</Link>
      </Center>
    );
  }

  const explorer = EXPLORERS[chainId];
  const shareUrl = demo
    ? `${window.location.origin}/demo`
    : `${window.location.origin}/diver/${ref}${params.toString() ? `?${params.toString()}` : ""}`;

  return (
    <div className="max-w-4xl mx-auto animate-rise">
      {/* Demo banner */}
      {demo && (
        <div className="glass-card-inner p-4 mb-4 border-surf/25 flex flex-col sm:flex-row items-center gap-3">
          <DivechainMark className="w-10 h-auto shrink-0" />
          <p className="text-xs text-text-secondary flex-1 text-center sm:text-left">
            <span className="text-surf font-semibold">Demo logbook.</span> Synthetic data, recreational
            and commercial records, a corrected (voided) entry, and buddy attestations. No wallet needed.
          </p>
          <button onClick={() => navigate("/deploy")} className="btn-primary text-sm px-4 py-2 shrink-0">
            Claim yours
          </button>
        </div>
      )}

      {/* ===== Header ===== */}
      <div className="glass-card hairline overflow-hidden mb-4">
        <div className="relative p-5 sm:p-6">
          <div className="god-rays" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="section-title mb-1"><Anchor className="w-3.5 h-3.5" />
                  {verify ? "Diver verification" : "Public dive profile"}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-white break-all">
                  {isName ? ref : `${(ref || "Diver").slice(0, 8)}…`}
                </h1>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <span className="pill">{CHAIN_NAMES[chainId] ?? `Chain ${chainId}`}</span>
                  {isName && logbook && (
                    <span className="pill pill-surf font-mono text-[10px]">{logbook.slice(0, 10)}…</span>
                  )}
                  {explorer && logbook && (
                    <a
                      href={`${explorer}/address/${logbook}`}
                      target="_blank" rel="noopener noreferrer"
                      className="pill hover:brightness-125 no-underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Explorer
                    </a>
                  )}
                  {verify && (
                    <span className="pill pill-kelp">
                      <ShieldCheck className="w-3 h-3" /> Read directly on-chain
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <DiverDownFlag className="w-11 h-auto rounded-sm shadow-md shadow-flag-red/20" />
                <AlphaFlag className="w-11 h-auto shadow-md shadow-alpha-blue/20" />
              </div>
            </div>
            <p className="text-[11px] text-text-tertiary mt-3 max-w-lg">
              Every stat below is read from the diver's sovereign ERC-8260 contract. No login, no
              database, no third party. Attestations are EIP-712 signatures verified by the contract itself.
            </p>
          </div>
        </div>
      </div>

      {/* ===== Stats ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat icon={<Waves className="w-3.5 h-3.5" />} label="Dives" value={String(stats.totalDives)} />
        <Stat icon={<Clock className="w-3.5 h-3.5" />} label="Bottom time" value={formatMinutes(stats.totalBottomMinutes)} />
        <Stat icon={<Activity className="w-3.5 h-3.5" />} label="Deepest" value={`${stats.maxDepth}${depthUnit(stats.maxDepthUnits as UnitSystem)}`} />
        <Stat
          icon={<ShieldCheck className="w-3.5 h-3.5" />}
          label="Attested"
          value={`${Math.round(stats.attestationCoverage * 100)}%`}
          accent={stats.attestationCoverage >= 0.5 ? "kelp" : "gold"}
          sub={`${stats.attestedDives} of ${stats.totalDives} dives`}
        />
      </div>

      {/* ===== Two-flag split ===== */}
      <div className="glass-card hairline p-5 mb-4">
        <div className="section-title"><UserRound className="w-4 h-4" /> Bottom time under two flags</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card-inner p-4 flex items-center gap-3">
            <DiverDownFlag className="w-10 h-auto rounded-sm shrink-0" />
            <div>
              <p className="text-lg font-bold text-white font-display">{formatMinutes(stats.recBottomMinutes)}</p>
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary">Recreational</p>
            </div>
          </div>
          <div className="glass-card-inner p-4 flex items-center gap-3">
            <AlphaFlag className="w-10 h-auto shrink-0" />
            <div>
              <p className="text-lg font-bold text-white font-display">{formatMinutes(stats.commercialBottomMinutes)}</p>
              <p className="text-[10px] uppercase tracking-wider text-text-tertiary">
                Commercial · {stats.ssaDives} surface-supplied
              </p>
            </div>
          </div>
        </div>
        {stats.gasMixes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {stats.gasMixes.map((g) => (
              <span key={g.label} className="pill">{g.label} × {g.count}</span>
            ))}
          </div>
        )}
      </div>

      {/* ===== Share + exports ===== */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 mb-4">
        <div className="glass-card hairline p-5 flex flex-col items-center justify-center">
          <QRCode value={shareUrl} size={150} />
          <p className="text-[10px] text-text-tertiary mt-2 text-center max-w-[160px]">
            Show this to a dive shop or employer, they verify without an account
          </p>
          <CopyUrl url={shareUrl} />
        </div>
        <div className="glass-card hairline p-5">
          <div className="section-title"><FileDown className="w-4 h-4" /> Paperwork</div>
          <p className="text-xs text-text-secondary mb-4 leading-relaxed">
            Generate signed-ready documents from the same on-chain data: a commercial-style logbook
            sheet for job applications and compliance, or a one-page experience summary.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() =>
                exportLogbookSheet(
                  { address: ref || "demo", name: isName ? ref : undefined, chainId, logbook: logbook ?? "" },
                  data.dives, stats,
                )
              }
              className="btn-primary text-sm"
            >
              <FileDown className="w-4 h-4" /> Logbook sheet (PDF)
            </button>
            <button
              onClick={() =>
                exportDiveResume(
                  { address: ref || "demo", name: isName ? ref : undefined, chainId, logbook: logbook ?? "" },
                  stats,
                )
              }
              className="btn-outline text-sm"
            >
              <FileDown className="w-4 h-4" /> Dive resume (PDF)
            </button>
          </div>
        </div>
      </div>

      {/* ===== Dive log ===== */}
      <div className="glass-card hairline p-5 mb-4">
        <div className="section-title"><Anchor className="w-4 h-4" /> Dive log ({stats.totalDives})
          {stats.voidedCount > 0 && (
            <span className="pill ml-2 text-[9px] py-0">+{stats.voidedCount} corrected</span>
          )}
        </div>
        {data.isLoading ? (
          <div className="flex items-center gap-2 text-text-tertiary text-sm py-6 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Reading the chain…
          </div>
        ) : (
          <div className="space-y-2">
            {[...data.dives].reverse().map((d) => (
              <DiveRow key={d.id.toString()} dive={d} demo={demo} chainId={chainId} />
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-text-tertiary text-center pb-4">
        Dive data is public by design. This page is a friendly view over an open blockchain.
        ERC-8260 stores no personal identifying information.
      </p>
    </div>
  );
}

/* ---------------- subcomponents ---------------- */

function Stat({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent?: "kelp" | "gold";
}) {
  return (
    <div className="stat-box">
      <div className="stat-label flex items-center gap-1">{icon} {label}</div>
      <p className={`stat-value ${accent === "kelp" ? "text-kelp" : accent === "gold" ? "text-gold" : "text-surf"}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-text-tertiary">{sub}</p>}
    </div>
  );
}

function CopyUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="btn-ghost text-[11px] mt-2"
    >
      {copied ? <><Check className="w-3 h-3 text-kelp" /> Copied</> : <><Copy className="w-3 h-3" /> Copy link</>}
    </button>
  );
}

function DiveRow({ dive, demo, chainId }: { dive: NormalizedDive; demo: boolean; chainId: number }) {
  const [open, setOpen] = useState(false);
  const isVoided = !!dive.voidInfo?.isVoided;
  const dU = depthUnit(Number(dive.units) as UnitSystem);
  const gasLabel = BREATHING_GAS_LABELS[Number(dive.gas.gasType) as BreathingGas] ?? "Air";

  return (
    <div className={`glass-card-inner overflow-hidden ${isVoided ? "opacity-60" : ""}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors"
      >
        {open ? <ChevronDown className="w-4 h-4 text-text-tertiary shrink-0" /> : <ChevronRight className="w-4 h-4 text-text-tertiary shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">Dive #{dive.id.toString()}</span>
            <FlagChip mode={Number(dive.data.mode)} purpose={Number(dive.data.purpose)} />
            {isVoided && <span className="pill pill-danger text-[9px] py-0">corrected</span>}
            {dive.attestations.length > 0 && (
              <span className="pill pill-kelp text-[9px] py-0">
                <ShieldCheck className="w-3 h-3" /> {dive.attestations.length}
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-tertiary mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{new Date(Number(dive.diveDate) * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            {Boolean(dive.env.location) && (
              <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{dive.env.location}</span>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-medium text-white tabular-nums">
            {Number(dive.data.maxDepth)}{dU} · {Number(dive.data.bottomTimeMinutes)}m
          </p>
          <p className="text-[10px] text-text-tertiary">
            {DIVE_MODE_LABELS[Number(dive.data.mode) as DiveMode]} · {gasLabel}
          </p>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-card-border pt-3">
          <DiveProfileSketch dive={dive} height={180} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <Field label="Purpose" value={DIVE_PURPOSE_LABELS[Number(dive.data.purpose) as DivePurpose] ?? "-"} />
            <Field label="Mode" value={DIVE_MODE_LABELS[Number(dive.data.mode) as DiveMode] ?? "-"} />
            <Field label="Water temp" value={`${Number(dive.env.waterTemp)}°C`} />
            <Field
              label="Deco"
              value={Number(dive.decomp.totalDecompTimeMinutes)
                ? `${Number(dive.decomp.totalDecompTimeMinutes)} min`
                : "None"}
            />
          </div>

          {Boolean(dive.remarks) && (
            <p className="text-xs text-text-secondary leading-relaxed">"{dive.remarks}"</p>
          )}

          {isVoided && dive.voidInfo && (
            <div className="glass-card-inner p-3 border-danger/20 text-[11px] text-text-secondary space-y-1">
              <p className="text-danger font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Voided entry, full audit trail preserved
              </p>
              <p>Reason: {dive.voidInfo.reason}</p>
              {dive.voidInfo.supersededById > 0n && (
                <p>Superseded by dive #{dive.voidInfo.supersededById.toString()}</p>
              )}
            </div>
          )}

          {/* Attestations */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5">
              Buddy attestations ({dive.attestations.length})
            </p>
            {dive.attestations.length === 0 ? (
              <p className="text-[11px] text-text-tertiary">None on this dive.</p>
            ) : (
              <div className="space-y-1">
                {dive.attestations.map((a, i) => (
                  <AttesterRow key={i} attester={a.attester} date={Number(a.attestedAt)} demo={demo} chainId={chainId} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AttesterRow({ attester, date, demo, chainId }: {
  attester: string; date: number; demo: boolean; chainId: number;
}) {
  const badge = attesterBadge(attester, demo);
  const explorer = EXPLORERS[chainId];
  return (
    <div className="glass-card-inner p-2.5 flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-full bg-kelp/10 border border-kelp/20 flex items-center justify-center shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 text-kelp" />
      </div>
      <div className="flex-1 min-w-0">
        {explorer ? (
          <a href={`${explorer}/address/${attester}`} target="_blank" rel="noopener noreferrer"
            className="text-xs font-mono text-white hover:text-surf no-underline">
            {attester.slice(0, 6)}…{attester.slice(-4)}
          </a>
        ) : (
          <span className="text-xs font-mono text-white">{attester.slice(0, 6)}…{attester.slice(-4)}</span>
        )}
        <p className="text-[10px] text-text-tertiary">
          {new Date(date * 1000).toLocaleDateString()}
          {badge && <> · <span className="text-kelp">{badge.label}</span> — {badge.detail}</>}
        </p>
      </div>
      <span className="pill pill-kelp text-[9px] py-0 shrink-0">EIP-712</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card-inner p-2">
      <p className="text-[9px] uppercase tracking-wider text-text-tertiary">{label}</p>
      <p className="text-xs text-white mt-0.5">{value}</p>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="max-w-md mx-auto text-center py-20">{children}</div>;
}
