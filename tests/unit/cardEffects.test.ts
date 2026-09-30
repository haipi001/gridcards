import { describe, it, expect } from "vitest";
import {
  resolveEffectFromMarketEffect,
  resolveEffectFromVariant,
} from "@/components/card-effects/effectProfiles";

// The parallel tier on a MarketItem drives which foil shader the 3D viewer
// loads. Two regressions worth pinning down:
//   · "superfractor" does NOT contain the substring "refractor", so a naive
//     includes() check sends every 1/1 to the plain, foil-free profile;
//   · the tiers the mock generator emits (superfractor / gold / refractor /
//     prism / none) must all resolve to something distinct.

describe("resolveEffectFromMarketEffect", () => {
  it("maps every parallel tier the mock generator emits", () => {
    expect(resolveEffectFromMarketEffect("superfractor")).toBe("rainbow");
    expect(resolveEffectFromMarketEffect("gold")).toBe("gold");
    expect(resolveEffectFromMarketEffect("refractor")).toBe("refractor");
    expect(resolveEffectFromMarketEffect("prism")).toBe("pearl");
    expect(resolveEffectFromMarketEffect("none")).toBe("original");
  });

  it("is case-insensitive and null-safe", () => {
    expect(resolveEffectFromMarketEffect("SuperFractor")).toBe("rainbow");
    expect(resolveEffectFromMarketEffect(null)).toBe("original");
    expect(resolveEffectFromMarketEffect(undefined)).toBe("original");
    expect(resolveEffectFromMarketEffect("")).toBe("original");
  });

  it("does not mistake superfractor for refractor", () => {
    // Guard against the substring trap: if this ever returns "refractor" the
    // 1/1 tier is being rendered with the wrong finish.
    expect(resolveEffectFromMarketEffect("superfractor")).not.toBe("refractor");
  });

  it("gives each tier a distinct finish", () => {
    const tiers = ["superfractor", "gold", "refractor", "prism"];
    const resolved = tiers.map(resolveEffectFromMarketEffect);
    expect(new Set(resolved).size).toBe(tiers.length);
  });
});

describe("resolveEffectFromVariant", () => {
  it("recognises superfractor, prism and the classic parallels", () => {
    expect(resolveEffectFromVariant("SuperFractor 1/1")).toBe("rainbow");
    expect(resolveEffectFromVariant("Gold Refractor")).toBe("gold");
    expect(resolveEffectFromVariant("Silver Prizm")).toBe("silver");
    expect(resolveEffectFromVariant("Prizm")).toBe("pearl");
    expect(resolveEffectFromVariant("Refractor")).toBe("refractor");
    expect(resolveEffectFromVariant("Base")).toBe("original");
  });
});
