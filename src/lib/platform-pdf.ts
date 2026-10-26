import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import type { platformOverview, shopSummaries } from "./admin";
import { ORDER_STATUS_LABELS } from "./rules";

const NAVY = rgb(0.024, 0.149, 0.329);
const PINK = rgb(0.949, 0.212, 0.427);
const MUSTARD = rgb(0.957, 0.686, 0.137);
const INK = rgb(0.043, 0.106, 0.227);
const MUTED = rgb(0.357, 0.392, 0.471);
const LINE = rgb(0.945, 0.863, 0.89);
const PAPER = rgb(1, 0.969, 0.976);
const OK = rgb(0.118, 0.557, 0.353);
const BAD = rgb(0.839, 0.227, 0.184);

const rand = (n: number) => `R ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
const compact = (n: number) => (n >= 1000 ? `R ${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : `R ${Math.round(n)}`);
/** Standard PDF fonts are WinAnsi only: map odd whitespace and dashes to spaces, anything else exotic to "?". */
const safe = (t: string) =>
  t.replace(/[ -​  ]/g, " ").replace(/[‐-―]/g, " ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");

type Ctx = { page: PDFPage; font: PDFFont; bold: PDFFont };

function text(c: Ctx, t: string, x: number, y: number, size = 10, f?: PDFFont, color: RGB = INK) {
  c.page.drawText(safe(t), { x, y, size, font: f ?? c.font, color });
}

function fit(c: Ctx, t: string, size: number, max: number, f?: PDFFont) {
  let s = safe(t);
  while (s.length > 1 && (f ?? c.font).widthOfTextAtSize(s, size) > max) s = s.slice(0, -1);
  return s === safe(t) ? s : `${s.slice(0, -1)}.`;
}

function header(c: Ctx, logo: PDFImage | null, title: string, sub: string) {
  const { width, height } = c.page.getSize();
  c.page.drawRectangle({ x: 0, y: height - 104, width, height: 104, color: NAVY });
  [NAVY, PINK, MUSTARD].forEach((col, i) => c.page.drawRectangle({ x: (width / 3) * i, y: height - 110, width: width / 3, height: 6, color: col }));
  text(c, title, 44, height - 56, 22, c.bold, rgb(1, 1, 1));
  text(c, sub, 44, height - 78, 10, c.font, rgb(0.84, 0.88, 0.95));
  if (logo) {
    const h = 32;
    const w = (logo.width / logo.height) * h;
    c.page.drawRectangle({ x: width - 44 - w - 20, y: height - 78, width: w + 20, height: h + 18, color: rgb(1, 1, 1) });
    c.page.drawImage(logo, { x: width - 44 - w - 10, y: height - 69, width: w, height: h });
  }
}

function section(c: Ctx, label: string, y: number) {
  text(c, label.toUpperCase(), 44, y, 8, c.bold, PINK);
}

/** Vertical bar chart with value labels and a light grid. */
function bars(c: Ctx, labels: string[], values: number[], colors: RGB[], x: number, y: number, w: number, h: number, fmt: (n: number) => string) {
  c.page.drawRectangle({ x, y, width: w, height: h, color: PAPER });
  const max = Math.max(...values, 1);
  const padB = 26;
  const plotH = h - padB - 18;
  for (let i = 0; i <= 3; i++) {
    const gy = y + padB + (plotH * i) / 3;
    c.page.drawLine({ start: { x: x + 8, y: gy }, end: { x: x + w - 8, y: gy }, thickness: 0.4, color: LINE });
  }
  const slot = (w - 16) / values.length;
  const bw = Math.min(34, slot * 0.6);
  values.forEach((v, i) => {
    const bx = x + 8 + slot * i + (slot - bw) / 2;
    const bh = (plotH * v) / max;
    c.page.drawRectangle({ x: bx, y: y + padB, width: bw, height: Math.max(bh, 0.5), color: colors[i % colors.length] });
    const lbl = fmt(v);
    text(c, lbl, bx + bw / 2 - c.font.widthOfTextAtSize(lbl, 7) / 2, y + padB + bh + 4, 7, c.bold, INK);
    const cat = fit(c, labels[i], 7, slot - 2);
    text(c, cat, bx + bw / 2 - c.font.widthOfTextAtSize(cat, 7) / 2, y + 10, 7, c.font, MUTED);
  });
}

function table(c: Ctx, cols: { label: string; w: number; right?: boolean }[], rows: string[][], x: number, y: number) {
  const totalW = cols.reduce((a, col) => a + col.w, 0);
  c.page.drawRectangle({ x, y: y - 4, width: totalW, height: 18, color: NAVY });
  let cx = x;
  for (const col of cols) {
    const t = col.label.toUpperCase();
    text(c, t, col.right ? cx + col.w - 6 - c.bold.widthOfTextAtSize(t, 7) : cx + 6, y + 2, 7, c.bold, rgb(1, 1, 1));
    cx += col.w;
  }
  let ry = y - 4;
  rows.forEach((r, i) => {
    ry -= 16;
    if (i % 2 === 0) c.page.drawRectangle({ x, y: ry, width: totalW, height: 16, color: PAPER });
    let rx = x;
    r.forEach((cell, j) => {
      const col = cols[j];
      const t = fit(c, cell, 8, col.w - 10);
      text(c, t, col.right ? rx + col.w - 6 - c.font.widthOfTextAtSize(t, 8) : rx + 6, ry + 5, 8);
      rx += col.w;
    });
  });
  return ry;
}

