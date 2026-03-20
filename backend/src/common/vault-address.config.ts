import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

export function getRequiredVaultAddress(configService: ConfigService): string {
  const vaultAddress = configService.get<string>('VAULT_ADDRESS');
  if (!vaultAddress) {
    throw new Error('VAULT_ADDRESS is required');
  }
  if (!ethers.isAddress(vaultAddress)) {
    throw new Error('VAULT_ADDRESS is invalid');
  }
  return vaultAddress;
}
