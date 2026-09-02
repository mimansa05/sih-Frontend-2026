import { MOCK_SAFE_SITES } from "./mock/safe-sites";
import type { SafeSite } from "./types";

/**
 * Safe-site data access.
 *
 * The app reads sites through this module rather than importing the mock
 * catalogue directly, so pointing it at a real facilities API is a one-file
 * change. `SAFE_SITES` is the synchronous snapshot the dashboard renders from;
 * `loadSafeSites()` is the async shape a real service will keep.
 */
export const SAFE_SITES: SafeSite[] = MOCK_SAFE_SITES;

export async function loadSafeSites(): Promise<SafeSite[]> {
  return SAFE_SITES;
}

export const sitesInState = (state: string): SafeSite[] =>
  SAFE_SITES.filter((s) => s.state === state);
