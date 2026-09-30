"use client";

// Public entry point for the 3D card.
//
// `ssr: false` + a dynamic import keeps the WebGL code out of the prerendered
// HTML entirely: the server emits the loading shell and the engine only arrives
// when this component actually renders in a browser.

import dynamic from "next/dynamic";
import type { CardEffectsViewerProps } from "./types";

const WebGLCardViewer = dynamic(() => import("./WebGLCardViewer"), {
  ssr: false,
  loading: () => <div className="cardFx cardFxLoading" aria-hidden />,
});

export function CardEffectsViewer(props: CardEffectsViewerProps) {
  return <WebGLCardViewer {...props} />;
}
