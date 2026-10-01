"use client";

// Multi-photo picker — up to `max` pictures, each one through the same ingest
// pipeline as /sell (magic-byte check, EXIF/GPS stripped by the canvas
// re-encode). Bytes stay on the device until the caller commits them.

import { useEffect, useRef, useState } from "react";
import { ingestImage, kb, type IngestResult } from "@/lib/upload/ingest";

export type PickedPhoto = {
  id: string;
  result: IngestResult;
  previewUrl: string;
};

export default function PhotoPicker({
  value,
  onChange,
  max = 3,
  hint = "实拍照片",
}: {
  value: PickedPhoto[];
  onChange: (next: PickedPhoto[]) => void;
  max?: number;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Object URLs outlive React's render cycle; revoke the ones we handed out.
  const owned = useRef<string[]>([]);
  useEffect(
    () => () => {
      for (const u of owned.current) URL.revokeObjectURL(u);
      owned.current = [];
    },
    [],
  );

  const add = async (files: FileList | null) => {
    const incoming = Array.from(files ?? []);
    if (!incoming.length) return;
    setBusy(true);
    setError(null);
    const next = [...value];
    try {
      for (const file of incoming) {
        if (next.length >= max) break;
        const result = await ingestImage(file);
        const previewUrl = URL.createObjectURL(result.card);
        owned.current.push(previewUrl);
        next.push({
          id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          result,
          previewUrl,
        });
      }
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法处理这张图片");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const drop = (id: string) => {
    const gone = value.find((p) => p.id === id);
    if (gone) {
      URL.revokeObjectURL(gone.previewUrl);
      owned.current = owned.current.filter((u) => u !== gone.previewUrl);
    }
    onChange(value.filter((p) => p.id !== id));
  };

  return (
    <div className="photoPicker">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        hidden
        multiple
        onChange={(e) => void add(e.target.files)}
      />
      <div className="photoSlots">
        {value.map((p) => (
          <div className="photoSlot" key={p.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.previewUrl} alt="实拍证据" />
            <button type="button" onClick={() => drop(p.id)} aria-label="移除这张照片">
              ×
            </button>
            <span className="photoSlotMeta">
              {p.result.width}×{p.result.height} · {kb(p.result.bytes.card)}
            </span>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            className="photoAdd"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <b>＋</b>
            <em>{busy ? "处理中…" : hint}</em>
            <small>
              还可加 {max - value.length} 张 · 最多 {max} 张
            </small>
          </button>
        )}
      </div>
      {error ? (
        <div className="uploadError">{error}</div>
      ) : (
        <p className="photoNote">
          照片在此设备上重新编码，EXIF / GPS 在编码时即被剥离；只作为你自己的持有凭证，不构成鉴定结论。
        </p>
      )}
    </div>
  );
}
