import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { VAULT_ABI, CONTRACTS } from '../contracts';

export function useWithdraw() {
  const { writeContract, data: hash, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const withdraw = (amount: bigint) => {
    return writeContract({
      address: CONTRACTS.VAULT,
      abi: VAULT_ABI,
      functionName: 'withdraw',
      args: [amount],
    });
  };

  return {
    withdraw,
    hash,
    isConfirming,
    isConfirmed,
    ...rest,
  };
}
