import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import WithdrawPage from './page';
import { useAccount } from 'wagmi';
import { useQuery, useMutation } from '@tanstack/react-query';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectors: [] })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn() })),
}));

// Mock react-query hooks
let mockQueryResult = { data: undefined, isLoading: false, error: null };
let mockMutateAsync = jest.fn();

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: jest.fn(() => mockQueryResult),
    useMutation: jest.fn(() => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
    })),
  };
});

// Mock Navigation component
jest.mock('../components/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation">Navigation</nav>,
}));
jest.mock('../hooks/useAuthToken', () => ({
  useAuthToken: () => ({
    ensureToken: jest.fn().mockResolvedValue('test-jwt-token'),
  }),
}));

describe('WithdrawPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryResult = { data: undefined, isLoading: false, error: null };
    mockMutateAsync = jest.fn();
  });

  describe('when user is not connected', () => {
    beforeEach(() => {
      (useAccount as jest.Mock).mockReturnValue({ isConnected: false });
    });

    it('should show connect wallet message', () => {
      render(<WithdrawPage />);
      expect(screen.getByText(/connect your wallet to withdraw/i)).toBeInTheDocument();
    });
  });

  describe('when user is connected', () => {
    beforeEach(() => {
      (useAccount as jest.Mock).mockReturnValue({
        isConnected: true,
        address: '0x1234567890123456789012345678901234567890',
      });
      mockQueryResult = { data: { success: true, data: { balance: '1000000000000000000' } }, isLoading: false, error: null };
    });

    it('should display withdraw instructions', () => {
      render(<WithdrawPage />);
      expect(screen.getByText(/withdraw usdc/i)).toBeInTheDocument();
    });

    it('should display withdraw form with amount input', () => {
      render(<WithdrawPage />);
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    });

    it('should display withdraw button', () => {
      render(<WithdrawPage />);
      expect(screen.getByRole('button', { name: /withdraw/i })).toBeInTheDocument();
    });

    it('should display available balance', () => {
      render(<WithdrawPage />);
      expect(screen.getByText(/available balance/i)).toBeInTheDocument();
    });
  });
});
