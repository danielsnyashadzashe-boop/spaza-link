import "server-only";
import { HttpError } from "./api";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const SIGNATURES: { mime: string; ext: string[]; magic: number[] }[] = [
  { mime: "application/pdf", ext: ["pdf"], magic: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { mime: "image/png", ext: ["png"], magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/jpeg", ext: ["jpg", "jpeg"], magic: [0xff, 0xd8, 0xff] },
];

/**
 * Accept only real PDFs, PNGs and JPEGs under 5 MB. The extension, the declared type
 * and the file's actual leading bytes must all agree, so a renamed .exe is refused.
 */
export async function inspectUpload(file: File): Promise<{ bytes: Buffer; mime: string; filename: string }> {
  if (file.size === 0) throw new HttpError(400, "That file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "File is too large. The limit is 5 MB.");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byExt = SIGNATURES.find((s) => s.ext.includes(ext));
  if (!byExt) throw new HttpError(415, "Only PDF, PNG or JPEG files are accepted.");
  if (file.type && file.type !== byExt.mime) {
    throw new HttpError(415, "The file type does not match its extension.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const real = SIGNATURES.find((s) => s.magic.every((b, i) => bytes[i] === b));
  if (!real || real.mime !== byExt.mime) {
    throw new HttpError(415, "This file's contents are not a real PDF, PNG or JPEG.");
  }

  const base = file.name.replace(/\.[^.]+$/, "").replace(/[^\w\- ]+/g, "").trim().slice(0, 60) || "document";
  return { bytes, mime: real.mime, filename: `${base}.${ext}` };
}
