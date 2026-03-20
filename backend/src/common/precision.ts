export const INTERNAL_DECIMALS = 18;
export const QUOTE_DECIMALS = 6;
export const INTERNAL_TO_QUOTE_SCALE =
  BigInt(10) ** BigInt(INTERNAL_DECIMALS - QUOTE_DECIMALS);

export function scaleInternalToQuoteRoundedUp(amount: bigint): bigint {
  return (amount + INTERNAL_TO_QUOTE_SCALE - BigInt(1)) / INTERNAL_TO_QUOTE_SCALE;
}

export function scaleQuoteToInternal(amount: bigint): bigint {
  return amount * INTERNAL_TO_QUOTE_SCALE;
}
