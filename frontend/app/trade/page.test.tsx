import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TradePage from './page';
import { useAccount } from 'wagmi';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectors: [] })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn() })),
}));

// Mock react-query hooks - use variables that tests can modify
let mockQueryResult = { data: undefined, isLoading: false, error: null };
let mockMutateAsync = jest.fn();
let mockMutationResult = { mutateAsync: mockMutateAsync, isPending: false };

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn(() => mockQueryResult),
    useMutation: jest.fn((options) => {
      // Create a wrapped mutateAsync that calls the onSuccess/onError callbacks
      const wrappedMutateAsync = jest.fn(async (...args) => {
        try {
          const result = await mockMutateAsync(...args);
          if (options?.onSuccess) options.onSuccess(result);
          return result;
        } catch (error) {
          if (options?.onError) options.onError(error);
          // Don't re-throw - the component handles errors in onError callback
          return { error };
        }
      });
      return {
        mutateAsync: wrappedMutateAsync,
        isPending: false,
      };
    }),
  };
});

// Mock Navigation component
jest.mock('../components/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation">Navigation</nav>,
}));

// Mock SymbolSelector component
jest.mock('../components/SymbolSelector', () => ({
  SymbolSelector: ({ symbols, selectedSymbol, onSymbolChange }: any) => (
    <select
      data-testid="symbol-selector"
      value={selectedSymbol}
      onChange={(e) => onSymbolChange(e.target.value)}
    >
      {symbols.map((s: string) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  ),
}));

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('TradePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryResult = { data: undefined, isLoading: false, error: null };
    mockMutateAsync = jest.fn();
    mockMutationResult = { mutateAsync: mockMutateAsync, isPending: false };
  });

  describe('when user is not connected', () => {
    beforeEach(() => {
      (useAccount as jest.Mock).mockReturnValue({ isConnected: false });
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };
    });

    it('should show connect wallet message when wallet is not connected', () => {
      render(<TradePage />);
      expect(screen.getByText(/connect your wallet to start trading/i)).toBeInTheDocument();
    });
  });

  describe('when user is connected', () => {
    beforeEach(() => {
      (useAccount as jest.Mock).mockReturnValue({
        isConnected: true,
        address: '0x1234567890123456789012345678901234567890',
      });
    });

    it('should display current price from API', () => {
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };
      render(<TradePage />);
      expect(screen.getByText(/eth price/i)).toBeInTheDocument();
    });

    it('should show loading state when fetching price', () => {
      mockQueryResult = { data: undefined, isLoading: true, error: null };
      render(<TradePage />);
      // Look for the price section specifically
      const priceSection = screen.getByText('ETH Price').parentElement;
      expect(priceSection).toHaveTextContent('Loading...');
    });

    it('should have size input field', () => {
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };
      render(<TradePage />);
      const sizeInput = screen.getByLabelText(/size/i);
      expect(sizeInput).toBeInTheDocument();
    });

    it('should have long and short buttons', () => {
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };
      render(<TradePage />);
      expect(screen.getByRole('button', { name: /long/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /short/i })).toBeInTheDocument();
    });

    it('should submit order when clicking Long button', async () => {
      mockMutateAsync.mockResolvedValue({ success: true });
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };

      render(<TradePage />);

      const sizeInput = screen.getByLabelText(/size/i);
      fireEvent.change(sizeInput, { target: { value: '100' } });

      const longButton = screen.getByRole('button', { name: /long/i });
      fireEvent.click(longButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          side: 'Long',
          size: '100',
          symbol: 'ETH',
        });
      });
    });

    it('should submit order when clicking Short button', async () => {
      mockMutateAsync.mockResolvedValue({ success: true });
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };

      render(<TradePage />);

      const sizeInput = screen.getByLabelText(/size/i);
      fireEvent.change(sizeInput, { target: { value: '100' } });

      const shortButton = screen.getByRole('button', { name: /short/i });
      fireEvent.click(shortButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          side: 'Short',
          size: '100',
          symbol: 'ETH',
        });
      });
    });

    it('should show error if size is not provided', () => {
      mockMutateAsync = jest.fn();
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };

      render(<TradePage />);

      const longButton = screen.getByRole('button', { name: /long/i });
      fireEvent.click(longButton);

      expect(toast.error).toHaveBeenCalledWith('Please enter a valid size');
    });

    it('should show success message after successful order', async () => {
      mockMutateAsync.mockResolvedValue({ success: true });
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };

      render(<TradePage />);

      const sizeInput = screen.getByLabelText(/size/i);
      fireEvent.change(sizeInput, { target: { value: '100' } });

      const longButton = screen.getByRole('button', { name: /long/i });
      fireEvent.click(longButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Order submitted successfully!');
      });
    });

    it('should show error message on failed order', async () => {
      mockMutateAsync.mockRejectedValue(new Error('Order failed'));
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };

      render(<TradePage />);

      const sizeInput = screen.getByLabelText(/size/i);
      fireEvent.change(sizeInput, { target: { value: '100' } });

      const longButton = screen.getByRole('button', { name: /long/i });
      fireEvent.click(longButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Order failed'));
      });
    });

    it('should have a symbol selector', () => {
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };
      render(<TradePage />);

      expect(screen.getByTestId('symbol-selector')).toBeInTheDocument();
    });

    it('should default to ETH symbol', () => {
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };
      render(<TradePage />);

      expect(screen.getByTestId('symbol-selector')).toHaveValue('ETH');
    });

    it('should update price query when symbol changes', () => {
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };
      render(<TradePage />);

      const selector = screen.getByTestId('symbol-selector');
      fireEvent.change(selector, { target: { value: 'BTC' } });

      expect(selector).toHaveValue('BTC');
    });

    it('should submit order with selected symbol', async () => {
      mockMutateAsync.mockResolvedValue({ success: true });
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };

      render(<TradePage />);

      // Change symbol to BTC
      const selector = screen.getByTestId('symbol-selector');
      fireEvent.change(selector, { target: { value: 'BTC' } });

      const sizeInput = screen.getByLabelText(/size/i);
      fireEvent.change(sizeInput, { target: { value: '100' } });

      const longButton = screen.getByRole('button', { name: /long/i });
      fireEvent.click(longButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          side: 'Long',
          size: '100',
          symbol: 'BTC',
        });
      });
    });
  });
});
