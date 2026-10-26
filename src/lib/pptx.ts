import "server-only";
import PptxGenJS from "pptxgenjs";
import { formatRand, ORDER_STATUS_LABELS, PAYMENT_METHODS, type PaymentMethod } from "./rules";
import type { platformOverview, shopSummaries } from "./admin";
import type { getCompliance, getFinancials } from "./services";
import type { OrderView } from "./orders";

/*
 * PowerPoint versions of the downloadable reports. Charts are native PowerPoint charts,
 * so a bank officer or judge can click into them, restyle them or copy the numbers out.
 */

const NAVY = "062654";
const PINK = "F2366D";
const MUSTARD = "F4AF23";
const INK = "0B1B3A";
const MUTED = "5B6478";
const BLUSH = "FFF7F9";
const LINE = "F1DCE3";
const OK = "1E8E5A";
const WARN = "D99A00";
const BAD = "D63A2F";
const FONT = "Segoe UI";

export const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

async function logoData(origin: string) {
  try {
    const res = await fetch(new URL("/brand/logo-horizontal.png", origin));
    if (!res.ok) return null;
    return `image/png;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

function deck(title: string) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.author = "SpazaLink";
  pptx.company = "SpazaLink";
  pptx.title = title;
  pptx.defineSlideMaster({
    title: "SPAZA",
    background: { color: BLUSH },
    objects: [
      { rect: { x: 0, y: 7.38, w: 4.44, h: 0.12, fill: { color: NAVY } } },
      { rect: { x: 4.44, y: 7.38, w: 4.45, h: 0.12, fill: { color: PINK } } },
      { rect: { x: 8.89, y: 7.38, w: 4.44, h: 0.12, fill: { color: MUSTARD } } },
    ],
    slideNumber: { x: 12.6, y: 7.0, fontFace: FONT, fontSize: 9, color: MUTED },
  });
  return pptx;
}

function heading(slide: PptxGenJS.Slide, eyebrow: string, title: string) {
  slide.addText(eyebrow.toUpperCase(), { x: 0.6, y: 0.35, w: 10, h: 0.3, fontFace: FONT, fontSize: 11, bold: true, color: PINK, charSpacing: 2 });
  slide.addText(title, { x: 0.6, y: 0.62, w: 12, h: 0.7, fontFace: FONT, fontSize: 28, bold: true, color: NAVY });
}

function titleSlide(pptx: PptxGenJS, logo: string | null, eyebrow: string, title: string, lines: string[]) {
  const s = pptx.addSlide();
  s.background = { color: NAVY };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 7.2, w: 4.44, h: 0.3, fill: { color: NAVY }, line: { color: NAVY } });
  s.addShape(pptx.ShapeType.rect, { x: 4.44, y: 7.2, w: 4.45, h: 0.3, fill: { color: PINK }, line: { color: PINK } });
  s.addShape(pptx.ShapeType.rect, { x: 8.89, y: 7.2, w: 4.44, h: 0.3, fill: { color: MUSTARD }, line: { color: MUSTARD } });
  if (logo) {
    s.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 0.7, w: 3.3, h: 1.1, fill: { color: "FFFFFF" }, line: { color: "FFFFFF" }, rectRadius: 0.15 });
    s.addImage({ data: logo, x: 0.9, y: 0.88, w: 2.9, h: 0.76 });
  }
  s.addText(eyebrow.toUpperCase(), { x: 0.7, y: 3.0, w: 11, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: MUSTARD, charSpacing: 3 });
  s.addText(title, { x: 0.7, y: 3.4, w: 11.5, h: 1.2, fontFace: FONT, fontSize: 44, bold: true, color: "FFFFFF" });
  s.addText(lines.map((t) => ({ text: t, options: { breakLine: true } })), {
    x: 0.7, y: 4.7, w: 11.5, h: 1.8, fontFace: FONT, fontSize: 16, color: "D7DEEC", valign: "top", paraSpaceAfter: 4,
  });
}

/** A row of KPI tiles. */
function tiles(slide: PptxGenJS.Slide, pptx: PptxGenJS, items: { label: string; value: string; sub?: string; color?: string }[], y: number, perRow = 4) {
  const gap = 0.25;
  const w = (12.13 - gap * (perRow - 1)) / perRow;
  items.forEach((t, i) => {
    const x = 0.6 + (i % perRow) * (w + gap);
    const ty = y + Math.floor(i / perRow) * 1.55;
    slide.addShape(pptx.ShapeType.roundRect, { x, y: ty, w, h: 1.35, fill: { color: "FFFFFF" }, line: { color: LINE, width: 1 }, rectRadius: 0.12 });
    slide.addText(t.label.toUpperCase(), { x: x + 0.2, y: ty + 0.12, w: w - 0.4, h: 0.3, fontFace: FONT, fontSize: 9, bold: true, color: MUTED, charSpacing: 1 });
    slide.addText(t.value, { x: x + 0.2, y: ty + 0.42, w: w - 0.4, h: 0.5, fontFace: FONT, fontSize: 22, bold: true, color: t.color ?? NAVY });
    if (t.sub) slide.addText(t.sub, { x: x + 0.2, y: ty + 0.92, w: w - 0.4, h: 0.3, fontFace: FONT, fontSize: 10, color: MUTED });
  });
}

const chartBase = {
  catAxisLabelFontFace: FONT,
  valAxisLabelFontFace: FONT,
  catAxisLabelColor: MUTED,
  valAxisLabelColor: MUTED,
  catAxisLabelFontSize: 10,
  valAxisLabelFontSize: 10,
  valGridLine: { color: LINE, size: 0.75 },
  catGridLine: { style: "none" as const },
  showLegend: false,
  plotArea: { fill: { color: "FFFFFF" } },
};

function table(slide: PptxGenJS.Slide, header: string[], rows: string[][], opts: { x: number; y: number; w: number; colW?: number[] }) {
  slide.addTable(
    [
      header.map((h) => ({ text: h, options: { bold: true, color: "FFFFFF", fill: { color: NAVY }, fontSize: 10 } })),
      ...rows.map((r, i) => r.map((c) => ({ text: c, options: { fontSize: 10, color: INK, fill: { color: i % 2 ? "FFFFFF" : "FCF0F4" } } }))),
    ],
    { x: opts.x, y: opts.y, w: opts.w, colW: opts.colW, fontFace: FONT, border: { type: "solid", color: LINE, pt: 0.5 }, margin: 0.06, autoPage: false },
  );
}

const pct = (r: number | null) => (r === null ? "None yet" : `${Math.round(r * 100)}%`);

// ─── Shop: Financial Health Report ─────────────────────────────────────────────

export async function shopReportPptx(input: {
  origin: string;
  shop: { name: string; ownerName: string; location: string; phone: string; createdAt: Date };
  finance: Awaited<ReturnType<typeof getFinancials>>;
  compliance: Awaited<ReturnType<typeof getCompliance>>;
  recent: OrderView[];
  integrity: string;
  generatedAt: Date;
}) {
  const { shop, finance, compliance, recent, integrity, generatedAt } = input;
  const s = finance.scorecard;
  const pptx = deck(`Financial Health Report: ${shop.name}`);
  const logo = await logoData(input.origin);
  const when = generatedAt.toLocaleDateString("en-ZA", { dateStyle: "long", timeZone: "Africa/Johannesburg" });

  titleSlide(pptx, logo, "Financial Health Report", shop.name, [
    `Owner: ${shop.ownerName}`,
    `${shop.location} · ${shop.phone}`,
    `Trading on SpazaLink since ${shop.createdAt.toLocaleDateString("en-ZA", { dateStyle: "long" })}`,
    `Generated ${when}`,
  ]);

  const health = { Good: OK, Fair: WARN, "At Risk": BAD }[s.creditHealth];
  const sc = pptx.addSlide({ masterName: "SPAZA" });
  heading(sc, "Bank scorecard", "What a lender sees");
  tiles(sc, pptx, [
    { label: "Total money spent", value: formatRand(s.totalSpent), sub: `${s.orderCount} verified orders` },
    { label: "On time payments", value: pct(s.onTimeRate), sub: `${s.paymentsOnTime} of ${s.paymentsSettled} settled` },
    { label: "Average monthly spend", value: formatRand(s.averageMonthlySpend), sub: `${s.activeMonths} active months` },
    { label: "Credit health", value: s.creditHealth, sub: `Score ${s.creditScore} out of 100`, color: health },
    { label: "Bulk savings", value: formatRand(s.totalSaved), sub: "Discounts from verified wholesalers" },
    { label: "Compliance", value: `${compliance.score}% Ready`, sub: `${compliance.documents.length} documents on file` },
  ], 1.6, 3);
  sc.addText(
    "Credit health is an alternative credit score built only from logged trading: on time payments count for 50, months of activity in the last six for 30, and steady monthly spending for 20. Good is 70 and above, Fair is 45 and above.",
    { x: 0.6, y: 5.0, w: 12.1, h: 0.9, fontFace: FONT, fontSize: 12, color: MUTED },
  );

  const ch = pptx.addSlide({ masterName: "SPAZA" });
  heading(ch, "Monthly store spending", "Spend over the last six months");
  ch.addChart(pptx.ChartType.line, [{ name: "Spend", labels: finance.monthly.map((m) => m.month), values: finance.monthly.map((m) => m.total) }], {
    ...chartBase, x: 0.6, y: 1.5, w: 7.6, h: 5.4, chartColors: [NAVY], lineSize: 2, lineDataSymbol: "circle", lineDataSymbolSize: 8,
    valAxisLabelFormatCode: "R #,##0",
  });
  table(ch, ["Month", "Orders", "Spend"], finance.monthly.map((m) => [m.month, String(m.orders), formatRand(m.total)]), { x: 8.5, y: 1.6, w: 4.2, colW: [1.3, 1.0, 1.9] });

  const rec = pptx.addSlide({ masterName: "SPAZA" });
  heading(rec, "Evidence", "Recent verified purchases");
  table(
    rec,
    ["Date", "Order", "Payment", "Status", "Total"],
    recent.slice(0, 8).map((o) => [
      new Date(o.createdAt).toLocaleDateString("en-ZA"),
      o.orderNumber,
      PAYMENT_METHODS[o.paymentMethod as PaymentMethod] ?? o.paymentMethod,
      o.payment?.status === "PAID" ? (o.payment.paidOnTime ? "Paid on time" : "Paid late") : "Pending",
      formatRand(o.total),
    ]),
    { x: 0.6, y: 1.6, w: 12.1, colW: [1.8, 2.6, 2.4, 2.6, 2.7] },
  );
  rec.addText(
    [
      { text: "Compliance documents on file: ", options: { bold: true, color: NAVY } },
      { text: compliance.documents.length ? compliance.documents.map((d) => d.label).join(" · ") : "None uploaded yet", options: { color: INK } },
    ],
    { x: 0.6, y: 5.6, w: 12.1, h: 0.5, fontFace: FONT, fontSize: 12 },
  );
  rec.addText(`Integrity code ${integrity}. Payments shown were processed in sandbox mode.`, {
    x: 0.6, y: 6.2, w: 12.1, h: 0.4, fontFace: FONT, fontSize: 11, bold: true, color: MUTED,
  });

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}

// ─── Admin: Platform report ─────────────────────────────────────────────────────

export async function platformReportPptx(input: {
  origin: string;
  overview: Awaited<ReturnType<typeof platformOverview>>;
  shops: Awaited<ReturnType<typeof shopSummaries>>;
  generatedAt: Date;
}) {
  const { overview: d, shops, generatedAt } = input;
  const k = d.kpis;
  const pptx = deck("SpazaLink Platform Report");
  const logo = await logoData(input.origin);

  titleSlide(pptx, logo, "Platform report", "SpazaLink network", [
    `${k.shops} spaza shops · ${k.ordersTotal} orders · ${formatRand(k.gmvTotal)} in order value`,
    `Generated ${generatedAt.toLocaleDateString("en-ZA", { dateStyle: "long", timeZone: "Africa/Johannesburg" })}`,
    "Payments in this report ran in sandbox mode.",
  ]);

  const kp = pptx.addSlide({ masterName: "SPAZA" });
  heading(kp, "Key figures", "The network at a glance");
  tiles(kp, pptx, [
    { label: "Spaza shops", value: String(k.shops), sub: `${k.activeShops} ordered in the last 30 days` },
    { label: "Order value this month", value: formatRand(k.gmvThisMonth), sub: `${formatRand(k.gmvTotal)} over six months` },
    { label: "Orders this month", value: String(k.ordersThisMonth), sub: `Average order ${formatRand(k.avgOrderValue)}` },
    { label: "Bulk savings for shops", value: formatRand(k.savingsTotal) },
    { label: "Payments on time", value: pct(k.onTimeRate) },
    { label: "Average compliance", value: `${k.avgCompliance}%` },
    { label: "Deliveries in progress", value: String(k.inFlight) },
    { label: "Critical stock lines", value: String(k.redItems), sub: `of ${k.stockItems} shelves`, color: k.redItems ? BAD : NAVY },
  ], 1.6, 4);

  const gr = pptx.addSlide({ masterName: "SPAZA" });
  heading(gr, "Growth", "Order value and orders per month");
  gr.addChart(pptx.ChartType.line, [{ name: "Order value", labels: d.monthly.map((m) => m.month), values: d.monthly.map((m) => m.gmv) }], {
    ...chartBase, x: 0.6, y: 1.5, w: 6.0, h: 5.4, chartColors: [NAVY], lineSize: 2, lineDataSymbol: "circle", valAxisLabelFormatCode: "R #,##0",
    showTitle: true, title: "Order value", titleFontFace: FONT, titleFontSize: 13, titleColor: NAVY,
  });
  gr.addChart(pptx.ChartType.bar, [{ name: "Orders", labels: d.monthly.map((m) => m.month), values: d.monthly.map((m) => m.orders) }], {
    ...chartBase, x: 6.9, y: 1.5, w: 5.8, h: 5.4, barDir: "col", chartColors: [PINK], barGapWidthPct: 60,
    showTitle: true, title: "Orders", titleFontFace: FONT, titleFontSize: 13, titleColor: NAVY, showValue: true, dataLabelColor: INK, dataLabelFontSize: 10,
  });

  const op = pptx.addSlide({ masterName: "SPAZA" });
  heading(op, "Operations", "Deliveries and payments");
  op.addChart(pptx.ChartType.bar, [{ name: "Orders", labels: d.ordersByStatus.map((s) => ORDER_STATUS_LABELS[s.status]), values: d.ordersByStatus.map((s) => s.count) }], {
    ...chartBase, x: 0.6, y: 1.5, w: 6.0, h: 5.4, barDir: "col", chartColors: [NAVY, MUSTARD, PINK, OK], barGapWidthPct: 60,
    showValue: true, dataLabelColor: INK, showTitle: true, title: "Orders by status", titleFontFace: FONT, titleFontSize: 13, titleColor: NAVY,
  });
  op.addChart(pptx.ChartType.doughnut, [{ name: "Order value", labels: d.paymentMix.map((p) => p.method), values: d.paymentMix.map((p) => p.amount) }], {
    x: 6.9, y: 1.5, w: 5.8, h: 5.4, chartColors: [NAVY, PINK, MUSTARD], holeSize: 55, showLegend: true, legendPos: "b", legendFontFace: FONT,
    showPercent: true, dataLabelColor: "FFFFFF", showTitle: true, title: "Order value by payment method", titleFontFace: FONT, titleFontSize: 13, titleColor: NAVY,
  });

  const ca = pptx.addSlide({ masterName: "SPAZA" });
  heading(ca, "Catalogue", "What sells");
  ca.addChart(pptx.ChartType.bar, [{ name: "Order value", labels: [...d.topProducts].reverse().map((p) => p.name), values: [...d.topProducts].reverse().map((p) => p.revenue) }], {
    ...chartBase, x: 0.6, y: 1.5, w: 6.4, h: 5.4, barDir: "bar", chartColors: [NAVY], valAxisLabelFormatCode: "R #,##0",
    showTitle: true, title: "Best selling products", titleFontFace: FONT, titleFontSize: 13, titleColor: NAVY,
  });
  ca.addChart(pptx.ChartType.bar, [{ name: "Order value", labels: [...d.categorySales].reverse().map((c) => c.category), values: [...d.categorySales].reverse().map((c) => c.revenue) }], {
    ...chartBase, x: 7.2, y: 1.5, w: 5.5, h: 5.4, barDir: "bar", chartColors: [PINK], valAxisLabelFormatCode: "R #,##0",
    showTitle: true, title: "Sales by category", titleFontFace: FONT, titleFontSize: 13, titleColor: NAVY,
  });

  const st = pptx.addSlide({ masterName: "SPAZA" });
  // Horizontal PowerPoint bars draw the first category at the bottom, so list shops bottom up.
  const stock = [...d.stockByShop].reverse();
  heading(st, "Shelves", "Stock health in every shop");
  st.addChart(
    pptx.ChartType.bar,
    [
      { name: "Healthy", labels: stock.map((s) => s.shop), values: stock.map((s) => s.green) },
      { name: "Running low", labels: stock.map((s) => s.shop), values: stock.map((s) => s.yellow) },
      { name: "Critical", labels: stock.map((s) => s.shop), values: stock.map((s) => s.red) },
    ],
    { ...chartBase, x: 0.6, y: 1.5, w: 12.1, h: 5.4, barDir: "bar", barGrouping: "stacked", chartColors: [OK, WARN, BAD], showLegend: true, legendPos: "b", legendFontFace: FONT },
  );

  const sh = pptx.addSlide({ masterName: "SPAZA" });
  heading(sh, "Shops", "Every shop and its scores");
  table(
    sh,
    ["Shop", "Owner", "Compliance", "Orders", "Spend", "On time", "Credit health"],
    shops.map((s) => [s.name, s.ownerName, `${s.compliance}%`, String(s.orderCount), formatRand(s.totalSpent), pct(s.onTimeRate), `${s.creditHealth} (${s.creditScore})`]),
    { x: 0.6, y: 1.5, w: 12.1, colW: [2.6, 2.1, 1.3, 1.0, 1.9, 1.2, 2.0] },
  );

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}
