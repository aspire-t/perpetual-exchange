import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import PositionsPage from './page';
import { useAccount } from 'wagmi';
import { useQuery, useMutation } from '@tanstack/react-query';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectors: [] })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn() })),
}));

// Mock react-query hooks
let mockQueryResult = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn(() => mockQueryResult),
    useMutation: jest.fn(() => ({
      mutateAsync: jest.fn(),
      isPending: false,
    })),
  };
});

// Mock Navigation component
jest.mock('../components/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation">Navigation</nav>,
}));

describe('PositionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryResult = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };
  });

  describe('when user is not connected', () => {
    beforeEach(() => {
      (useAccount as jest.Mock).mockReturnValue({ isConnected: false });
    });

    it('should show connect wallet message', () => {
      render(<PositionsPage />);
      expect(screen.getByText(/connect your wallet to view positions/i)).toBeInTheDocument();
    });
  });

  describe('when user is connected', () => {
    beforeEach(() => {
      (useAccount as jest.Mock).mockReturnValue({
        isConnected: true,
        address: '0x1234567890123456789012345678901234567890',
      });
    });

    it('should show loading state when fetching positions', () => {
      mockQueryResult = { data: undefined, isLoading: true, error: null, refetch: jest.fn() };
      render(<PositionsPage />);
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should show no positions message when user has no positions', () => {
      mockQueryResult = {
        data: { success: true, data: [] },
        isLoading: false,
        error: null,
        refetch: jest.fn()
      };
      render(<PositionsPage />);
      expect(screen.getByText(/no open positions/i)).toBeInTheDocument();
    });

    it('should display user positions', () => {
      const mockPositions = [
        {
          id: 'position-1',
          size: '1000000000000000000',
          entryPrice: '50000000000',
          isLong: true,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      mockQueryResult = {
        data: { success: true, data: mockPositions },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      };
      render(<PositionsPage />);

      expect(screen.getByText(/your positions/i)).toBeInTheDocument();
      expect(screen.getByText(/long/i)).toBeInTheDocument();
    });

    it('should display PnL for positions', () => {
      const mockPositions = [
        {
          id: 'position-1',
          size: '1000000000000000000',
          entryPrice: '50000000000',
          isLong: true,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      mockQueryResult = {
        data: { success: true, data: mockPositions },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      };
      render(<PositionsPage />);

      expect(screen.getByText(/pnl/i)).toBeInTheDocument();
    });

    it('should show close button for each position', () => {
      const mockPositions = [
        {
          id: 'position-1',
          size: '1000000000000000000',
          entryPrice: '50000000000',
          isLong: true,
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      mockQueryResult = {
        data: { success: true, data: mockPositions },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      };
      render(<PositionsPage />);

      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('should call close position mutation when clicking close button', async () => {
      const mockMutate = jest.fn().mockResolvedValue({ success: true });
      const mockRefetch = jest.fn();

      mockQueryResult = {
        data: { success: true, data: [{ id: 'position-1', size: '1000000000000000000', entryPrice: '50000000000', isLong: true, createdAt: '2024-01-01T00:00:00.000Z' }] },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      };

      (useMutation as jest.Mock).mockReturnValue({
        mutateAsync: mockMutate,
        isPending: false,
      });

      render(<PositionsPage />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.click();

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith('position-1');
      });
    });
  });
});
