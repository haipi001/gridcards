"use client";

import { useState } from "react";
import CardVisual from "@/components/CardVisual";
import { CardEffectsViewer } from "@/components/card-effects/CardEffectsViewer";
import { rarityMeta } from "@/market/rarity";
import { resolveEffectFromMarketEffect } from "@/components/card-effects/effectProfiles";
import type { MarketItem } from "@/market/types";

// Detail-page hero: a large floating card.
//
// When the checklist has a real 1/1 scan for this subject the RuiC foil engine
// renders it in WebGL (lazy-loaded, WebGL-optional with a CSS3D fallback).
// Otherwise the livery art is shown in a CSS-only floating frame — the grid and
// every list view stay free of WebGL by design.

export default function ItemGallery({ item }: { item: MarketItem }) {
  const [mode, setMode] = useState<"art" | "fx">("art");
  const meta = rarityMeta(item.rarity);
  const canFx = Boolean(item.image);
  // The foil follows the parallel tier — a 1/1 SuperFractor should not render
  // with the same finish as a base card.
  const effect = resolveEffectFromMarketEffect(item.effect);

  return (
    <div className="mGallery">
      <div
        className="mStage"
        style={
          { "--rarity": meta.color, "--rarityGlow": meta.glow } as React.CSSProperties
        }
      >
        {canFx && mode === "fx" ? (
          <div className="mStageFx">
            <CardEffectsViewer
              frontUrl={item.image as string}
              effect={effect}
              autoRotate
              interactive
            />
          </div>
        ) : (
          <div className="mStageCard" data-effect={item.effect ?? "none"}>
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image} alt={`${item.title} · ${item.parallel}`} />
            ) : (
              <CardVisual
                art={item.art.kind}
                a={item.art.c1}
                b={item.art.c2}
                className="mStageArt"
              />
            )}
            <span className="mStageSheen" aria-hidden />
          </div>
        )}
        <span className="mStageGlow" aria-hidden />
        <span className="mStageRarity">{meta.label}</span>
      </div>

      {canFx ? (
        <div className="mGallerySwitch">
          <button
            type="button"
            className={`mSegBtn${mode === "art" ? " on" : ""}`}
            onClick={() => setMode("art")}
          >
            平面
          </button>
          <button
            type="button"
            className={`mSegBtn${mode === "fx" ? " on" : ""}`}
            onClick={() => setMode("fx")}
          >
            3D 镭射
          </button>
        </div>
      ) : (
        <div className="mGalleryHint">
          该版本暂无实物扫描图，卡面由车队涂装色生成 · 悬停查看浮动效果
        </div>
      )}
    </div>
  );
}
