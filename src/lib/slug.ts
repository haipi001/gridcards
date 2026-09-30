// URL-safe slugs. Player names and edition variants contain spaces, accents
// and slashes ("Red Refractor /5"), which do not survive round-tripping
// through a static host's path decoding — routes use ASCII slugs instead.
//
// Kept dependency-free so client components can import it without pulling the
// whole catalog into the browser bundle.

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}
