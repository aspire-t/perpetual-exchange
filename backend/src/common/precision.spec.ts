import {
  INTERNAL_DECIMALS,
  QUOTE_DECIMALS,
  INTERNAL_TO_QUOTE_SCALE,
  scaleInternalToQuoteRoundedUp,
  scaleQuoteToInternal,
} from './precision';

describe('precision', () => {
  it('should expose internal and quote decimals', () => {
    expect(INTERNAL_DECIMALS).toBe(18);
    expect(QUOTE_DECIMALS).toBe(6);
    expect(INTERNAL_TO_QUOTE_SCALE).toBe(BigInt('1000000000000'));
  });

  it('should scale internal amount to quote with round-up', () => {
    expect(scaleInternalToQuoteRoundedUp(BigInt('1'))).toBe(BigInt('1'));
    expect(
      scaleInternalToQuoteRoundedUp(BigInt('1000000000000000000')),
    ).toBe(BigInt('1000000'));
  });

  it('should scale quote amount back to internal precision', () => {
    expect(scaleQuoteToInternal(BigInt('1'))).toBe(BigInt('1000000000000'));
  });
});
