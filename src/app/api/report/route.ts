import { createHmac } from "node:crypto";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { withShop } from "@/lib/api";
import { listOrders } from "@/lib/orders";
import { getCompliance, getFinancials, getShop } from "@/lib/services";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/rules";
import { download } from "@/lib/download";
import { PPTX_MIME, shopReportPptx } from "@/lib/pptx";

// SpazaLink palette: navy, pink and mustard on blush paper.
const INK = rgb(0.043, 0.106, 0.227);
const BRAND = rgb(0.024, 0.149, 0.329);
const PINK = rgb(0.949, 0.212, 0.427);
const MUSTARD = rgb(0.957, 0.686, 0.137);
const MUTED = rgb(0.357, 0.392, 0.471);
const LINE = rgb(0.945, 0.863, 0.89);
const PAPER = rgb(1, 0.969, 0.976);
const HEALTH_COLOURS = { Good: rgb(0.09, 0.55, 0.32), Fair: rgb(0.85, 0.55, 0.0), "At Risk": rgb(0.77, 0.2, 0.15) };

// pdf-lib standard fonts are WinAnsi-only, so format money without locale-specific spaces.
const rand = (n: number) =>
  `R ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

export const GET = withShop(async (req, ctx) => {
  const [shop, finance, compliance, recent] = await Promise.all([
    getShop(ctx),
    getFinancials(ctx),
    getCompliance(ctx),
    listOrders(ctx, { limit: 8 }),
  ]);
  const generatedAt = new Date();
  const s = finance.scorecard;

  // Integrity code: an HMAC over the report's figures so a lender can spot a doctored copy.
  const integrity = createHmac("sha256", process.env.REPORT_SIGNING_SECRET!)
    .update(JSON.stringify({ shop: shop._id, s, m: finance.monthly, t: generatedAt.toISOString() }))
    .digest("hex")
    .slice(0, 20)
    .toUpperCase()
    .replace(/(.{4})(?!$)/g, "$1 ");
  const baseName = `Financial_Health_Report_${shop.name.replace(/[^\w]+/g, "_")}`;

  // Same figures, two formats: ?format=pptx gives native PowerPoint slides, anything else the PDF.
  if (req.nextUrl.searchParams.get("format") === "pptx") {
    const deck = await shopReportPptx({ origin: req.nextUrl.origin, shop, finance, compliance, recent, integrity, generatedAt });
    return download(deck, `${baseName}.pptx`, PPTX_MIME);
  }

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Financial Health Report: ${shop.name}`);
  pdf.setAuthor("SpazaLink");
  pdf.setCreationDate(generatedAt);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const M = 44;
  // Spaces for odd whitespace and dashes (the app avoids dashes), "?" for anything outside Latin 1 (e.g. emoji).
  const text = (t: string, x: number, y: number, size = 10, f: PDFFont = font, color = INK) =>
    page.drawText(
      t.replace(/[ -​  ]/g, " ").replace(/[‐-―-]/g, " ").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?"),
      { x, y, size, font: f, color },
    );

  // Header band: navy, the logo on a white tile, and the three brand colours beneath.
  page.drawRectangle({ x: 0, y: height - 118, width, height: 118, color: BRAND });
  for (const [i, colour] of [BRAND, PINK, MUSTARD].entries()) {
    page.drawRectangle({ x: (width / 3) * i, y: height - 124, width: width / 3, height: 6, color: colour });
  }
  text("Financial Health Report", M, height - 62, 24, bold, rgb(1, 1, 1));
  text("Verified trading history for lending assessment", M, height - 82, 10, font, rgb(0.84, 0.88, 0.95));
  const stamp = `Generated ${generatedAt.toLocaleString("en-ZA", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Johannesburg" })}`;
  text(stamp, M, height - 100, 9, font, rgb(0.98, 0.75, 0.82));
  const logo = await loadLogo(pdf, req.nextUrl.origin);
  if (logo) {
    const h = 34;
    const w = (logo.width / logo.height) * h;
    page.drawRectangle({ x: width - M - w - 20, y: height - 86, width: w + 20, height: h + 20, color: rgb(1, 1, 1) });
    page.drawImage(logo, { x: width - M - w - 10, y: height - 76, width: w, height: h });
  }

  // Shop details
  let y = height - 160;
  text("BUSINESS", M, y, 8, bold, MUTED);
  y -= 18;
  text(shop.name, M, y, 16, bold);
  y -= 16;
  text(`Owner: ${shop.ownerName}   |   ${shop.location}   |   ${shop.phone}`, M, y, 10, font, MUTED);
  y -= 14;
  text(
    `Trading on SpazaLink since ${shop.createdAt.toLocaleDateString("en-ZA", { dateStyle: "long" })}   |   Compliance ${compliance.score}% ready`,
    M,
    y,
    10,
    font,
    MUTED,
  );

  // Scorecard tiles
  y -= 30;
  const tiles: [string, string, string][] = [
    ["Total money spent", rand(s.totalSpent), `${s.orderCount} orders`],
    ["On time payments", s.onTimeRate === null ? "n/a" : `${Math.round(s.onTimeRate * 100)}%`, `${s.paymentsOnTime} of ${s.paymentsSettled} settled`],
    ["Avg monthly spend", rand(s.averageMonthlySpend), `${s.activeMonths} active months`],
    ["Credit health", s.creditHealth, `Score ${s.creditScore}/100`],
  ];
  const gap = 10;
  const tileW = (width - 2 * M - gap * 3) / 4;
  tiles.forEach(([label, value, sub], i) => {
    const x = M + i * (tileW + gap);
    page.drawRectangle({ x, y: y - 64, width: tileW, height: 64, color: PAPER, borderColor: LINE, borderWidth: 1 });
    text(label.toUpperCase(), x + 10, y - 16, 7, bold, MUTED);
    const colour = i === 3 ? HEALTH_COLOURS[s.creditHealth] : INK;
    text(value, x + 10, y - 38, value.length > 11 ? 12 : 15, bold, colour);
    text(sub, x + 10, y - 54, 8, font, MUTED);
  });

  // Monthly spend chart
  y -= 100;
  text("MONTHLY SPEND (LAST 6 MONTHS)", M, y, 8, bold, MUTED);
  y -= 12;
  drawChart(page, font, finance.monthly, M, y - 150, width - 2 * M, 150);
  y -= 172;

  // Monthly table
  const cols = [M, M + 150, M + 260, M + 380];
  text("Month", cols[0], y, 9, bold);
  text("Orders", cols[1], y, 9, bold);
  text("Spend", cols[2], y, 9, bold);
  text("Share of period", cols[3], y, 9, bold);
  y -= 6;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.8, color: LINE });
  const periodTotal = finance.monthly.reduce((a, m) => a + m.total, 0) || 1;
  for (const m of finance.monthly) {
    y -= 15;
    text(m.month, cols[0], y, 9);
    text(String(m.orders), cols[1], y, 9);
    text(rand(m.total), cols[2], y, 9);
    const share = m.total / periodTotal;
    page.drawRectangle({ x: cols[3], y: y - 1, width: 120 * share, height: 8, color: PINK });
    text(`${Math.round(share * 100)}%`, cols[3] + 126, y, 8, font, MUTED);
  }

  // Recent orders
  y -= 30;
  text("RECENT VERIFIED PURCHASES", M, y, 8, bold, MUTED);
  y -= 6;
  page.drawLine({ start: { x: M, y }, end: { x: width - M, y }, thickness: 0.8, color: LINE });
  for (const o of recent.slice(0, 6)) {
    y -= 15;
    text(new Date(o.createdAt).toLocaleDateString("en-ZA"), cols[0], y, 9);
    text(o.orderNumber, cols[1] - 40, y, 9, font, MUTED);
    text(PAYMENT_METHODS[o.paymentMethod as PaymentMethod] ?? o.paymentMethod, cols[2], y, 9);
    const paid = o.payment?.status === "PAID" ? (o.payment.paidOnTime ? "Paid on time" : "Paid late") : "Pending";
    text(paid, cols[3], y, 9, font, MUTED);
    const amt = rand(o.total);
    text(amt, width - M - font.widthOfTextAtSize(amt, 9), y, 9, bold);
  }
  if (recent.length === 0) {
    y -= 15;
    text("No orders yet.", M, y, 9, font, MUTED);
  }

  // Compliance documents
  y -= 30;
  text("COMPLIANCE DOCUMENTS ON FILE", M, y, 8, bold, MUTED);
  for (const d of compliance.documents) {
    y -= 14;
    text(`· ${d.label} (uploaded ${new Date(d.uploadedAt).toLocaleDateString("en-ZA")})`, M, y, 9);
  }
  if (compliance.documents.length === 0) {
    y -= 14;
    text("· None uploaded", M, y, 9, font, MUTED);
  }

  // Footer
  page.drawLine({ start: { x: M, y: 70 }, end: { x: width - M, y: 70 }, thickness: 0.8, color: LINE });
  text(`Integrity code: ${integrity}`, M, 54, 9, bold);
  text(
    "Figures are computed directly from orders and payments logged on SpazaLink. Credit health weighs on time",
    M,
    40,
    7.5,
    font,
    MUTED,
  );
  text(
    "payments (50%), months of activity (30%) and spend consistency (20%). Payments shown were processed in sandbox mode.",
    M,
    30,
    7.5,
    font,
    MUTED,
  );

  return download(Buffer.from(await pdf.save()), `${baseName}.pdf`, "application/pdf");
});

