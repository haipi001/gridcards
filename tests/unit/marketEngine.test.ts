import { describe, it, expect } from "vitest";
import { commitMarket } from "@/lib/storage/localAdapter";
import {
  readMarket,
  advanceOrder,
  buyNow,
  ownerOf,
  createListing,
  SELLER_ID,
  BUYER_ID,
  copyId,
  type MarketState,
} from "@/lib/marketEngine";

function seed(state: MarketState) {
  commitMarket(state);
}

const EMPTY: MarketState = {
  role: "seller",
  listings: [],
  orders: [],
  offers: [],
  owners: {},
  events: [],
};

describe("marketEngine · ownership transfer invariant", () => {
  it("ownership moves ONLY when the order reaches COMPLETED", () => {
    const ed = "ed-own";
    const serial = 5;
    const key = copyId(ed, serial);
    seed({
      ...EMPTY,
      listings: [
        {
          id: "L-own",
          editionId: ed,
          serialIndex: serial,
          priceCents: 10000,
          sellerId: SELLER_ID,
          status: "ACTIVE",
          createdAt: 1,
          copyId: key,
        },
      ],
      orders: [
        {
          id: "O-own",
          listingId: "L-own",
          editionId: ed,
          serialIndex: serial,
          priceCents: 10000,
          sellerId: SELLER_ID,
          buyerId: BUYER_ID,
          status: "RESERVED",
          createdAt: 1,
        },
      ],
      owners: { [key]: SELLER_ID },
      events: [],
    });

    // Before completion the seller still holds it.
    expect(ownerOf(readMarket(), ed, serial)).toBe(SELLER_ID);

    const r1 = advanceOrder("O-own");
    expect(r1.ok).toBe(true);
    expect(readMarket().orders[0].status).toBe("PAID");
    expect(ownerOf(readMarket(), ed, serial)).toBe(SELLER_ID); // not yet

    const r2 = advanceOrder("O-own");
    expect(r2.ok).toBe(true);
    expect(readMarket().orders[0].status).toBe("SHIPPED");
    expect(ownerOf(readMarket(), ed, serial)).toBe(SELLER_ID); // still not

    const r3 = advanceOrder("O-own");
    expect(r3.ok).toBe(true);
    expect(readMarket().orders[0].status).toBe("COMPLETED");
    expect(ownerOf(readMarket(), ed, serial)).toBe(BUYER_ID); // only here

    // Completion is terminal: a further advance is rejected.
    const r4 = advanceOrder("O-own");
    expect(r4.ok).toBe(false);
  });

  it("records an OWNERSHIP_TRANSFERRED event exactly once", () => {
    const ed = "ed-evt";
    const serial = 9;
    const key = copyId(ed, serial);
    seed({
      ...EMPTY,
      listings: [
        {
          id: "L-evt",
          editionId: ed,
          serialIndex: serial,
          priceCents: 5000,
          sellerId: SELLER_ID,
          status: "ACTIVE",
          createdAt: 1,
          copyId: key,
        },
      ],
      orders: [
        {
          id: "O-evt",
          listingId: "L-evt",
          editionId: ed,
          serialIndex: serial,
          priceCents: 5000,
          sellerId: SELLER_ID,
          buyerId: BUYER_ID,
          status: "RESERVED",
          createdAt: 1,
        },
      ],
      owners: { [key]: SELLER_ID },
      events: [],
    });
    advanceOrder("O-evt");
    advanceOrder("O-evt");
    advanceOrder("O-evt");
    const transfers = readMarket().events.filter(
      (e) => e.type === "OWNERSHIP_TRANSFERRED",
    );
    expect(transfers).toHaveLength(1);
    expect(transfers[0].serialIndex).toBe(serial);
  });
});

describe("marketEngine · one physical copy can only sell once", () => {
  it("a second Buy Now on a reserved listing is rejected", () => {
    const ed = "ed-dbl";
    const serial = 7;
    const key = copyId(ed, serial);
    seed({
      ...EMPTY,
      listings: [
        {
          id: "L-dbl",
          editionId: ed,
          serialIndex: serial,
          priceCents: 20000,
          sellerId: SELLER_ID,
          status: "ACTIVE",
          createdAt: 1,
          copyId: key,
        },
      ],
      owners: { [key]: SELLER_ID },
      events: [],
    });

    const first = buyNow("L-dbl");
    expect(first.ok).toBe(true);
    expect(readMarket().listings[0].status).toBe("RESERVED");

    const second = buyNow("L-dbl");
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toMatch(/预留|一次/);
  });

  it("createListing refuses a duplicate ACTIVE listing for the same copy", () => {
    const ed = "ed-dup";
    const serial = 11;
    const key = copyId(ed, serial);
    seed({
      ...EMPTY,
      listings: [
        {
          id: "L-dup",
          editionId: ed,
          serialIndex: serial,
          priceCents: 30000,
          sellerId: SELLER_ID,
          status: "ACTIVE",
          createdAt: 1,
          copyId: key,
        },
      ],
      owners: { [key]: SELLER_ID },
      events: [],
    });
    const dup = createListing(ed, serial, 35000, key);
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error).toMatch(/已在售|重复/);
  });
});
