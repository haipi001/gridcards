// Raw-WebGL card renderer driven by the RuiC foil shaders (see ruicShaders.ts).
//
// Deliberately dependency-free: no three.js, no GLB, no bundler magic. The
// engine is ~200 lines of WebGL 1 calls, so the whole thing can stay in a
// dynamic chunk that only loads when a card viewer is actually on screen.
//
// Failure is a normal outcome, not an exception: no WebGL, a shader that will
// not compile, or a lost context all return null / call onFail so the caller
// can fall back to CSS 3D.

import type { CardEffectProfile } from "./types";
import { FINISH, RUIC_BACK_FRAGMENT, RUIC_FRONT_FRAGMENT, RUIC_VERTEX } from "./ruicShaders";

export type RuicHandle = {
  dispose(): void;
  flip(): void;
  setProfile(profile: CardEffectProfile): void;
  setFront(src: string | null): void;
  setBack(src: string | null): void;
};

export type RuicOptions = {
  canvas: HTMLCanvasElement;
  front?: string | null;
  back?: string | null;
  profile?: CardEffectProfile;
  autoRotate?: boolean;
  interactive?: boolean;
  /**
   * Allow the card to turn over. Defaults to true but only takes effect when a
   * back image was supplied — flipping to the blank "paper" texture would show
   * a card back this site has no image of, which is exactly the kind of
   * invention the archive refuses to make.
   */
  allowFlip?: boolean;
  quality?: "low" | "medium" | "high";
  onFail?: (reason: string) => void;
};

const CARD_W = 2.5;
const CARD_H = 3.5;

// ── mat4 (column-major, the layout WebGL wants) ────────────────────────────
type Mat4 = Float32Array;

function identity(): Mat4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

function perspective(fovDeg: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return m;
}

function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      out[c * 4 + r] =
        a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

function translation(x: number, y: number, z: number): Mat4 {
  const m = identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}

function rotationX(a: number): Mat4 {
  const m = identity();
  const c = Math.cos(a);
  const s = Math.sin(a);
  m[5] = c;
  m[6] = s;
  m[9] = -s;
  m[10] = c;
  return m;
}

function rotationY(a: number): Mat4 {
  const m = identity();
  const c = Math.cos(a);
  const s = Math.sin(a);
  m[0] = c;
  m[2] = -s;
  m[8] = s;
  m[10] = c;
  return m;
}

// ── GL helpers ────────────────────────────────────────────────────────────
function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function link(gl: WebGLRenderingContext, vsSrc: string, fsSrc: string): WebGLProgram | null {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const p = gl.createProgram();
  if (!p) return null;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, "aPos");
  gl.bindAttribLocation(p, 1, "aUv");
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    gl.deleteProgram(p);
    return null;
  }
  return p;
}

function solidTexture(gl: WebGLRenderingContext, rgba: number[]): WebGLTexture | null {
  const t = gl.createTexture();
  if (!t) return null;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(rgba));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}

function imageTexture(gl: WebGLRenderingContext, img: TexImageSource): WebGLTexture | null {
  const t = gl.createTexture();
  if (!t) return null;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}

