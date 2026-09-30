// Upload ingest: a picked file in, three clean blobs out.
//
// Two things this pipeline guarantees, both required by DEV_AGENTS.md:
//
// 1. Only real images get through. The browser's `file.type` is a hint from the
//    OS and can be wrong or spoofed, so the leading bytes are checked too — a
//    .txt renamed to .jpg is rejected.
//
// 2. EXIF/GPS is gone. EXIF lives in the JPEG APP1 segment (and in PNG's eXIf
//    chunk); `drawImage` only copies *decoded pixels* into the canvas, and
//    `toBlob` writes a brand new file header from the browser's encoder. No
//    metadata block survives that round trip — orientation included, because
//    the decoder bakes rotation into the pixels.
//
//    The counterexample is exactly what we must never do:
//    `URL.createObjectURL(file)` and storing the File as-is keeps GPS intact.

export const MAX_RAW_BYTES = 25 * 1024 * 1024;

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export type AllowedType = (typeof ALLOWED)[number];

export type IngestResult = {
  full: Blob;
  card: Blob;
  thumb: Blob;
  width: number;
  height: number;
  type: string;
  bytes: { full: number; card: number; thumb: number };
};

export class IngestError extends Error {}

const LONG_EDGE = { full: 1600, card: 1024, thumb: 480 } as const;

function ascii(b: Uint8Array, start: number, end: number): string {
  let s = "";
  for (let i = start; i < end; i += 1) s += String.fromCharCode(b[i]);
  return s;
}

/** Reads the magic bytes and returns the real MIME type, or null if unknown. */
export async function sniffMime(file: Blob): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (head.length < 12) return null;

  // JPEG: FF D8 FF
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47 &&
    head[4] === 0x0d &&
    head[5] === 0x0a &&
    head[6] === 0x1a &&
    head[7] === 0x0a
  )
    return "image/png";
  // WebP: RIFF....WEBP
  if (ascii(head, 0, 4) === "RIFF" && ascii(head, 8, 12) === "WEBP") return "image/webp";
  // AVIF / HEIC family: ....ftyp<brand>
  if (ascii(head, 4, 8) === "ftyp") {
    const brand = ascii(head, 8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

type Decoded = { w: number; h: number; draw: (c: CanvasRenderingContext2D) => void };

/**
 * Decode through an <img> rather than `createImageBitmap`.
 *
 * `createImageBitmap` is faster on paper, but it can hang forever on some
 * GPU-less/headless builds (it never resolves *and* never rejects, so the UI
 * would sit in "处理中…" with no way out). `<img>` + objectURL decodes
 * everywhere, applies EXIF orientation before we ever see the pixels (so the
 * re-encoded result is upright and has no orientation tag left to carry), and
 * fails loudly through onerror.
 */
async function decode(file: Blob): Promise<Decoded> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new IngestError("图片无法解码，请换一张试试"));
      el.src = url;
    });
    return {
      w: img.naturalWidth,
      h: img.naturalHeight,
      draw: (c) => c.drawImage(img, 0, 0),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasFor(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function dataUrlToBlob(url: string): Blob | null {
  const comma = url.indexOf(",");
  if (comma < 0) return null;
  const meta = url.slice(5, comma); // "image/webp;base64"
  if (!meta.includes("base64")) return null;
  const type = meta.split(";")[0];
  const bin = atob(url.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

/**
 * Downscale + re-encode, synchronously.
 *
 * `toDataURL` is used instead of `toBlob` on purpose: it is synchronous, so it
 * cannot silently never-call-back (which `toBlob` does in some headless/GPU-less
 * contexts), and it lets us see the *actual* MIME the encoder produced — Safari
 * quietly hands back PNG when it does not want to write WebP.
 */
function encode(src: Decoded, longEdge: number, quality: number): Blob | null {
  const scale = Math.min(1, longEdge / Math.max(src.w, src.h));
  const w = Math.max(1, Math.round(src.w * scale));
  const h = Math.max(1, Math.round(src.h * scale));
  const c = canvasFor(w, h);
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  src.draw(ctx);

  let url = c.toDataURL("image/webp", quality);
  if (!url.startsWith("data:image/webp")) url = c.toDataURL("image/jpeg", quality);
  return dataUrlToBlob(url);
}

/**
 * Validates, decodes and re-encodes a picked file into three sizes.
 * Throws `IngestError` with a user-facing message on every rejection path.
 */
export async function ingestImage(file: File): Promise<IngestResult> {
  if (file.size > MAX_RAW_BYTES) {
    throw new IngestError(`图片太大（${(file.size / 1048576).toFixed(1)}MB），上限 ${MAX_RAW_BYTES / 1048576}MB`);
  }

  const sniffed = await sniffMime(file);
  if (!sniffed) throw new IngestError("文件头部不是 JPEG / PNG / WebP / AVIF，已拒绝");
  if (file.type && file.type !== sniffed)
    throw new IngestError(`扩展名与实际内容不符（声明 ${file.type}，实际 ${sniffed}）`);
  if (!(ALLOWED as readonly string[]).includes(sniffed))
    throw new IngestError(`不支持的格式：${sniffed}`);

  const src = await decode(file);
  if (src.w < 300 || src.h < 300)
    throw new IngestError(`图片太小（${src.w}×${src.h}），最短边至少 300px`);

  const full = encode(src, LONG_EDGE.full, 0.9);
  const card = encode(src, LONG_EDGE.card, 0.85);
  const thumb = encode(src, LONG_EDGE.thumb, 0.8);
  if (!full || !card || !thumb) throw new IngestError("浏览器无法重新编码这张图，请换一张试试");

  return {
    full,
    card,
    thumb,
    width: src.w,
    height: src.h,
    type: full.type,
    bytes: { full: full.size, card: card.size, thumb: thumb.size },
  };
}

export function kb(n: number): string {
  return n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`;
}
