// Tiny external store so any component can pop the login modal without prop
// drilling. AuthModal subscribes; Composer/PostCard call openAuthModal().

type Listener = () => void;

let open = false;
const listeners = new Set<Listener>();

export function subscribeAuthModal(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function authModalSnapshot(): boolean {
  return open;
}

export function openAuthModal() {
  open = true;
  for (const fn of listeners) fn();
}

export function closeAuthModal() {
  open = false;
  for (const fn of listeners) fn();
}
