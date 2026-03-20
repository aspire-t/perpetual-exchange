export function parseAmountToUnits(value: string, decimals: number): bigint {
  const normalized = value.trim();
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('Invalid decimal amount');
  }
  const [integerPart, fractionPart = ''] = normalized.split('.');
  if (fractionPart.length > decimals) {
    throw new Error('Too many decimal places');
  }
  const scaledFraction = fractionPart.padEnd(decimals, '0');
  return BigInt(`${integerPart}${scaledFraction}`);
}

export function tryParsePositiveAmount(value: string, decimals: number): boolean {
  try {
    return parseAmountToUnits(value, decimals) > 0n;
  } catch {
    return false;
  }
}

export function formatAmountFromUnits(
  value: string | bigint | undefined,
  decimals: number,
  fractionDigits: number = 2,
): string {
  if (value === undefined) {
    return (0).toFixed(fractionDigits);
  }
  try {
    const normalized = typeof value === 'bigint' ? value : BigInt(value || '0');
    const divisor = 10n ** BigInt(decimals);
    const integer = normalized / divisor;
    const fraction = normalized % divisor;
    const fractionStr = fraction
      .toString()
      .padStart(decimals, '0')
      .slice(0, fractionDigits)
      .padEnd(fractionDigits, '0');
    return `${integer.toString()}.${fractionStr}`;
  } catch {
    return (0).toFixed(fractionDigits);
  }
}
