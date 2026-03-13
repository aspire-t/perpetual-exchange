'use client';

import { useState } from 'react';

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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-4 relative">
      <label htmlFor="symbol-selector" className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
        Trading Pair
      </label>
      <div className="relative">
        <div
          id="symbol-selector"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 pr-12 border border-[var(--border-default)] rounded-lg bg-[var(--background-tertiary)] text-[var(--text-primary)] font-mono text-base font-medium focus:outline-none focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)] cursor-pointer transition-colors flex items-center justify-between"
        >
          <span>{selectedSymbol} / USD</span>
          <svg className="h-5 w-5 text-[var(--text-secondary)] transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute z-20 w-full mt-1 bg-[var(--background-tertiary)] border border-[var(--border-default)] rounded-lg shadow-lg overflow-hidden">
              {symbols.map((symbol) => (
                <div
                  key={symbol}
                  onClick={() => {
                    onSymbolChange(symbol);
                    setIsOpen(false);
                  }}
                  className="px-4 py-3 cursor-pointer hover:bg-[var(--background-elevated)] text-[var(--text-primary)] font-mono text-base font-medium flex items-center justify-between"
                >
                  <span>{symbol} / USD</span>
                  {selectedSymbol === symbol && (
                    <svg className="h-5 w-5 text-[var(--accent-blue)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
