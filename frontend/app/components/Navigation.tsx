'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectWallet } from './ConnectWallet';

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/trade', label: 'Trade' },
    { href: '/positions', label: 'Positions' },
    { href: '/deposit', label: 'Deposit' },
    { href: '/withdraw', label: 'Withdraw' },
    { href: '/transactions', label: 'History' },
  ];

  return (
    <nav className="border-b border-[var(--border-default)] bg-[var(--background-secondary)]" data-testid="navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-[var(--text-primary)]">
              Perpetual Exchange
            </Link>
            <div className="flex gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'text-[var(--accent-blue)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <ConnectWallet />
        </div>
      </div>
    </nav>
  );
}
