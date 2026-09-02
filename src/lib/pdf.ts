import type { DiverStats, NormalizedDive } from "./diverStats";
import { formatMinutes, isCommercialDive } from "./diverStats";
import {
  DIVE_PURPOSE_LABELS, DIVE_MODE_LABELS, BREATHING_GAS_LABELS, depthUnit,
  DivePurpose, DiveMode, BreathingGas, UnitSystem,
} from "./contracts";

export interface PdfDiver {
  address: string;
  name?: string;
  chainId: number;
  logbook: string;
}

function fmtDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function gasDisplay(d: NormalizedDive): string {
  const label = BREATHING_GAS_LABELS[Number(d.gas.gasType) as BreathingGas] ?? "Air";
  const o2 = Math.round(Number(d.gas.o2Percent) / 100);
  const he = Math.round(Number(d.gas.hePercent) / 100);
  if (label === "Nitrox") return `Nitrox ${o2}%`;
  if (label === "Trimix") return `TMX ${o2}/${he}`;
  return label;
}

/** Commercial-style dive logbook sheet: one row per dive, print-friendly. */
export async function exportLogbookSheet(diver: PdfDiver, dives: NormalizedDive[], stats: DiverStats) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const M = 14;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = M;

  const header = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("DIVE LOGBOOK SHEET", M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`ERC-8260 · SovereignDiveLog · ${diver.logbook}`, M, y + 6);
    doc.text(
      `Diver: ${diver.name ?? diver.address} · Chain ID ${diver.chainId} · Generated ${new Date().toLocaleDateString()}`,
      M, y + 11,
    );
    y += 18;
  };

  const columns = [
    { title: "#", w: 10 },
    { title: "Date", w: 24 },
    { title: "Location", w: 52 },
    { title: "Mode", w: 14 },
    { title: "Purpose", w: 26 },
    { title: "Depth", w: 14 },
    { title: "BT", w: 10 },
    { title: "Deco", w: 12 },
    { title: "Gas", w: 20 },
    { title: "Attd", w: 10 },
  ];

  const row = (cells: string[], bold = false) => {
    if (y > pageH - 20) {
      doc.addPage();
      y = M;
      header();
      row(columns.map((c) => c.title), true);
    }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(8);
    let x = M;
    for (let i = 0; i < cells.length; i++) {
      doc.text(String(cells[i]).slice(0, 40), x, y);
      x += columns[i].w;
    }
    doc.setDrawColor(200);
    doc.line(M, y + 1.5, pageW - M, y + 1.5);
    y += 6;
  };

  header();
  doc.setFillColor(240, 240, 240);
  doc.rect(M, y - 4, pageW - M * 2, 7, "F");
  row(columns.map((c) => c.title), true);

  const active = dives.filter((d) => !d.voidInfo?.isVoided).sort((a, b) => Number(b.diveDate) - Number(a.diveDate));
  for (const d of active) {
    row([
      String(d.id),
      fmtDate(Number(d.diveDate)),
      String(d.env.location || "—"),
      DIVE_MODE_LABELS[Number(d.data.mode) as DiveMode] ?? "-",
      DIVE_PURPOSE_LABELS[Number(d.data.purpose) as DivePurpose] ?? "-",
      `${Number(d.data.maxDepth)}${depthUnit(Number(d.units) as UnitSystem)}`,
      String(Number(d.data.bottomTimeMinutes)),
      Number(d.decomp.totalDecompTimeMinutes) ? `${Number(d.decomp.totalDecompTimeMinutes)}m` : "—",
      gasDisplay(d),
      String(d.attestations.length),
    ]);
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(
    `Totals — ${stats.totalDives} dives · ${formatMinutes(stats.totalBottomMinutes)} bottom time · ` +
    `deepest ${stats.maxDepth}${depthUnit(stats.maxDepthUnits as UnitSystem)} · ` +
    `${Math.round(stats.attestationCoverage * 100)}% attested`,
    M, y,
  );

  doc.save(`divechain-logbook-${diver.address.slice(0, 8)}.pdf`);
}

/** One-page dive resume: career summary for employers / dive shops. */
export async function exportDiveResume(diver: PdfDiver, stats: DiverStats) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const M = 18;
  const W = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("DIVE EXPERIENCE SUMMARY", M, 24);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Verified on-chain via ERC-8260 · ${diver.logbook}`, M, 32);
  if (diver.name) doc.text(`Diver: ${diver.name}`, M, 38);

  doc.setDrawColor(34, 211, 238);
  doc.setLineWidth(0.8);
  doc.line(M, 43, W - M, 43);

  const stat = (label: string, value: string, x: number, yy: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(label.toUpperCase(), x, yy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(20);
    doc.text(value, x, yy + 8);
    doc.setTextColor(0);
  };

  const top = 58;
  stat("Total dives", String(stats.totalDives), M, top);
  stat("Bottom time", formatMinutes(stats.totalBottomMinutes), M + 45, top);
  stat("Deepest dive", `${stats.maxDepth}${depthUnit(stats.maxDepthUnits as UnitSystem)}`, M + 105, top);
  stat("Attested", `${Math.round(stats.attestationCoverage * 100)}%`, M + 155, top);

  const top2 = 82;
  stat("Recreational", formatMinutes(stats.recBottomMinutes), M, top2);
  stat("Commercial / SSA", formatMinutes(stats.commercialBottomMinutes), M + 55, top2);
  stat("Surface-supplied dives", String(stats.ssaDives), M + 120, top2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("Gas experience: " + stats.gasMixes.map((g) => `${g.label} (${g.count})`).join(" · "), M, 106);
  if (stats.firstDiveDate) {
    doc.text(
      `Range: ${fmtDate(stats.firstDiveDate)} – ${stats.latestDiveDate ? fmtDate(stats.latestDiveDate) : "present"}`,
      M, 112,
    );
  }
  doc.setTextColor(0);
  doc.setFontSize(8);
  doc.text(
    "Buddy attestations are EIP-712 signatures recovered on-chain; verification requires no login " +
    "or trusted third party. Voided entries remain visible with their full audit trail.",
    M, 126, { maxWidth: W - M * 2 },
  );

  doc.save(`divechain-resume-${diver.address.slice(0, 8)}.pdf`);
}

export { isCommercialDive };
