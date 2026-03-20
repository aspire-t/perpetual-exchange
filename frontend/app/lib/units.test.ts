import {
  formatAmountFromUnits,
  parseAmountToUnits,
  tryParsePositiveAmount,
} from './units';

describe('units', () => {
  it('parses decimal amount to target units', () => {
    expect(parseAmountToUnits('1.23', 6)).toBe(1230000n);
  });

  it('returns true only for positive valid amounts', () => {
    expect(tryParsePositiveAmount('0.01', 18)).toBe(true);
    expect(tryParsePositiveAmount('0', 18)).toBe(false);
    expect(tryParsePositiveAmount('abc', 18)).toBe(false);
  });

  it('formats raw units string to fixed decimal string', () => {
    expect(formatAmountFromUnits('1500000', 6, 2)).toBe('1.50');
    expect(formatAmountFromUnits(undefined, 6, 2)).toBe('0.00');
  });
});
