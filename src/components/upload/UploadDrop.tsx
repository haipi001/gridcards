"use client";

// Pick a photo of a real card. Everything happens on this device: the file is
// decoded into a canvas and re-encoded, which is also how EXIF/GPS disappears
// (see lib/upload/ingest.ts). Nothing is uploaded anywhere.

import { useEffect, useRef, useState } from "react";
import { ingestImage, kb, MAX_RAW_BYTES, type IngestResult } from "@/lib/upload/ingest";

export type Ingested = {
  result: IngestResult;
  previewUrl: string;
  /** Caller owns the URL after this point. */
  release: () => void;
};

export default function UploadDrop({
  label = "正面 Front",
  onIngested,
  onClear,
}: {
  label?: string;
  onIngested?: (ingested: Ingested) => void;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<IngestResult | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    [],
  );

  const release = () => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setPreview(null);
    }
  };

  const run = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const result = await ingestImage(file);
      release();
      const previewUrl = URL.createObjectURL(result.card);
      previewRef.current = previewUrl;
      setPreview(previewUrl);
      setInfo(result);
      onIngested?.({ result, previewUrl, release });
    } catch (e) {
      setInfo(null);
      setError(e instanceof Error ? e.message : "无法处理这张图片");
    } finally {
      setBusy(false);
    }
  };

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void run(file);
  };

  return (
    <div
      className={`uploadDrop ${dragging ? "dragging" : ""} ${info ? "filled" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        hidden
        onChange={(e) => pick(e.target.files)}
      />

      <button type="button" className="uploadZone" onClick={() => inputRef.current?.click()}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={label} />
        ) : (
          <span className="uploadHint">
            <b>{label}</b>
            <em>{busy ? "处理中…" : "点击选择或拖入照片"}</em>
            <small>JPEG / PNG / WebP / AVIF · 最大 {MAX_RAW_BYTES / 1048576}MB · 最短边 300px</small>
          </span>
        )}
      </button>

      {info && (
        <div className="uploadMeta">
          <span>
            {info.width}×{info.height} → 三档 {kb(info.bytes.full)} / {kb(info.bytes.card)} /{" "}
            {kb(info.bytes.thumb)}
          </span>
          <span className="mut">EXIF/GPS 已剥离（canvas 重编码）</span>
          <button
            type="button"
            className="link"
            onClick={() => {
              release();
              setInfo(null);
              onClear?.();
            }}
          >
            移除
          </button>
        </div>
      )}

      {error && <div className="uploadError">{error}</div>}
    </div>
  );
}
