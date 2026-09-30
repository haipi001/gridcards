"use client";

// Bridge between React and browser-only state for the statically exported app.
//
// Because every page is prerendered, anything that only exists in the browser
// (localStorage, window.location) cannot be read during SSR. The old code read
// it inside useEffect + setState, which (a) cascades an extra render and
// (b) trips react-hooks/set-state-in-effect. `useSyncExternalStore` is the
// supported way to do this: a server snapshot keeps the prerendered markup
// deterministic, and React swaps in the browser snapshot right after hydration.

import { useSyncExternalStore } from "react";

/** Never fires: the value only changes once, at hydration. */
const noopSubscribe = () => () => {};

/** False while prerendering / hydrating, true once the browser owns the tree. */
export function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function subscribeLocation(fn: () => void) {
  // pushState/replaceState do not emit popstate, so also watch the custom
  // event the app dispatches after a client-side URL change.
  window.addEventListener("popstate", fn);
  window.addEventListener("hashchange", fn);
  window.addEventListener("gridcards:url", fn);
  return () => {
    window.removeEventListener("popstate", fn);
    window.removeEventListener("hashchange", fn);
    window.removeEventListener("gridcards:url", fn);
  };
}

const readSearch = () => window.location.search;

/** Query string of the current URL; "" during prerender. */
export function useLocationSearch(): string {
  return useSyncExternalStore(subscribeLocation, readSearch, () => "");
}
