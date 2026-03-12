import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { VAULT_ABI, CONTRACTS } from '../contracts';

export function useDeposit() {
  const { writeContract, data: hash, ...rest } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const deposit = (amount: bigint) => {
    return writeContract({
      address: CONTRACTS.VAULT,
      abi: VAULT_ABI,
      functionName: 'deposit',
      args: [amount],
    });
  };

  return {
    deposit,
    hash,
    isConfirming,
    isConfirmed,
    ...rest,
  };
}
