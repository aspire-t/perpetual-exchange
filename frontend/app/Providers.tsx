'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';
import { wagmiAdapter, projectId, networks } from './wagmi';
import { useState } from 'react';
import { Toaster } from 'react-hot-toast';

// Set up metadata
const metadata = {
  name: 'Perpetual Exchange',
  description: 'Perpetual Exchange',
  url: 'https://perpetual-exchange.com', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

// Create the modal
createAppKit({
  adapters: [wagmiAdapter],
  projectId: projectId as string,
  networks,
  metadata,
  features: {
    analytics: true // Optional - defaults to your Cloud configuration
  }
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          toastOptions={{
            duration: 3000,
            className: '!bg-[#161b22] !text-[#f0f6fc] !border !border-[#30363d] !rounded-lg !shadow-lg !shadow-black/50 backdrop-blur',
            success: {
              className: '!bg-[#161b22] !text-[#3fb950] !border !border-[#3fb950]/30',
              icon: '✓',
            },
            error: {
              className: '!bg-[#161b22] !text-[#f85149] !border !border-[#f85149]/30',
              icon: '✕',
            },
          }}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
