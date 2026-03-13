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
    <div className="mb-4">
      <label htmlFor="symbol-selector" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
        Trading Pair
      </label>
      <select
        id="symbol-selector"
        value={selectedSymbol}
        onChange={(e) => onSymbolChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-[var(--border-default)] rounded bg-[var(--background-tertiary)] text-[var(--text-primary)] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
      >
        {symbols.map((symbol) => (
          <option
            key={symbol}
            value={symbol}
            className="bg-[var(--background-tertiary)] text-[var(--text-primary)]"
          >
            {symbol}
          </option>
        ))}
      </select>
    </div>
  );
}
