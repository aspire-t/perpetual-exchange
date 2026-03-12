import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import DepositPage from './page';
import { useAccount } from 'wagmi';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectors: [] })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn() })),
}));

// Mock Navigation component
jest.mock('../components/Navigation', () => ({
  Navigation: () => <nav data-testid="navigation">Navigation</nav>,
}));

describe('DepositPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when user is not connected', () => {
    beforeEach(() => {
      (useAccount as jest.Mock).mockReturnValue({ isConnected: false });
    });

    it('should show connect wallet message', () => {
      render(<DepositPage />);
      expect(screen.getByText(/connect your wallet to deposit/i)).toBeInTheDocument();
    });
  });

  describe('when user is connected', () => {
    beforeEach(() => {
      (useAccount as jest.Mock).mockReturnValue({
        isConnected: true,
        address: '0x1234567890123456789012345678901234567890',
      });
    });

    it('should display deposit instructions', () => {
      render(<DepositPage />);
      expect(screen.getByText(/deposit usdc/i)).toBeInTheDocument();
    });

    it('should display vault address', () => {
      render(<DepositPage />);
      expect(screen.getByText(/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/i)).toBeInTheDocument();
    });

    it('should display a copy button for vault address', () => {
      render(<DepositPage />);
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });

    it('should display deposit warning message', () => {
      render(<DepositPage />);
      expect(screen.getByText(/only send usdc/i)).toBeInTheDocument();
    });
  });
});
