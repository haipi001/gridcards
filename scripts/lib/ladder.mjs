// The rarity ladders and collections, in one place.
//
// Both the market generator and the photo planner need the exact same list of
// tradable editions: "which card exists, in which parallel". When they each
// kept their own copy the two disagreed, and a photo could be handed to one
// edition in the market and to a different one on the player ladder — which is
// how the same scan ended up on several cards at once.

/** printRun === null means unnumbered (Base / Refractor / inserts). */
export const LADDER = {
  full: [
    { parallel: "SuperFractor 1/1", printRun: 1, rarity: "ultimate", mult: 92 },
    { parallel: "Red Refractor /5", printRun: 5, rarity: "legendary", mult: 26 },
    { parallel: "Gold Refractor /50", printRun: 50, rarity: "rare", mult: 8.5 },
    { parallel: "Refractor", printRun: null, rarity: "uncommon", mult: 2.6 },
    { parallel: "Base", printRun: null, rarity: "base", mult: 1 },
  ],
  auto: [
    { parallel: "SuperFractor Auto 1/1", printRun: 1, rarity: "ultimate", mult: 78 },
    { parallel: "Red Auto /5", printRun: 5, rarity: "legendary", mult: 22 },
    { parallel: "Chrome Auto", printRun: null, rarity: "rare", mult: 6.4 },
  ],
  insert: [
    { parallel: "Gold /50", printRun: 50, rarity: "rare", mult: 5.2 },
    { parallel: "Base Insert", printRun: null, rarity: "uncommon", mult: 1.9 },
  ],
};

export const EFFECT_BY_RARITY = {
  ultimate: "superfractor",
  legendary: "gold",
  rare: "refractor",
  uncommon: "prism",
  base: "none",
};

/** Allocation order for photos: the rarest edition picks first. */
export const RARITY_RANK = {
  ultimate: 0,
  legendary: 1,
  rare: 2,
  uncommon: 3,
  base: 4,
};

export const COLLECTIONS = [
  {
    id: "chrome-base",
    name: "2020 Topps Chrome F1 · Base Set",
    shortName: "Chrome Base",
    season: "2020",
    category: "base",
    blurb:
      "官方 checklist 的 40 位一级方程式车手，完整平行卡阶梯从 Base 到 SuperFractor 1/1。",
    sections: ["f1-racers"],
    limit: 40,
    ladder: "full",
    c1: "#1f6fb2",
    c2: "#0b1a2b",
    tags: ["Drivers", "Chrome", "Full ladder"],
  },
  {
    id: "chrome-autographs",
    name: "Chrome Autograph Variations",
    shortName: "Autographs",
    season: "2020",
    category: "autograph",
    blurb: "亲笔签名平行卡，含 Red Auto /5 与 SuperFractor Auto 1/1。",
    sections: ["chrome-autograph-variations"],
    limit: 26,
    ladder: "auto",
    c1: "#8f6a29",
    c2: "#2b1f14",
    tags: ["Signature", "Chrome"],
  },
  {
    id: "track-tags",
    name: "Track Tags",
    shortName: "Track Tags",
    season: "2020",
    category: "insert",
    blurb: "赛道铭牌插入卡，编号与车队一一对应。",
    sections: ["track-tags"],
    limit: 14,
    ladder: "insert",
    c1: "#375f76",
    c2: "#16232c",
    tags: ["Insert", "Numbered"],
  },
  {
    id: "world-on-wheels",
    name: "1954 Topps World on Wheels",
    shortName: "World on Wheels",
    season: "1954",
    category: "insert",
    blurb: "向 1954 年 Topps 经典设计致敬的复古插入系列。",
    sections: ["world-on-wheels"],
    limit: 18,
    ladder: "insert",
    c1: "#8d5228",
    c2: "#2a1c11",
    tags: ["Insert", "Retro"],
  },
  {
    id: "image-variations",
    name: "Base Card Image Variations",
    shortName: "Image Variations",
    season: "2020",
    category: "variation",
    blurb: "同卡号不同照片的短印刷版本，收藏市场最热门的短板之一。",
    sections: ["base-card-image-variations"],
    limit: 10,
    ladder: "insert",
    c1: "#4b6f9c",
    c2: "#15202b",
    tags: ["Short print", "Variation"],
  },
  {
    id: "grand-prix-heroes",
    name: "Grand Prix Heroes",
    shortName: "GP Heroes",
    season: "2020",
    category: "insert",
    blurb: "分站冠军、当日最佳车手、年度奖项与新人盘点。",
    sections: [
      "grand-prix-winners",
      "grand-prix-driver-of-the-day",
      "f1-award-winners",
      "f1-freshest",
    ],
    limit: 16,
    ladder: "insert",
    c1: "#6d4fa8",
    c2: "#1d1730",
    tags: ["Insert", "Winners"],
  },
  {
    id: "team-logos",
    name: "Team Logos",
    shortName: "Team Logos",
    season: "2020",
    category: "base",
    blurb: "十支车队的队徽卡，队徽为本站自绘，不使用厂商素材。",
    sections: ["team-logos"],
    limit: 10,
    ladder: "insert",
    c1: "#2f8f7a",
    c2: "#10201d",
    tags: ["Teams", "Chrome"],
  },
];

/**
 * The checklist records that become tradable editions in one collection, in
 * the market's own order. A subject listed twice in the same collection is
 * still one card, so it is deduped here — the same rule the market generator
 * applies, and therefore the same set of photo slots.
 */
export function collectionCards(catalog, col) {
  const seen = new Set();
  return catalog.sections
    .filter((s) => col.sections.includes(s.slug))
    .flatMap((s) => s.cards.map((c) => ({ ...c, sectionSlug: s.slug })))
    .filter((c) => {
      if (seen.has(c.name)) return false;
      seen.add(c.name);
      return true;
    })
    .slice(0, col.limit);
}

/**
 * Every tradable edition in the whole market. This is the canonical slot list
 * the photo planner allocates against — one photo, one edition, site-wide.
 */
export function allEditionSlots(catalog) {
  const out = [];
  for (const col of COLLECTIONS) {
    for (const card of collectionCards(catalog, col)) {
      for (const v of LADDER[col.ladder]) {
        out.push({
          collectionId: col.id,
          sectionSlug: card.sectionSlug,
          cardNumber: String(card.cardNumber),
          subject: card.name,
          kind: card.kind,
          parallel: v.parallel,
          rarity: v.rarity,
          printRun: v.printRun,
        });
      }
    }
  }
  return out;
}
