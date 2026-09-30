import type { CardEffectProfile } from './types';

/**
 * Which foil shader a card gets.
 *
 * The only source of truth for what each profile *looks like* is the FINISH
 * table in ruicShaders.ts — a duplicate config table used to live here and
 * quietly disagreed with it, so it was removed.
 */

/**
 * Market rarity → foil profile.
 *
 * `MarketItem.effect` carries the parallel tier (see EFFECT_BY_RARITY in
 * scripts/gen-market-mock.mjs): superfractor / gold / refractor / prism / none.
 * Note "superfractor" does NOT contain the substring "refractor", which is why
 * 1/1 SuperFractors used to fall through to a plain, foil-free render.
 */
export function resolveEffectFromMarketEffect(marketEffect?: string | null): CardEffectProfile {
  const v = (marketEffect ?? '').toLowerCase();
  if (v.includes('super') || v.includes('rainbow')) return 'rainbow';
  if (v.includes('gold')) return 'gold';
  if (v.includes('refractor') || v.includes('holo') || v.includes('chrome')) return 'refractor';
  if (v.includes('prism') || v.includes('prizm')) return 'pearl';
  if (v.includes('silver')) return 'silver';
  return 'original';
}

/** Free-text parallel name → foil profile (used by the upload form). */
export function resolveEffectFromVariant(variantName?: string | null): CardEffectProfile {
  const v = (variantName ?? '').toLowerCase();
  if (v.includes('super') || v.includes('rainbow')) return 'rainbow';
  if (v.includes('gold')) return 'gold';
  if (v.includes('silver')) return 'silver';
  // Topps spells it "prism", Panini "prizm" — both are the same pearlescent
  // finish and neither contains the other's spelling.
  if (v.includes('pearl') || v.includes('prism') || v.includes('prizm')) return 'pearl';
  if (v.includes('refractor') || v.includes('holo')) return 'refractor';
  return 'original';
}
