import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { SymbolSelector } from './SymbolSelector';

describe('SymbolSelector', () => {
  const mockSymbols = ['ETH', 'BTC', 'SOL'];
  const mockOnSymbolChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render symbol selector with available symbols', () => {
    render(
      <SymbolSelector
        symbols={mockSymbols}
        selectedSymbol="ETH"
        onSymbolChange={mockOnSymbolChange}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should display the currently selected symbol', () => {
    render(
      <SymbolSelector
        symbols={mockSymbols}
        selectedSymbol="BTC"
        onSymbolChange={mockOnSymbolChange}
      />
    );

    expect(screen.getByRole('combobox')).toHaveValue('BTC');
  });

  it('should call onSymbolChange when a different symbol is selected', () => {
    render(
      <SymbolSelector
        symbols={mockSymbols}
        selectedSymbol="ETH"
        onSymbolChange={mockOnSymbolChange}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'BTC' } });

    expect(mockOnSymbolChange).toHaveBeenCalledWith('BTC');
    expect(mockOnSymbolChange).toHaveBeenCalledTimes(1);
  });

  it('should have a label describing the selector', () => {
    render(
      <SymbolSelector
        symbols={mockSymbols}
        selectedSymbol="ETH"
        onSymbolChange={mockOnSymbolChange}
      />
    );

    expect(screen.getByLabelText(/symbol|trading pair|select/i)).toBeInTheDocument();
  });
});
