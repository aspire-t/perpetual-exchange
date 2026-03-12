import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionsPage from './page';
import { useDeposits } from '../hooks/useDeposits';
import { useWithdrawals } from '../hooks/useWithdrawals';
import { useAccount } from 'wagmi';

jest.mock('../hooks/useDeposits', () => ({
  useDeposits: jest.fn(),
}));

jest.mock('../hooks/useWithdrawals', () => ({
  useWithdrawals: jest.fn(),
}));

jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
}));

describe('TransactionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAccount as jest.Mock).mockReturnValue({ address: '0x1234567890123456789012345678901234567890' });
    (useDeposits as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    (useWithdrawals as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it('should render page title', () => {
    render(<TransactionsPage />);
    expect(screen.getByText('Transaction History')).toBeInTheDocument();
  });

  it('should render three tabs', () => {
    render(<TransactionsPage />);
    expect(screen.getByText('Deposits')).toBeInTheDocument();
    expect(screen.getByText('Withdrawals')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
  });

  it('should display deposits table when data is loaded', () => {
    (useDeposits as jest.Mock).mockReturnValue({
      data: [
        {
          id: '1',
          userId: 'user1',
          amount: '1000000',
          status: 'confirmed',
          txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          createdAt: '2026-03-12T10:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<TransactionsPage />);
    expect(screen.getByText('1.00 USDC')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    (useDeposits as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<TransactionsPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display empty state when no deposits', () => {
    (useDeposits as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<TransactionsPage />);
    expect(screen.getByText('No deposits yet')).toBeInTheDocument();
  });

  it('should display withdrawals table when data is loaded', () => {
    (useWithdrawals as jest.Mock).mockReturnValue({
      data: [
        {
          id: '1',
          userId: 'user1',
          amount: '2000000',
          status: 'confirmed',
          txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          createdAt: '2026-03-12T11:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<TransactionsPage />);
    fireEvent.click(screen.getByText('Withdrawals'));
    expect(screen.getByText('2.00 USDC')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('should display loading state for withdrawals', () => {
    (useWithdrawals as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<TransactionsPage />);
    fireEvent.click(screen.getByText('Withdrawals'));
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display empty state when no withdrawals', () => {
    (useWithdrawals as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<TransactionsPage />);
    fireEvent.click(screen.getByText('Withdrawals'));
    expect(screen.getByText('No withdrawals yet')).toBeInTheDocument();
  });
});
