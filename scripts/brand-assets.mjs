// Builds every logo asset from the master artwork at brand/spaza-link.png.
// Usage: npm run brand
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "brand/spaza-link.png";
const NAVY = { r: 6, g: 38, b: 84 };
const BLUSH = "#fff7f9";

// Measured on the 1254 px master: the shop-and-chain mark sits above the wordmark.
const MARK = { left: 259, top: 217, width: 993 - 259 + 1, height: 811 - 217 + 1 };
const WORD = { left: 89, top: 842, width: 1177 - 89 + 1, height: 1065 - 842 + 1 };
const ALL = { left: 89, top: 217, width: 1177 - 89 + 1, height: 1065 - 217 + 1 };

/** Turn the white backdrop transparent, un-mixing anti-aliased edges so they don't halo. */
async function cutOut(region) {
  const { data, info } = await sharp(SOURCE).extract(region).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    // Treat near-white (JPEG-style noise in the master) as fully transparent.
    const a = Math.max(0, Math.min(1, (232 - min) / 45));
    if (a === 0) {
      data[i + 3] = 0;
      continue;
    }
    for (let k = 0; k < 3; k++) data[i + k] = Math.max(0, Math.min(255, Math.round((data[i + k] - 255 * (1 - a)) / a)));
    data[i + 3] = Math.round(a * 255);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

const pad = (buf, px, background = { r: 0, g: 0, b: 0, alpha: 0 }) =>
  sharp(buf).extend({ top: px, bottom: px, left: px, right: px, background }).png().toBuffer();

/** Square tile with the mark centred on a solid (optionally rounded) background. */
async function tile(mark, size, { background = "#ffffff", radius = 0, inset = 0.14 } = {}) {
  const inner = Math.round(size * (1 - inset * 2));
  const art = await sharp(mark).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const shape = Buffer.from(
    `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/></svg>`,
  );
  return sharp(shape).composite([{ input: art, gravity: "centre" }]).png().toBuffer();
}

/** Windows .ico holding PNG frames (supported by every current browser and OS). */
function ico(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = 6 + frames.length * 16;
  const entries = frames.map(({ size, png }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...frames.map((f) => f.png)]);
}

async function main() {
  await mkdir("public/brand", { recursive: true });
  await copyFile(SOURCE, "public/brand/spaza-link.png");

  const mark = await cutOut(MARK);
  const word = await cutOut(WORD);
  const full = await cutOut(ALL);

  await writeFile("public/brand/logo.png", await sharp(await pad(full, 24)).resize({ width: 960 }).png().toBuffer());
  await writeFile("public/brand/mark.png", await sharp(mark).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer());

  // Horizontal lockup for headers: mark on the left, wordmark on the right.
  const H = 200;
  const markH = await sharp(mark).resize({ height: H }).toBuffer();
  const wordH = await sharp(word).resize({ height: Math.round(H * 0.5) }).toBuffer();
  const [mw, ww] = [(await sharp(markH).metadata()).width, (await sharp(wordH).metadata()).width];
  const gap = 28;
  await writeFile(
    "public/brand/logo-horizontal.png",
    await sharp({ create: { width: mw + gap + ww, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([
        { input: markH, left: 0, top: 0 },
        { input: wordH, left: mw + gap, top: Math.round((H - H * 0.5) / 2) + 6 },
      ])
      .png()
      .toBuffer(),
  );

  // Favicons and app icons: the mark on a white rounded tile so it reads on light and dark tabs.
  await writeFile("src/app/icon.png", await tile(mark, 512, { radius: 112, inset: 0.1 }));
  await writeFile("src/app/apple-icon.png", await tile(mark, 180, { inset: 0.12 }));
  await writeFile("public/brand/icon-192.png", await tile(mark, 192, { inset: 0.16 }));
  await writeFile("public/brand/icon-512.png", await tile(mark, 512, { inset: 0.16 }));
  const frames = [];
  for (const size of [16, 32, 48]) frames.push({ size, png: await tile(mark, size, { radius: Math.round(size * 0.2), inset: 0.04 }) });
  await writeFile("src/app/favicon.ico", ico(frames));

  // Link-preview card (WhatsApp, Slack, X).
  const og = await sharp(full).resize({ height: 430 }).toBuffer();
  const stripe = Buffer.from(
    `<svg width="1200" height="630"><rect width="1200" height="630" fill="${BLUSH}"/>` +
      `<rect y="606" width="400" height="24" fill="rgb(${NAVY.r},${NAVY.g},${NAVY.b})"/><rect x="400" y="606" width="400" height="24" fill="#f2366d"/><rect x="800" y="606" width="400" height="24" fill="#f4af23"/></svg>`,
  );
  await writeFile("src/app/opengraph-image.png", await sharp(stripe).composite([{ input: og, gravity: "centre" }]).png().toBuffer());

  console.log("✓ brand assets written to public/brand and src/app (icon, apple-icon, favicon, opengraph-image)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
