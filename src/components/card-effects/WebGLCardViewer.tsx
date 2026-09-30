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
  autoRotate = false,
  quality = "medium",
  className = "",
}: CardEffectsViewerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<RuicHandle | null>(null);
  const [failed, setFailed] = useState(false);

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
  }, [frontUrl, backUrl, effect, interactive, autoRotate, quality]);

  // A profile switch is a uniform update, not a rebuild.
  useEffect(() => {
    handleRef.current?.setProfile(effect);
  }, [effect]);

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
      <span className="cardFxHint">{failed ? "CSS 3D" : "drag · dblclick flip · wheel zoom"}</span>
      {backUrl ? <span className="sr-only">Back image available</span> : null}
    </div>
  );
}
