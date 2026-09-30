"use client";

// The card viewer: RuiC foil shaders on raw WebGL, with a CSS 3D fallback.
//
// The renderer lives in its own chunk and is imported only once the host
// element is close to the viewport — a checklist grid must never pay for WebGL.
// If anything goes wrong (no WebGL, shader will not compile, context lost) the
// card still shows as a flat image with a CSS tilt: degraded, not broken.

import { useEffect, useRef, useState } from "react";
import type { CardEffectsViewerProps } from "./types";
import type { RuicHandle } from "./RuicRenderer";

export default function WebGLCardViewer({
  frontUrl,
  backUrl,
  effect = "original",
  interactive = true,
  allowFlip = true,
  autoRotate = false,
  quality = "medium",
  className = "",
}: CardEffectsViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<RuicHandle | null>(null);
  const [failed, setFailed] = useState(false);
  const [side, setSide] = useState<"front" | "back">("front");

  // A card can only be turned over when we actually hold an image of its back.
  // Everything else (checklist scans, generated art) is front-only, and saying
  // so is better than flipping to a blank shader texture.
  const canFlip = allowFlip && Boolean(backUrl);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let handle: RuicHandle | null = null;
    let disposed = false;

    const boot = async () => {
      const { createRuicRenderer } = await import("./RuicRenderer");
      if (disposed) return;
      const created = createRuicRenderer({
        canvas,
        front: frontUrl,
        back: backUrl,
        profile: effect,
        interactive,
        autoRotate,
        allowFlip: canFlip,
        quality,
        onFail: () => setFailed(true),
      });
      if (!created) {
        setFailed(true);
        return;
      }
      handle = created;
      handleRef.current = created;
    };

    if (typeof IntersectionObserver === "undefined") {
      void boot();
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            void boot();
          }
        },
        { rootMargin: "180px" },
      );
      io.observe(host);
      return () => {
        disposed = true;
        io.disconnect();
        handle?.dispose();
        handleRef.current = null;
      };
    }

    return () => {
      disposed = true;
      handle?.dispose();
      handleRef.current = null;
    };
  }, [frontUrl, backUrl, effect, interactive, canFlip, autoRotate, quality]);

  // A profile switch is a uniform update, not a rebuild.
  useEffect(() => {
    handleRef.current?.setProfile(effect);
  }, [effect]);

  // The renderer owns the animation, so "flip" is a nudge to its target angle —
  // the same thing a double-click does.
  const turn = (to: "front" | "back") => {
    if (!canFlip) return;
    handleRef.current?.flip();
    setSide(to);
  };

  return (
    <div className={`cardFx ${className}`} ref={hostRef} data-effect={effect}>
      {failed ? (
        <div className="cardFxFlat">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={frontUrl} alt="Card front" />
          <span className="cardFxSheen" />
        </div>
      ) : (
        <canvas className="cardFxCanvas" ref={canvasRef} />
      )}

      {allowFlip && !failed && (
        <div className="cardFxFlip" role="group" aria-label="Card side">
          <button
            type="button"
            className={side === "front" ? "on" : ""}
            onClick={() => side !== "front" && turn("front")}
            aria-pressed={side === "front"}
          >
            正面
          </button>
          <button
            type="button"
            className={side === "back" ? "on" : ""}
            onClick={() => side !== "back" && turn("back")}
            disabled={!canFlip}
            aria-pressed={side === "back"}
            title={canFlip ? undefined : "本藏品暂无背面影像"}
          >
            反面
          </button>
        </div>
      )}

      <span className="cardFxHint">
        {failed
          ? "CSS 3D"
          : canFlip
            ? "拖拽旋转 · 双击或点反面翻面 · 滚轮缩放"
            : "拖拽旋转 · 滚轮缩放 · 本站仅收录该卡正面影像"}
      </span>
      {backUrl ? <span className="sr-only">Back image available</span> : null}
    </div>
  );
}
