// Resets localStorage between tests so each unit starts from a clean ledger /
// market snapshot — mirrors a fresh browser tab.
import { beforeEach } from "vitest";

beforeEach(() => {
  window.localStorage.clear();
});