export async function platformReportPdf(input: {
  origin: string;
  overview: Awaited<ReturnType<typeof platformOverview>>;
  shops: Awaited<ReturnType<typeof shopSummaries>>;
  generatedAt: Date;
}) {
  const { overview: d, shops, generatedAt } = input;
  const k = d.kpis;
  const pdf = await PDFDocument.create();
  pdf.setTitle("SpazaLink Platform Report");
  pdf.setAuthor("SpazaLink");
  pdf.setCreationDate(generatedAt);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  try {
    const res = await fetch(new URL("/brand/logo-horizontal.png", input.origin));
    if (res.ok) logo = await pdf.embedPng(new Uint8Array(await res.arrayBuffer()));
  } catch {
    logo = null;
  }
  const stamp = `Generated ${generatedAt.toLocaleString("en-ZA", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Johannesburg" })} · payments in sandbox mode`;

  // Page 1: key figures and charts
  const p1: Ctx = { page: pdf.addPage([595.28, 841.89]), font, bold };
  const H = 841.89;
  header(p1, logo, "Platform report", stamp);
  section(p1, "Key figures", H - 140);
  const tiles: [string, string, string][] = [
    ["Spaza shops", String(k.shops), `${k.activeShops} active in 30 days`],
    ["Order value, 6 months", rand(k.gmvTotal), `${k.ordersTotal} orders`],
    ["This month", rand(k.gmvThisMonth), `${k.ordersThisMonth} orders`],
    ["Bulk savings", rand(k.savingsTotal), "Passed on to shops"],
    ["Payments on time", k.onTimeRate === null ? "None yet" : `${Math.round(k.onTimeRate * 100)}%`, "Settled payments"],
    ["Average compliance", `${k.avgCompliance}%`, "CIPC, BEE, tax, profile"],
    ["In delivery", String(k.inFlight), "Placed, packing or on the road"],
    ["Critical stock", String(k.redItems), `of ${k.stockItems} shelves`],
  ];
  const tw = (595.28 - 88 - 30) / 4;
  tiles.forEach(([label, value, sub], i) => {
    const x = 44 + (i % 4) * (tw + 10);
    const y = H - 222 - Math.floor(i / 4) * 74;
    p1.page.drawRectangle({ x, y, width: tw, height: 64, color: PAPER, borderColor: LINE, borderWidth: 1 });
    text(p1, label.toUpperCase(), x + 9, y + 49, 6.5, bold, MUTED);
    text(p1, fit(p1, value, value.length > 10 ? 12 : 16, tw - 16, bold), x + 9, y + 26, value.length > 10 ? 12 : 16, bold, i === 7 && k.redItems ? BAD : NAVY);
    text(p1, fit(p1, sub, 7, tw - 16), x + 9, y + 10, 7, font, MUTED);
  });

  section(p1, "Order value per month", H - 330);
  bars(p1, d.monthly.map((m) => m.month), d.monthly.map((m) => m.gmv), [NAVY], 44, H - 520, 507, 176, compact);
  section(p1, "Orders by delivery status", H - 552);
  bars(
    p1,
    d.ordersByStatus.map((s) => ORDER_STATUS_LABELS[s.status]),
    d.ordersByStatus.map((s) => s.count),
    [NAVY, MUSTARD, PINK, OK],
    44,
    H - 742,
    245,
    176,
    (n) => String(n),
  );
  text(p1, "NEW SHOPS PER MONTH", 306, H - 552, 8, bold, PINK);
  bars(p1, d.monthly.map((m) => m.month), d.monthly.map((m) => m.newShops), [MUSTARD], 306, H - 742, 245, 176, (n) => String(n));

  // Page 2: tables
  const p2: Ctx = { page: pdf.addPage([595.28, 841.89]), font, bold };
  header(p2, logo, "Shops and catalogue", stamp);
  section(p2, "Best selling products", H - 140);
  let y = table(
    p2,
    [{ label: "Product", w: 330 }, { label: "Units", w: 70, right: true }, { label: "Order value", w: 107, right: true }],
    d.topProducts.map((p) => [p.name, String(p.units), rand(p.revenue)]),
    44,
    H - 160,
  );
  section(p2, "Every shop", y - 26);
  y = table(
    p2,
    [
      { label: "Shop", w: 140 },
      { label: "Compliance", w: 62, right: true },
      { label: "Orders", w: 48, right: true },
      { label: "Spend", w: 90, right: true },
      { label: "On time", w: 52, right: true },
      { label: "Critical", w: 45, right: true },
      { label: "Credit", w: 70 },
    ],
    shops.map((s) => [
      s.name,
      `${s.compliance}%`,
      String(s.orderCount),
      rand(s.totalSpent),
      s.onTimeRate === null ? "None" : `${Math.round(s.onTimeRate * 100)}%`,
      String(s.stock.red),
      `${s.creditHealth} ${s.creditScore}`,
    ]),
    44,
    y - 46,
  );
  section(p2, "Most critical stock", y - 26);
  table(
    p2,
    [{ label: "Shop", w: 190 }, { label: "Item", w: 210 }, { label: "Left", w: 107, right: true }],
    d.lowStock.slice(0, 8).map((s) => [s.shop, s.item, `${s.quantity} of ${s.fullCapacity} (${s.pct}%)`]),
    44,
    y - 46,
  );
  text(p2, "SpazaLink platform report. Figures read live from the SpazaLink database at the time shown above.", 44, 36, 7.5, font, MUTED);

  return Buffer.from(await pdf.save());
}
