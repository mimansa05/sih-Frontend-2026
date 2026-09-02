import type { RelocationPlan } from "@/lib/relocation";

/**
 * Dashboard → report-route handoff.
 *
 * The plan travels through sessionStorage rather than being recomputed on the
 * report route: rebuilding it would fire a second round of network routing and
 * could, in principle, produce a document that disagrees with the plan the
 * operator was looking at. Storage also means a refresh or a new tab still
 * renders the same document.
 */

export const REPORT_STORAGE_KEY = "discatra-report";

export interface ReportPayload {
  plan: RelocationPlan;
  /** Formal document reference, e.g. DSC/REL/LS-UK-CHM/20260901-1422. */
  reference: string;
  issuedAt: string;
}

const pad = (n: number, width: number) => String(n).padStart(width, "0");

export function buildReference(zoneId: string, at: Date): string {
  const stamp = [
    at.getUTCFullYear(),
    pad(at.getUTCMonth() + 1, 2),
    pad(at.getUTCDate(), 2),
    "-",
    pad(at.getUTCHours(), 2),
    pad(at.getUTCMinutes(), 2),
  ].join("");
  return `DSC/REL/${zoneId.toUpperCase()}/${stamp}`;
}

export function stashReport(plan: RelocationPlan, at: Date = new Date()): ReportPayload {
  /*
   * Route geometry is stripped: a document has no use for it, and the full
   * polylines are the bulk of a plan's JSON.
   */
  const lean: RelocationPlan = {
    ...plan,
    sites: plan.sites.map((s) => ({
      ...s,
      route: s.route ? { ...s.route, coordinates: [] } : null,
    })),
  };
  const payload: ReportPayload = {
    plan: lean,
    reference: buildReference(plan.zone.id, at),
    issuedAt: at.toISOString(),
  };
  try {
    sessionStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage blocked — the report route renders its "no plan" state instead.
  }
  return payload;
}

export function readReport(): ReportPayload | null {
  try {
    const raw = sessionStorage.getItem(REPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReportPayload;
    // Guard against a stale or partial write rendering a half-filled document.
    return parsed?.plan?.zone?.id && parsed.reference ? parsed : null;
  } catch {
    return null;
  }
}
