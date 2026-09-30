# Legacy Drizzle schema (SUPERSEDED)

> SUPERSEDED — 仅作旧数据字典参考，不参与构建，也不被任何应用代码引用。
> 原文件 `src/db/schema.ts`（Drizzle ORM · PostgreSQL）。站点改为静态导出后，
> `src/db` 从未被 `src/app` 或 `src/components` 引用，因此被移除；本节保留原始内容，
> 作为第二阶段（接回托管 Postgres 时）重建 Drizzle schema 的起点。

迁移到云服务后的主要差异：

- 主键：uuid → `BIGINT GENERATED ALWAYS AS IDENTITY`
- 身份列：`owner_id` / `user_id` uuid → **TEXT**（`auth.uid()` 返回 text）
- 跨表引用：uuid 外键 → TEXT 业务键（`card_key` / `variant_key`）
- 图片：`*_image_url` → `*_path`（对象存储只存 key，读取走签名 URL）

```ts
// GRID Cards · Marketplace-first schema
// Domain model follows dev-pack docs/04_DATABASE_API.md.
// Catalog / Ownership / Marketplace / Social stay separate; never merge them.

import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  jsonb,
  timestamp,
  bigserial,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Auth (minimal local users table; real auth provider lands in Phase 0 later)
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Catalog domain — official card definitions. Never owned directly.
// ---------------------------------------------------------------------------

export const sets = pgTable("sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  brand: text("brand"),
  year: integer("year"),
  sport: text("sport"),
  manufacturer: text("manufacturer"),
  description: text("description"),
  coverImageUrl: text("cover_image_url"),
  releaseDate: date("release_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const setSections = pgTable(
  "set_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(), // base / insert / variation / autograph
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("set_sections_set_slug_idx").on(t.setId, t.slug)],
);

export const cards = pgTable(
  "cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setId: uuid("set_id")
      .notNull()
      .references(() => sets.id),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => setSections.id),
    // Always text: the launch catalog mixes "10", "TT-1", "54W-10", "F1A-LH".
    cardNumber: text("card_number").notNull(),
    sortOrder: integer("sort_order").notNull(),
    name: text("name").notNull(),
    team: text("team"),
    // person -> Player market; collection (team/logo/car) -> Collection market
    kind: text("kind").notNull().default("person"),
    // Source PDF has two #196 lines; both preserved, second flagged.
    sourceDuplicate: boolean("source_duplicate").notNull().default(false),
    frontImageUrl: text("front_image_url"),
    backImageUrl: text("back_image_url"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("cards_set_idx").on(t.setId),
    index("cards_card_number_idx").on(t.cardNumber),
    index("cards_name_idx").on(t.name),
  ],
);

export const cardVariants = pgTable(
  "card_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    parallelType: text("parallel_type"),
    // Official print run. Serial market derives its slot count ONLY from this.
    printRun: integer("print_run"),
    serialNumbered: boolean("serial_numbered").notNull().default(false),
    effectProfile: text("effect_profile").notNull().default("original"),
    metadata: jsonb("metadata").default({}),
  },
  (t) => [index("card_variants_card_idx").on(t.cardId)],
);

// ---------------------------------------------------------------------------
// Ownership domain — one row per real physical copy.
// ---------------------------------------------------------------------------

export const userCards = pgTable(
  "user_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id),
    variantId: uuid("variant_id").references(() => cardVariants.id),
    frontImageUrl: text("front_image_url").notNull(),
    backImageUrl: text("back_image_url"),
    effectProfile: text("effect_profile").notNull().default("original"),
    effectMode: text("effect_mode").notNull().default("flat"),
    gradingCompany: text("grading_company"),
    grade: numeric("grade"),
    certNumber: text("cert_number"),
    serialNumber: integer("serial_number"),
    serialTotal: integer("serial_total"),
    condition: text("condition"),
    notes: text("notes"),
    visibility: text("visibility").notNull().default("public"),
    verificationStatus: text("verification_status").default("unverified"),
    ownershipStatus: text("ownership_status").default("owned"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("user_cards_owner_idx").on(t.ownerId)],
);

export const ownershipHistory = pgTable("ownership_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userCardId: uuid("user_card_id")
    .notNull()
    .references(() => userCards.id),
  fromUserId: uuid("from_user_id"),
  toUserId: uuid("to_user_id").notNull(),
  orderId: uuid("order_id"),
  transferType: text("transfer_type"),
  transferredAt: timestamp("transferred_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Marketplace domain — Listing / Offer / Order are first-class objects.
// ---------------------------------------------------------------------------

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userCardId: uuid("user_card_id")
      .notNull()
      .references(() => userCards.id),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id),
    priceAmount: numeric("price_amount", { precision: 18, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull(), // ACTIVE / RESERVED / SOLD / CANCELLED
    allowOffers: boolean("allow_offers").default(true),
    minimumOffer: numeric("minimum_offer", { precision: 18, scale: 2 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    soldAt: timestamp("sold_at", { withTimezone: true }),
  },
  (t) => [
    // One physical copy can only be sold once:
    // at most one ACTIVE/RESERVED listing per user_card (enforced in app layer
    // via transactional insert; PGlite lacks partial unique indexes in drizzle).
    index("listings_user_card_idx").on(t.userCardId),
    index("listings_status_idx").on(t.status),
  ],
);

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => users.id),
  offerType: text("offer_type").notNull(), // copy / edition
  userCardId: uuid("user_card_id").references(() => userCards.id),
  variantId: uuid("variant_id").references(() => cardVariants.id),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  conditions: jsonb("conditions").default({}),
  status: text("status").notNull(), // OPEN / ACCEPTED / CANCELLED / EXPIRED
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  acceptedBy: uuid("accepted_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => users.id),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => users.id),
  userCardId: uuid("user_card_id")
    .notNull()
    .references(() => userCards.id),
  listingId: uuid("listing_id").references(() => listings.id),
  offerId: uuid("offer_id").references(() => offers.id),
  status: text("status").notNull(), // see docs/11_ORDER_STATE_MACHINE.md
  itemAmount: numeric("item_amount", { precision: 18, scale: 2 }),
  platformFee: numeric("platform_fee", { precision: 18, scale: 2 }),
  shippingAmount: numeric("shipping_amount", { precision: 18, scale: 2 }),
  taxAmount: numeric("tax_amount", { precision: 18, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 18, scale: 2 }),
  currency: text("currency"),
  paymentProvider: text("payment_provider"),
  paymentExternalId: text("payment_external_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .unique()
    .references(() => orders.id),
  carrier: text("carrier"),
  trackingNumber: text("tracking_number"),
  status: text("status"),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
});

// Fact layer for Activity / Analytics / Feed.
// Never derive sale facts from social posts.
export const marketEvents = pgTable(
  "market_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventType: text("event_type").notNull(), // SALE / LISTING_CREATED / ...
    setId: uuid("set_id"),
    cardId: uuid("card_id"),
    variantId: uuid("variant_id"),
    userCardId: uuid("user_card_id"),
    listingId: uuid("listing_id"),
    offerId: uuid("offer_id"),
    orderId: uuid("order_id"),
    actorId: uuid("actor_id"),
    price: numeric("price", { precision: 18, scale: 2 }),
    currency: text("currency"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("market_events_card_idx").on(t.cardId),
    index("market_events_type_idx").on(t.eventType),
    index("market_events_created_idx").on(t.createdAt),
  ],
);

export const marketStats = pgTable("market_stats", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(), // card / variant / set
  entityId: uuid("entity_id").notNull(),
  floorPrice: numeric("floor_price", { precision: 18, scale: 2 }),
  highestOffer: numeric("highest_offer", { precision: 18, scale: 2 }),
  lastSalePrice: numeric("last_sale_price", { precision: 18, scale: 2 }),
  avgSale10: numeric("avg_sale_10", { precision: 18, scale: 2 }),
  listedCount: integer("listed_count"),
  ownersCount: integer("owners_count"),
  sales24h: integer("sales_24h"),
  volume24h: numeric("volume_24h", { precision: 18, scale: 2 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Social domain (kept independent of order truth)
// ---------------------------------------------------------------------------

export const follows = pgTable("follows", {
  id: uuid("id").primaryKey().defaultRandom(),
  followerId: uuid("follower_id")
    .notNull()
    .references(() => users.id),
  followingUserId: uuid("following_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
```
