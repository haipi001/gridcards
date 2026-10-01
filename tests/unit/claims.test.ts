import { describe, it, expect } from "vitest";
import {
  addEvidence,
  cardClaimId,
  clearClaims,
  claimsSnapshot,
  editionClaimId,
  ownedSerials,
  readClaims,
  removeEvidence,
  subscribeClaims,
  toggleCardClaim,
  toggleSerial,
  totalEvidence,
  totalOwned,
  updateNote,
  type ClaimEntry,
} from "@/lib/claims";

const EDITION: ClaimEntry = {
  id: editionClaimId("Lewis Hamilton", "Gold Refractor /50"),
  title: "Lewis Hamilton · Gold Refractor /50",
  player: "Lewis Hamilton",
  run: 50,
  href: "/players/lewis-hamilton/",
  variant: "Gold Refractor /50",
};

const CARD: ClaimEntry = {
  id: cardClaimId("base", "1"),
  title: "#1 · Lewis Hamilton",
  player: "Lewis Hamilton",
  run: 0,
  href: "/players/lewis-hamilton/",
  scope: "card",
  cardNo: "1",
};

const ev = (n: string) => ({
  id: n,
  thumb: { kind: "idb" as const, key: `${n}:thumb` },
  full: { kind: "idb" as const, key: `${n}:full` },
  at: 1,
});

describe("claims · serial granularity", () => {
  it("adds and removes one serial, and keeps them sorted", () => {
    clearClaims();
    expect(toggleSerial(EDITION, 7)).toEqual([7]);
    expect(toggleSerial(EDITION, 3)).toEqual([3, 7]);
    expect(ownedSerials(EDITION.id)).toEqual([3, 7]);
    expect(toggleSerial(EDITION, 3)).toEqual([7]);
  });

  it("drops the record once nothing is left to remember", () => {
    clearClaims();
    toggleSerial(EDITION, 4);
    expect(readClaims()).toHaveLength(1);
    toggleSerial(EDITION, 4);
    expect(readClaims()).toHaveLength(0);
  });

  it("keeps the record when evidence outlives the last serial", () => {
    clearClaims();
    toggleSerial(EDITION, 4);
    addEvidence(EDITION, ev("e1"));
    toggleSerial(EDITION, 4);
    const list = readClaims();
    expect(list).toHaveLength(1);
    expect(list[0].serials).toEqual([]);
    expect(list[0].evidence).toHaveLength(1);
  });
});

describe("claims · card granularity", () => {
  it("toggles whole-checklist-record claims", () => {
    clearClaims();
    expect(toggleCardClaim(CARD)).toBe(true);
    expect(readClaims()[0].scope).toBe("card");
    expect(toggleCardClaim(CARD)).toBe(false);
    expect(readClaims()).toHaveLength(0);
  });

  it("counts a card claim as one held unit", () => {
    clearClaims();
    toggleCardClaim(CARD);
    toggleSerial(EDITION, 1);
    toggleSerial(EDITION, 2);
    expect(totalOwned()).toBe(3);
  });
});

describe("claims · photo evidence", () => {
  it("creates the claim when a photo arrives first", () => {
    clearClaims();
    const created = addEvidence(EDITION, ev("e1"));
    expect(created.id).toBe(EDITION.id);
    expect(totalEvidence()).toBe(1);
  });

  it("removes one photo without touching the others", () => {
    clearClaims();
    addEvidence(EDITION, ev("e1"));
    addEvidence(EDITION, ev("e2"));
    removeEvidence(EDITION.id, "e1");
    expect(readClaims()[0].evidence.map((e) => e.id)).toEqual(["e2"]);
  });

  it("drops an emptied claim instead of leaving a husk", () => {
    clearClaims();
    addEvidence(EDITION, ev("e1"));
    removeEvidence(EDITION.id, "e1");
    expect(readClaims()).toHaveLength(0);
  });

  it("never writes an owner — claims are a personal note, not a transfer", () => {
    clearClaims();
    addEvidence(EDITION, ev("e1"));
    const raw = window.localStorage.getItem("gridcards:claims:v1") ?? "";
    expect(raw).not.toContain("owner");
  });
});

describe("claims · reading", () => {
  it("migrates records written before scope and evidence existed", () => {
    clearClaims();
    window.localStorage.setItem(
      "gridcards:claims:v1",
      JSON.stringify([{ id: "edition:A:B", title: "A · B", player: "A", run: 5, href: "/", serials: [2] }]),
    );
    const list = readClaims();
    expect(list[0].scope).toBe("edition");
    expect(list[0].evidence).toEqual([]);
    expect(list[0].note).toBe("");
    expect(list[0].serials).toEqual([2]);
  });

  it("survives a corrupted payload", () => {
    window.localStorage.setItem("gridcards:claims:v1", "{not json");
    expect(readClaims()).toEqual([]);
  });

  it("gives useSyncExternalStore a referentially stable snapshot", () => {
    clearClaims();
    const first = claimsSnapshot();
    expect(claimsSnapshot()).toBe(first);
    toggleSerial(EDITION, 1);
    expect(claimsSnapshot()).not.toBe(first);
  });

  it("notifies subscribers on every write", () => {
    clearClaims();
    let hits = 0;
    const off = subscribeClaims(() => {
      hits += 1;
    });
    toggleSerial(EDITION, 1);
    updateNote(EDITION.id, "bought at a show");
    off();
    toggleSerial(EDITION, 2);
    expect(hits).toBe(2);
  });
});
