import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { USDC_ABI, CONTRACTS } from '../contracts';

export function useApprove() {
  const { writeContract, data: hash, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const approve = (amount: bigint) => {
    return writeContract({
      address: CONTRACTS.USDC,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [CONTRACTS.VAULT, amount],
    });
  };

  return {
    approve,
    hash,
    isConfirming,
    isConfirmed,
    ...rest,
  };
}
