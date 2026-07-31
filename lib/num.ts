/**
 * Parses a FormData numeric field as a non-negative number, clamping bad
 * input (negative, NaN, missing) to a safe fallback. HTML `min="0"` on the
 * input is a UX hint only — browsers don't reliably block a typed negative
 * value, so amounts, rates, and quantities are re-validated here.
 */
export function nonNegativeNumber(value: FormDataEntryValue | null, fallback = 0) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, n);
}
