interface SymbolSelectorProps {
  symbols: string[];
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

export function SymbolSelector({
  symbols,
  selectedSymbol,
  onSymbolChange,
}: SymbolSelectorProps) {
  return (
    <div className="mb-4 relative z-20">
      <label htmlFor="symbol-selector" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
        Trading Pair
      </label>
      <div className="relative">
        <select
          id="symbol-selector"
          value={selectedSymbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg bg-[var(--background-tertiary)] text-[var(--text-primary)] font-mono text-base font-medium focus:outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] appearance-none cursor-pointer transition-colors"
          style={{ position: 'relative', zIndex: 30 }}
        >
          {symbols.map((symbol) => (
            <option
              key={symbol}
              value={symbol}
              className="bg-[var(--background-tertiary)] text-[var(--text-primary)] py-2"
            >
              {symbol} / USD
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[var(--text-secondary)] z-40">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
