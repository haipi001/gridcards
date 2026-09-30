// How an archive scan is framed.
//
// The 515 scans are bimodal: 343 portrait (~0.70, essentially the trading-card
// 5:7 shape) and 169 landscape (~1.40 — typically a card photographed beside
// its slab or a horizontal signature layout). Almost nothing sits in between.
//
// A single fixed 5:7 window with `object-fit: cover` cropped the landscape
// third by 32–75%, cutting off card edges, serials and signature areas. So the
// frame now follows each scan, clamped to a sane range: within the range the
// image fills its frame exactly, outside it the frame letterboxes instead of
// cropping. Only two panoramic scans (2.06 and 2.90) are affected.

const MIN_RATIO = 0.66;
const MAX_RATIO = 1.5;
const FALLBACK = 5 / 7;

/** CSS `aspect-ratio` value for a scan, or undefined when the size is unknown. */
export function archiveAspect(w?: number, h?: number): string | undefined {
  if (!w || !h || !Number.isFinite(w / h)) return undefined;
  const r = Math.min(MAX_RATIO, Math.max(MIN_RATIO, w / h));
  return r.toFixed(4);
}

/** Fallback frame for scans whose pixel size could not be read. */
export const ARCHIVE_FALLBACK_ASPECT = FALLBACK;
