// Foil shaders for the card viewer.
//
// Derived from RuiC-card-skill — MIT — Copyright (c) 2026 HRuiCcc
// Source: vendor/ruic-card-skill/assets/web-template/app.js (vendored, LICENSE
// kept alongside). Two adaptations were needed to run them on raw WebGL
// instead of three.js:
//
//   1. three injects `uv`, `position`, `projectionMatrix`, `modelViewMatrix`
//      for free. Here they are declared explicitly (aPos / aUv / uMVP).
//   2. the original ends with `pow(col, 2.2)` followed by three's
//      <colorspace_fragment>, which converts linear → sRGB. Those two cancel
//      out, so the sRGB value is written directly.
//
// Everything between — the foil film, the sweep band, the edge highlight, the
// sparkle, and the rule that black print must stay readable — is upstream code.

export const RUIC_VERTEX = `
attribute vec3 aPos;
attribute vec2 aUv;
uniform mat4 uMVP;
varying vec2 vUv;
void main() {
  vUv = vec2(aUv.x, 1.0 - aUv.y);
  gl_Position = uMVP * vec4(aPos, 1.0);
}
`;

const COMMON = `
precision highp float;
varying vec2 vUv;
uniform float uTime, uFoil, uScale, uDepth, uBgDepth, uFinish, uHasLine, uRelief, uSafeScale, uFxDepth, uHasFx;
uniform vec2 uFit, uSafeOffset;
uniform vec3 uView;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float inside(vec2 p) { return step(0.,p.x)*step(0.,p.y)*step(p.x,1.)*step(p.y,1.); }
vec2 parallax(vec2 uv, float depth) {
  return uv + uView.xy / max(abs(uView.z), .4) * depth * .10;
}
vec3 spectrum(float phase) {
  return .66 + .25 * cos(6.28318 * (phase + vec3(0., .33, .67)));
}
// Only "original" (uFinish ~ 2) disables the foil; pearl/silver/gold all use it.
float strength() { return abs(uFinish - 2.0) < 0.05 ? 0. : uFoil; }
vec3 film(vec2 uv) {
  float phase = uv.x * .85 + uv.y * .55 + uView.x * 1.5 - uView.y * .9;
  if (uFinish > 2.5) {
    // 烫金 (gold foil): warm gold laminate that shifts with the viewing angle.
    float hi = 0.5 + 0.5 * sin(phase * 6.28318);
    float glint = 0.5 + 0.5 * cos((phase + 0.25) * 6.28318);
    vec3 deep = vec3(.72, .50, .20);
    vec3 bright = vec3(1.00, .90, .60);
    return mix(deep, bright, hi * .7 + glint * .3);
  }
  vec3 color = spectrum(phase);
  return mix(color, vec3(dot(color,vec3(.2126,.7152,.0722))), step(.5,uFinish));
}
float sweep(vec2 uv) {
  return pow(.5+.5*sin((uv.x*.72+uv.y*.45+uView.x*1.2+uView.y*.6)*6.283),10.);
}
`;

export const RUIC_FRONT_FRAGMENT =
  COMMON +
  `
uniform sampler2D tSubject, tBackground, tText, tLine, tEffects;
void main() {
  vec2 uv = vUv;
  vec2 su = ((parallax(uv,uDepth)-.5)*uScale/uFit+.5)*uSafeScale+uSafeOffset;
  vec2 bu = parallax(uv,uBgDepth);
  vec4 subject = texture2D(tSubject,clamp(su,0.,1.));
  subject.a *= inside(su)*(1.-uRelief);
  vec3 bg = texture2D(tBackground,clamp(bu,0.,1.)).rgb;
  vec3 col = mix(bg,subject.rgb,subject.a);
  if (uFinish > 2.5) col = col * vec3(1.02, .95, .78) + vec3(.05, .012, 0.0);
  vec2 eu = parallax(uv,uFxDepth);
  vec4 fx = texture2D(tEffects,clamp(eu,0.,1.));
  col = mix(col,fx.rgb,fx.a*(1.-uRelief)*uHasFx);
  vec3 foil = film(uv);
  float amount = strength();
  float luminance = dot(col,vec3(.2126,.7152,.0722));
  float band = sweep(uv);
  // Laminate changes with the card-local viewing direction; black print stays readable.
  float goldBoost = uFinish > 2.5 ? 1.7 : 1.0;
  col *= 1. - amount * .21 * (1.-foil) * (.2 + band*.8);
  col += foil * amount * band * goldBoost * (.065 + .11*(1.-luminance));
  float edge = 1.-smoothstep(.015,.06,min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y)));
  col = mix(col,foil*.75+.21,edge*amount*(uFinish > 2.5 ? .42 : .3));
  vec2 cell = floor(uv*vec2(480.,720.));
  float flake = step(.994,hash(cell))*pow(.5+.5*sin(hash(cell+8.)*30.+uView.x*20.+uTime*.6),10.);
  col += foil*flake*amount*.13;
  float line = (1.-smoothstep(.06,.25,texture2D(tLine,clamp(su,0.,1.)).r))*uHasLine;
  col += line*inside(su)*subject.a*band*amount*.055;
  vec4 text = texture2D(tText,uv);
  col = mix(col,text.rgb,text.a*(1.-uRelief));
  gl_FragColor = vec4(clamp(col,0.,1.),1.);
}
`;

export const RUIC_BACK_FRAGMENT =
  COMMON +
  `
uniform sampler2D tBack;
void main() {
  vec2 uv=vec2(1.-vUv.x,vUv.y);
  vec4 art=texture2D(tBack,uv);
  vec3 col=vec3(.956,.961,.946);
  col*=1.-strength()*.12*(1.-film(vUv));
  col+=film(vUv)*sweep(vUv)*strength()*.055;
  col=mix(col,art.rgb,art.a);
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
}
`;

/**
 * Upstream drives the finish off a single float:
 *   ~2 = original (foil off), 3 = 烫金 gold, 0 = pearl/refractor, 1 = silver
 * (silver desaturates the spectrum, see `step(.5,uFinish)` in film()).
 */
export const FINISH: Record<string, { finish: number; foil: number }> = {
  original: { finish: 2.0, foil: 0 },
  pearl: { finish: 0.0, foil: 0.55 },
  silver: { finish: 1.0, foil: 0.7 },
  gold: { finish: 3.0, foil: 0.85 },
  refractor: { finish: 0.0, foil: 1.0 },
  rainbow: { finish: 0.0, foil: 1.15 },
  custom: { finish: 0.0, foil: 0.7 },
};
