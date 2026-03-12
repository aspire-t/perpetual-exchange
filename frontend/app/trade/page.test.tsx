import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TradePage from './page';
import { useAccount } from 'wagmi';
import { useQuery, useMutation } from '@tanstack/react-query';

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
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
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
        });
      });
    });

    it('should show error if size is not provided', () => {
      mockMutateAsync = jest.fn();
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };

      render(<TradePage />);

      const longButton = screen.getByRole('button', { name: /long/i });
      fireEvent.click(longButton);

      expect(screen.getByText(/please enter a valid size/i)).toBeInTheDocument();
    });

    it('should show success message after successful order', async () => {
      mockMutateAsync.mockResolvedValue({ success: true });
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };

      render(<TradePage />);

      const sizeInput = screen.getByLabelText(/size/i);
      fireEvent.change(sizeInput, { target: { value: '100' } });

      const longButton = screen.getByRole('button', { name: /long/i });
      fireEvent.click(longButton);

      // Wait for the success message to appear
      await screen.findByText(/order submitted successfully!/i);
      expect(screen.getByText(/order submitted successfully!/i)).toBeInTheDocument();
    });

    it('should show error message on failed order', async () => {
      mockMutateAsync.mockRejectedValue(new Error('Order failed'));
      mockQueryResult = { data: { price: '50000' }, isLoading: false, error: null };

      render(<TradePage />);

      const sizeInput = screen.getByLabelText(/size/i);
      fireEvent.change(sizeInput, { target: { value: '100' } });

      const longButton = screen.getByRole('button', { name: /long/i });
      fireEvent.click(longButton);

      // Wait for the error message to appear
      await screen.findByText(/order failed:/i);
      expect(screen.getByText(/order failed:/i)).toBeInTheDocument();
    });
  });
});