function drawChart(
  page: PDFPage,
  font: PDFFont,
  data: { month: string; total: number }[],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  page.drawRectangle({ x, y, width: w, height: h, color: PAPER });
  const padL = 56;
  const padB = 22;
  const max = Math.max(...data.map((d) => d.total), 1);
  const nice = Math.ceil(max / 500) * 500 || 500;
  const plotW = w - padL - 16;
  const plotH = h - padB - 14;
  for (let i = 0; i <= 4; i++) {
    const gy = y + padB + (plotH * i) / 4;
    page.drawLine({ start: { x: x + padL, y: gy }, end: { x: x + w - 16, y: gy }, thickness: 0.5, color: LINE });
    const label = `R ${Math.round((nice * i) / 4).toLocaleString("en-US")}`;
    page.drawText(label, { x: x + padL - 6 - font.widthOfTextAtSize(label, 7), y: gy - 2, size: 7, font, color: MUTED });
  }
  const pts = data.map((d, i) => ({
    x: x + padL + (data.length === 1 ? plotW / 2 : (plotW * i) / (data.length - 1)),
    y: y + padB + (plotH * d.total) / nice,
    label: d.month,
  }));
  for (let i = 1; i < pts.length; i++) {
    page.drawLine({ start: pts[i - 1], end: pts[i], thickness: 2, color: BRAND });
  }
  for (const p of pts) {
    page.drawCircle({ x: p.x, y: p.y, size: 3.5, color: PINK, borderColor: BRAND, borderWidth: 1.2 });
    page.drawText(p.label, { x: p.x - font.widthOfTextAtSize(p.label, 7) / 2, y: y + 8, size: 7, font, color: MUTED });
  }
}

/** The header logo lockup, fetched from our own public folder (works locally and on Vercel). */
async function loadLogo(pdf: PDFDocument, origin: string) {
  try {
    const res = await fetch(new URL("/brand/logo-horizontal.png", origin));
    if (!res.ok) return null;
    return await pdf.embedPng(new Uint8Array(await res.arrayBuffer()));
  } catch {
    return null;
  }
}
