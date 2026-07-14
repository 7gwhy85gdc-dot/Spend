export function toMinorUnits(value: number | string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

export function fromMinorUnits(value: number): number {
  return Math.round(value) / 100;
}

export function hasValidCurrencyPrecision(value: number | string): boolean {
  const text = String(value).trim();
  return /^\d+(?:\.\d{1,2})?$/.test(text) && toMinorUnits(value) > 0;
}
