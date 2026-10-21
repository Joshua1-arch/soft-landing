import type {
  UserPreferences,
  PlanWeek,
  CultureGapReadout,
  InsightResult,
} from "./qloo/types.ts";

export const STORAGE_KEY = "softlanding.v1";

export interface AppState {
  version: 1;
  personaId?: string;
  user: UserPreferences;
  gapReadout: CultureGapReadout;
  weeks: PlanWeek[];
  candidatePool: InsightResult[];
  lastUpdated: number;
}

export function saveStateToStorage(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save state to localStorage:", err);
  }
}

export function loadStateFromStorage(): AppState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1) {
      return parsed as AppState;
    }
  } catch (err) {
    console.error("Failed to parse state from localStorage:", err);
  }
  return null;
}

export function clearStateStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear localStorage:", err);
  }
}
