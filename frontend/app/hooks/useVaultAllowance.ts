import { useReadContract } from 'wagmi';
import { USDC_ABI, CONTRACTS } from '../contracts';

export function useVaultAllowance(address: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.VAULT] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });
}
