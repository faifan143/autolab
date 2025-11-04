const UNIT_IN_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 60 * 60 * 24,
  w: 60 * 60 * 24 * 7,
};

export const resolveTokenTtl = (
  value: string | number | undefined,
  fallbackSeconds: number,
): number => {
  if (!value && value !== 0) {
    return fallbackSeconds;
  }

  if (typeof value === 'number') {
    return value;
  }

  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/^(\d+)([smhdw])$/);

  if (match) {
    const [, quantity, unit] = match;
    const multiplier = UNIT_IN_SECONDS[unit];
    return Number(quantity) * multiplier;
  }

  const numericValue = Number(trimmed);
  return Number.isNaN(numericValue) ? fallbackSeconds : numericValue;
};
