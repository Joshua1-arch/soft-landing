/**
 * Familiarity Ramp & Novelty Targeting Engine
 * Exact mathematical formulation from Soft Landing specification
 */

export const RAMP_CONSTANTS = {
  TOTAL_WEEKS: 12,
  EASE_EXPONENT: 0.85,
  LO_BASE: 0.15,
  LO_ADVENTURE_SCALE: 0.10,
  HI_BASE: 0.45,
  HI_ADVENTURE_SCALE: 0.25,
} as const;

/**
 * Computes the target novelty N(w) in [0, 1] for week w in 1..12
 * @param week 1-indexed week number (1 to 12)
 * @param adventure 0 to 100 adventure level (default 50)
 */
export function computeTargetNovelty(week: number, adventure: number = 50): number {
  const w = Math.max(1, Math.min(RAMP_CONSTANTS.TOTAL_WEEKS, week));
  const A = Math.max(0, Math.min(100, adventure)) / 100; // Normalized 0..1

  const ramp = (w - 1) / (RAMP_CONSTANTS.TOTAL_WEEKS - 1); // 0 at w=1, 1 at w=12
  const ease = Math.pow(ramp, RAMP_CONSTANTS.EASE_EXPONENT);

  const lo = RAMP_CONSTANTS.LO_BASE + RAMP_CONSTANTS.LO_ADVENTURE_SCALE * A;
  const hi = RAMP_CONSTANTS.HI_BASE + RAMP_CONSTANTS.HI_ADVENTURE_SCALE * A;

  const rawNovelty = lo + (hi - lo) * ease;
  const clamped = Math.max(0, Math.min(1, rawNovelty));

  // Round to 4 decimal places for floating-point stability
  return Math.round(clamped * 10000) / 10000;
}

/**
 * Generates all 12 target novelties for a given adventure level
 */
export function computeFullCurve(adventure: number = 50): number[] {
  return Array.from({ length: RAMP_CONSTANTS.TOTAL_WEEKS }, (_, i) =>
    computeTargetNovelty(i + 1, adventure)
  );
}
