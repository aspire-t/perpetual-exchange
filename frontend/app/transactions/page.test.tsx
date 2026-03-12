import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import TransactionsPage from './page';

describe('TransactionsPage', () => {
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
});