// ── renderer ──────────────────────────────────────────────────────────────
export function createRuicRenderer(opts: RuicOptions): RuicHandle | null {
  const { canvas } = opts;
  const gl =
    (canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: false }) as
      | WebGLRenderingContext
      | null) ??
    (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
  if (!gl) {
    opts.onFail?.("no-webgl");
    return null;
  }

  const frontProgram = link(gl, RUIC_VERTEX, RUIC_FRONT_FRAGMENT);
  const backProgram = link(gl, RUIC_VERTEX, RUIC_BACK_FRAGMENT);
  if (!frontProgram || !backProgram) {
    opts.onFail?.("shader");
    return null;
  }

  const quad = new Float32Array([
    // x, y, z, u, v
    -CARD_W / 2, -CARD_H / 2, 0, 0, 0,
    CARD_W / 2, -CARD_H / 2, 0, 1, 0,
    CARD_W / 2, CARD_H / 2, 0, 1, 1,
    -CARD_W / 2, -CARD_H / 2, 0, 0, 0,
    CARD_W / 2, CARD_H / 2, 0, 1, 1,
    -CARD_W / 2, CARD_H / 2, 0, 0, 1,
  ]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  const blank = solidTexture(gl, [0, 0, 0, 0]);
  const paper = solidTexture(gl, [244, 245, 241, 255]);
  let frontTex: WebGLTexture | null = null;
  let backTex: WebGLTexture | null = null;

  const reduceMotion =
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = typeof matchMedia === "function" && matchMedia("(max-width: 820px)").matches;
  const dprCap = opts.quality === "low" ? 1 : opts.quality === "medium" ? 1.5 : mobile ? 1.5 : 2;

  let profile: CardEffectProfile = opts.profile ?? "original";
  let rotX = 0;
  let rotY = 0;
  let targetX = 0;
  let targetY = 0;
  let zoom = 1;
  let dragging = false;
  let pointer = { x: 0, y: 0 };
  let raf = 0;
  let dead = false;
  const start = performance.now();

  const load = (src: string | null, assign: (t: WebGLTexture | null) => void) => {
    if (!src) {
      assign(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!dead) assign(imageTexture(gl, img));
    };
    img.src = src;
  };

  if (opts.front) load(opts.front, (t) => (frontTex = t));
  if (opts.back) load(opts.back, (t) => (backTex = t));

  const onDown = (e: PointerEvent) => {
    dragging = true;
    pointer = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = (e.clientX - pointer.x) / 160;
    const dy = (e.clientY - pointer.y) / 160;
    pointer = { x: e.clientX, y: e.clientY };
    targetY += dx;
    targetX = Math.max(-0.7, Math.min(0.7, targetX + dy));
  };
  const onUp = () => {
    dragging = false;
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    zoom = Math.max(0.65, Math.min(2.2, zoom - e.deltaY / 900));
  };
  const onDouble = () => {
    targetY += Math.PI;
  };

  if (opts.interactive !== false) {
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
  }

  // Flipping is opt-out *and* requires a real back image. Without one the
  // renderer would only have its blank paper texture to show.
  const canFlip = opts.allowFlip !== false && Boolean(opts.back);
  if (canFlip) canvas.addEventListener("dblclick", onDouble);

  const onLost = (e: Event) => {
    e.preventDefault();
    dead = true;
    cancelAnimationFrame(raf);
    opts.onFail?.("context-lost");
  };
  canvas.addEventListener("webglcontextlost", onLost);

  const uniforms = (p: WebGLProgram) => ({
    uMVP: gl.getUniformLocation(p, "uMVP"),
    uTime: gl.getUniformLocation(p, "uTime"),
    uFoil: gl.getUniformLocation(p, "uFoil"),
    uScale: gl.getUniformLocation(p, "uScale"),
    uDepth: gl.getUniformLocation(p, "uDepth"),
    uBgDepth: gl.getUniformLocation(p, "uBgDepth"),
    uFinish: gl.getUniformLocation(p, "uFinish"),
    uHasLine: gl.getUniformLocation(p, "uHasLine"),
    uRelief: gl.getUniformLocation(p, "uRelief"),
    uSafeScale: gl.getUniformLocation(p, "uSafeScale"),
    uFxDepth: gl.getUniformLocation(p, "uFxDepth"),
    uHasFx: gl.getUniformLocation(p, "uHasFx"),
    uFit: gl.getUniformLocation(p, "uFit"),
    uSafeOffset: gl.getUniformLocation(p, "uSafeOffset"),
    uView: gl.getUniformLocation(p, "uView"),
    tSubject: gl.getUniformLocation(p, "tSubject"),
    tBackground: gl.getUniformLocation(p, "tBackground"),
    tText: gl.getUniformLocation(p, "tText"),
    tLine: gl.getUniformLocation(p, "tLine"),
    tEffects: gl.getUniformLocation(p, "tEffects"),
    tBack: gl.getUniformLocation(p, "tBack"),
  });
  const frontU = uniforms(frontProgram);
  const backU = uniforms(backProgram);

  const bindQuad = () => {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
  };

  const setCommon = (
    u: ReturnType<typeof uniforms>,
    time: number,
  ) => {
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uScale, 1);
    gl.uniform1f(u.uDepth, 0);
    gl.uniform1f(u.uBgDepth, 0);
    gl.uniform1f(u.uFxDepth, 0);
    gl.uniform1f(u.uHasFx, 0);
    gl.uniform1f(u.uHasLine, 0);
    gl.uniform1f(u.uRelief, 0);
    gl.uniform1f(u.uSafeScale, 1);
    gl.uniform2f(u.uFit, 1, 1);
    gl.uniform2f(u.uSafeOffset, 0, 0);
    gl.uniform3f(u.uView, rotY * 0.9, -rotX * 0.9, 4);
    const f = FINISH[profile] ?? FINISH.original;
    gl.uniform1f(u.uFinish, f.finish);
    gl.uniform1f(u.uFoil, f.foil);
  };

  const frame = () => {
    if (dead) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;

    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    if (!dragging && opts.autoRotate && !reduceMotion) targetY += 0.006;
    rotY += (targetY - rotY) * 0.12;
    rotX += (targetX - rotX) * 0.12;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const aspect = canvas.width / Math.max(1, canvas.height);
    const proj = perspective(35, aspect, 0.1, 100);
    const mv = multiply(
      translation(0, 0, -8 / zoom),
      multiply(rotationX(rotX), rotationY(rotY)),
    );
    const mvp = multiply(proj, mv);
    const time = (performance.now() - start) / 1000;
    const facingBack = Math.cos(rotY) < 0;

    const program = facingBack ? backProgram : frontProgram;
    const u = facingBack ? backU : frontU;
    gl.useProgram(program);
    gl.uniformMatrix4fv(u.uMVP, false, mvp);
    setCommon(u, time);

    if (facingBack) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, backTex ?? paper);
      gl.uniform1i(u.tBack, 0);
    } else {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, frontTex ?? paper);
      gl.uniform1i(u.tSubject, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, paper);
      gl.uniform1i(u.tBackground, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, blank);
      gl.uniform1i(u.tText, 2);
      gl.uniform1i(u.tLine, 2);
      gl.uniform1i(u.tEffects, 2);
    }

    bindQuad();
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  raf = requestAnimationFrame(frame);

  return {
    dispose() {
      dead = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("dblclick", onDouble);
      canvas.removeEventListener("webglcontextlost", onLost);
      for (const t of [frontTex, backTex, blank, paper]) if (t) gl.deleteTexture(t);
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(frontProgram);
      gl.deleteProgram(backProgram);
    },
    flip() {
      targetY += Math.PI;
    },
    setProfile(next) {
      profile = next;
    },
    setFront(src) {
      load(src, (t) => (frontTex = t));
    },
    setBack(src) {
      load(src, (t) => (backTex = t));
    },
  };
}
