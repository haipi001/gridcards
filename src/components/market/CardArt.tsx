import CardVisual from "@/components/CardVisual";
import { rarityMeta } from "@/market/rarity";
import type { CardArt as Art, RarityTier } from "@/market/types";

/**
 * One card face: a real 1/1 scan when the checklist has one, otherwise livery
 * art generated from the constructor's real colours.
 */
export function CardFace({
  art,
  image,
  rarity,
  title,
  effect,
  className,
}: {
  art: Art;
  image: string | null;
  rarity: RarityTier;
  title: string;
  /** Foil tier, straight from MarketItem.effect. Drives the CSS foil layer. */
  effect?: string;
  className?: string;
}) {
  const meta = rarityMeta(rarity);
  return (
    <div
      className={`mFace${className ? ` ${className}` : ""}`}
      data-effect={effect ?? "none"}
      style={{ "--rarity": meta.color, "--rarityGlow": meta.glow } as React.CSSProperties}
    >
      {image ? (
        // Real scan: served from /img/archive, dimensions vary per card.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={title} loading="lazy" decoding="async" />
      ) : (
        <CardVisual art={art.kind} a={art.c1} b={art.c2} className="mFaceArt" />
      )}
      <span className="mFaceSheen" aria-hidden />
      <span className="mFaceEdge" aria-hidden />
    </div>
  );
}

export function RarityBadge({
  tier,
  size = "md",
}: {
  tier: RarityTier;
  size?: "sm" | "md";
}) {
  const meta = rarityMeta(tier);
  return (
    <span
      className={`mRarity ${size}`}
      style={
        { "--rarity": meta.color, "--rarityGlow": meta.glow } as React.CSSProperties
      }
    >
      <i aria-hidden />
      {meta.label}
    </span>
  );
}

export function RarityDot({ tier }: { tier: RarityTier }) {
  const meta = rarityMeta(tier);
  return (
    <span
      className="mRarityDot"
      style={{ background: meta.color, boxShadow: `0 0 8px ${meta.glow}` }}
      aria-hidden
    />
  );
}
