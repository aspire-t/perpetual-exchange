import { http, createConfig } from 'wagmi';
import { hardhat, mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [hardhat, mainnet],
  connectors: [
    injected({
      target: 'metaMask',
      shimDisconnect: false,
    }),
  ],
  transports: {
    [hardhat.id]: http(),
    [mainnet.id]: http(),
  },
});
