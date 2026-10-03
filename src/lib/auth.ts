"use client";

// End-user session for the community board. Web apps support email login only.
// Components call `useSession()` to render the login gate; the auth actions below
// are used by the login modal.

import { useEffect, useState } from "react";
import { getCloud } from "./cloud";
import { CLOUD } from "./backend";

export type AuthUser = {
  id: string;
  email?: string;
  name?: string;
};

export function useSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  // Build-time constant, so the server prerender and the first client render
  // agree. When there is no cloud there is nothing to wait for, and the `false`
  // never has to be written from inside the effect.
  const [loading, setLoading] = useState(CLOUD);

  useEffect(() => {
    const c = getCloud();
    if (!c) return;
    let active = true;
    c.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setUser(data?.user ? (data.user as AuthUser) : null);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    const unsub = c.auth.onAuthStateChange((_e, s) => {
      if (!active) return;
      setUser(s?.user ? (s.user as AuthUser) : null);
    });
    return () => {
      active = false;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  return { user, loading, isAuthed: Boolean(user) };
}
