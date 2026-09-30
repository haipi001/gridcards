"use client";

// The hero card on an edition page.
//
// Same rule as everywhere else on the site: if we hold a real photograph of the
// card, show it — flat by default (server-painted, instant) with an opt-in 3D
// foil pass. If we do not, fall back to the generated livery art rather than
// inventing a scan.

import { useState } from "react";
import CardVisual from "@/components/CardVisual";
import { CardEffectsViewer } from "@/components/card-effects/CardEffectsViewer";
import { resolveEffectFromMarketEffect } from "@/components/card-effects/effectProfiles";
import type { ArtKind } from "@/lib/teams";

type Props = {
  name: string;
  label: string;
  cardNo: string;
  art: ArtKind;
  c1: string;
  c2: string;
  /** Real scan, when the market holds one for this exact parallel. */
  image: string | null;
  effect: string | null;
};

export default function EditionGallery({
  name,
  label,
  cardNo,
  art,
  c1,
  c2,
  image,
  effect,
}: Props) {
  const [mode, setMode] = useState<"flat" | "fx">("flat");
  const profile = resolveEffectFromMarketEffect(effect);

  return (
    <div className="mGallery">
      <div className="serialVisual">
        {image && mode === "fx" ? (
          <div className="serialFx">
            <CardEffectsViewer
              frontUrl={image}
              effect={profile}
              autoRotate
              interactive
            />
          </div>
        ) : image ? (
          <div className="mStageCard" data-effect={effect ?? "none"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={`${label} — ${name}`} />
            <span className="mStageSheen" aria-hidden />
          </div>
        ) : (
          <div
            className="cardObject"
            style={{ "--c1": c1, "--c2": c2, width: "48%" } as React.CSSProperties}
          >
            <span className="cardNo">#{cardNo}</span>
            <CardVisual className="cardArt" art={art} a={c1} b={c2} />
            <span className="cardName">{name.toUpperCase()}</span>
          </div>
        )}
      </div>

      {image ? (
        <div className="mGallerySwitch">
          <button
            type="button"
            className={`mSegBtn${mode === "flat" ? " on" : ""}`}
            onClick={() => setMode("flat")}
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
          该版本暂无实物照，卡面由涂装色生成 · 拖拽可查看 3D
        </div>
      )}
    </div>
  );
}
