// Rarity ladder — one place that decides how a tier looks and how tiers sort.

import type { RarityTier } from "./types";

export type RarityMeta = {
  id: RarityTier;
  label: string;
  cn: string;
  color: string;
  glow: string;
  rank: number;
};

export const RARITY: Record<RarityTier, RarityMeta> = {
  ultimate: {
    id: "ultimate",
    label: "ULTIMATE",
    cn: "至高",
    color: "#e3b95a",
    glow: "rgba(227,185,90,.45)",
    rank: 0,
  },
  legendary: {
    id: "legendary",
    label: "LEGENDARY",
    cn: "传奇",
    color: "#a987ff",
    glow: "rgba(169,135,255,.42)",
    rank: 1,
  },
  rare: {
    id: "rare",
    label: "RARE",
    cn: "稀有",
    color: "#55dbff",
    glow: "rgba(85,219,255,.38)",
    rank: 2,
  },
  uncommon: {
    id: "uncommon",
    label: "UNCOMMON",
    cn: "精良",
    color: "#53d486",
    glow: "rgba(83,212,134,.32)",
    rank: 3,
  },
  base: {
    id: "base",
    label: "BASE",
    cn: "普通",
    color: "#9199a3",
    glow: "rgba(145,153,163,.25)",
    rank: 4,
  },
};

export const RARITY_ORDER: RarityTier[] = [
  "ultimate",
  "legendary",
  "rare",
  "uncommon",
  "base",
];

export function rarityMeta(tier: RarityTier): RarityMeta {
  return RARITY[tier];
}
