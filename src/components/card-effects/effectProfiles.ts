import type { CardEffectProfile } from './types';

export type EffectConfig = {
  foil: number;
  reflection: number;
  saturationShift: number;
  sparkle: number;
  edgeLight: number;
};

export const EFFECT_PROFILES: Record<CardEffectProfile, EffectConfig> = {
  original:   { foil: 0.00, reflection: 0.18, saturationShift: 0.00, sparkle: 0.00, edgeLight: 0.12 },
  pearl:      { foil: 0.34, reflection: 0.40, saturationShift: 0.04, sparkle: 0.06, edgeLight: 0.22 },
  silver:     { foil: 0.48, reflection: 0.52, saturationShift: -0.10, sparkle: 0.08, edgeLight: 0.30 },
  gold:       { foil: 0.58, reflection: 0.58, saturationShift: 0.05, sparkle: 0.10, edgeLight: 0.36 },
  refractor:  { foil: 0.66, reflection: 0.62, saturationShift: 0.12, sparkle: 0.12, edgeLight: 0.32 },
  rainbow:    { foil: 0.76, reflection: 0.68, saturationShift: 0.18, sparkle: 0.16, edgeLight: 0.36 },
  custom:     { foil: 0.52, reflection: 0.52, saturationShift: 0.08, sparkle: 0.10, edgeLight: 0.30 },
};

export function resolveEffectFromVariant(variantName?: string | null): CardEffectProfile {
  const v = (variantName ?? '').toLowerCase();
  if (v.includes('gold')) return 'gold';
  if (v.includes('silver')) return 'silver';
  if (v.includes('pearl')) return 'pearl';
  if (v.includes('refractor') || v.includes('holo')) return 'refractor';
  return 'original';
}
