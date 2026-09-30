"use client";

// Foil finish picker for an uploaded card. The profiles are the ones the RuiC
// shader understands (see card-effects/ruicShaders.ts FINISH); "original" turns
// the foil off entirely so a photo can look like a photo.

import type { CardEffectProfile } from "@/components/card-effects/types";

const OPTIONS: Array<{ key: CardEffectProfile; label: string; hint: string }> = [
  { key: "original", label: "Original", hint: "无镭射" },
  { key: "pearl", label: "Pearl", hint: "珠光" },
  { key: "silver", label: "Silver", hint: "银" },
  { key: "gold", label: "Gold", hint: "烫金" },
  { key: "refractor", label: "Refractor", hint: "折射" },
  { key: "rainbow", label: "Rainbow", hint: "彩虹" },
];

export default function EffectPicker({
  value,
  onChange,
}: {
  value: CardEffectProfile;
  onChange: (next: CardEffectProfile) => void;
}) {
  return (
    <div className="effectPicker" role="group" aria-label="卡面效果">
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          className={`chip ${value === o.key ? "active" : ""}`}
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          title={o.hint}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
