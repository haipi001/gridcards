import { describe, it, expect } from "vitest";
import { readLedger, mutate, resetLedger } from "@/market/ledger";
import { buyNow, makeOffer } from "@/market/actions";

describe("ledger · in-browser transaction", () => {
  it("creates an empty ledger on first mutate and persists it", () => {
    resetLedger();
    expect(readLedger()).toBeNull();
    const balance = mutate((l) => {
      l.user.balanceCents = 5000;
      return l.user.balanceCents;
    });
    expect(balance).toBe(5000);
    const stored = readLedger();
    expect(stored?.user.balanceCents).toBe(5000);
    // The first mutation seeds the ledger at revision 0; later mutations bump it.
    expect(stored?.revision).toBe(0);
  });

  it("increments the revision on every committed mutation", () => {
    resetLedger();
    mutate((l) => {
      l.user.balanceCents = 100;
    });
    expect(readLedger()?.revision).toBe(0);
    mutate((l) => {
      l.user.balanceCents = 200;
    });
    mutate((l) => {
      l.user.balanceCents = 300;
    });
    expect(readLedger()?.revision).toBe(2);
    expect(readLedger()?.user.balanceCents).toBe(300);
  });

  it("applies multiple field changes in a single synchronous tick", () => {
    resetLedger();
    mutate((l) => {
      l.user.balanceCents = 1000;
      l.assets = [
        {
          copyId: "C1",
          itemId: "it1",
          serial: "1",
          serialTotal: null,
          acquiredCents: 1000,
          at: Date.now(),
          grade: null,
          status: "HELD",
        },
        ...l.assets,
      ];
    });
    const after = readLedger()!;
    expect(after.user.balanceCents).toBe(1000);
    expect(after.assets).toHaveLength(1);
    expect(after.assets[0].copyId).toBe("C1");
  });

  it("resetLedger clears persisted state", () => {
    mutate((l) => {
      l.user.balanceCents = 999;
    });
    resetLedger();
    expect(readLedger()).toBeNull();
  });
});

describe("trade actions · freeze short-circuit", () => {
  it("buyNow returns FROZEN and touches no ledger when disabled", async () => {
    resetLedger();
    mutate((l) => {
      l.user.balanceCents = 12000;
    });
    const before = readLedger()!;
    const res = await buyNow({
      enabled: false,
      listingId: "LX",
      itemId: "it-x",
      serial: "1",
      priceCents: 52000,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("FROZEN");
    // balance and revision must be unchanged
    const after = readLedger()!;
    expect(after.user.balanceCents).toBe(before.user.balanceCents);
    expect(after.revision).toBe(before.revision);
  });

  it("makeOffer returns FROZEN and locks no margin when disabled", async () => {
    resetLedger();
    const res = await makeOffer({ enabled: false, itemId: "it-x", priceCents: 8000 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("FROZEN");
    expect(readLedger()?.user.lockedCents ?? 0).toBe(0);
  });
});
