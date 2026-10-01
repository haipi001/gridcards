// Local identity — who "you" are on this device.
//
// There is no account server (static export), so the profile is a browser
// record like the watchlist: a handle, a short bio and an avatar pick. It
// exists so posts, claims and comments have a stable author name to show.
//
// It is deliberately NOT the market `Account` (src/market/types.ts) — that one
// carries DEMO balances and is owned by the market mock.

export type LocalProfile = {
  /** Stored without the leading "@"; rendered with it. */
  handle: string;
  bio: string;
  /** Index into AVATARS. */
  avatar: number;
  createdAt: number;
};

export const AVATARS = [
  "linear-gradient(135deg,#66dbff,#654fff,#d36bff)",
  "linear-gradient(135deg,#ffbf58,#ff6477)",
  "linear-gradient(135deg,#67de84,#327cff)",
  "linear-gradient(135deg,#ffd76e,#ff8a3d)",
  "linear-gradient(135deg,#7be5ff,#2f6bff 60%,#0b1020)",
  "linear-gradient(135deg,#f7a8ff,#7a5cff)",
] as const;

export const DEFAULT_PROFILE: LocalProfile = {
  handle: "you",
  bio: "",
  avatar: 0,
  createdAt: 0,
};

const KEY = "gridcards:profile:v1";
export const PROFILE_EVENT = "gridcards:profile";
const EVENT = PROFILE_EVENT;

export function avatarCss(i: number): string {
  return AVATARS[((i % AVATARS.length) + AVATARS.length) % AVATARS.length];
}

function normalize(raw: unknown): LocalProfile {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PROFILE };
  const r = raw as Partial<LocalProfile>;
  const handle = typeof r.handle === "string" ? r.handle.trim() : "";
  return {
    handle: handle.replace(/^@+/, "").slice(0, 24) || DEFAULT_PROFILE.handle,
    bio: typeof r.bio === "string" ? r.bio.slice(0, 160) : "",
    avatar: typeof r.avatar === "number" ? Math.floor(r.avatar) : 0,
    createdAt: typeof r.createdAt === "number" ? r.createdAt : 0,
  };
}

export function readProfile(): LocalProfile {
  if (typeof window === "undefined") return { ...DEFAULT_PROFILE };
  return normalize(JSON.parse(window.localStorage.getItem(KEY) ?? "null"));
}

/** One frozen object shared by every prerender — stable server snapshot. */
export const SERVER_PROFILE: LocalProfile = { ...DEFAULT_PROFILE };

let cachedRaw: string | null | undefined;
let cached: LocalProfile = SERVER_PROFILE;

export function profileSnapshot(): LocalProfile {
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = normalize(raw ? JSON.parse(raw) : null);
  }
  return cached;
}

export function saveProfile(patch: Partial<LocalProfile>): LocalProfile {
  const next = normalize({ ...readProfile(), ...patch });
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
  return next;
}

/** "@you" — the label used on posts and comments. */
export function handleLabel(p: LocalProfile): string {
  return `@${p.handle}`;
}

export function subscribeProfile(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}
