import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/User.entity';
import * as ethers from 'ethers';
import { randomBytes } from 'crypto';

/**
 * Auth Service with replay attack protection
 *
 * Uses nonce-based protection to prevent signature replay attacks:
 * - Each login request requires a fresh nonce
 * - Nonce expires after 5 minutes
 * - Used nonces are tracked and cannot be reused
 */
@Injectable()
export class AuthService {
  private readonly NONCE_EXPIRY_MS = 5 * 60 * 1000;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
  generateNonce(): string {
    return randomBytes(32).toString('hex');
  }
  async getNonce(address: string): Promise<{
    success: boolean;
    nonce?: string;
    expiresAt?: Date;
    error?: string;
  }> {
    const normalizedAddress = address.toLowerCase();

    let user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      user = this.userRepository.create({
        address: normalizedAddress,
      });
      await this.userRepository.save(user);
    }

    const nonce = this.generateNonce();
    const expiresAt = new Date(Date.now() + this.NONCE_EXPIRY_MS);

    user.lastNonce = nonce;
    user.nonceExpiresAt = expiresAt;
    await this.userRepository.save(user);

    return {
      success: true,
      nonce,
      expiresAt,
    };
  }

  private getLoginTypedData(issuedAt: number, statement: string, nonce: string) {
    const chainId = Number(this.configService.get<string>('AUTH_CHAIN_ID', '31337'));
    const name = this.configService.get<string>('AUTH_DOMAIN_NAME', 'PerpetualExchange');
    const version = this.configService.get<string>('AUTH_DOMAIN_VERSION', '1');
    const domain = { name, version, chainId };
    const types = {
      Login: [
        { name: 'address', type: 'address' },
        { name: 'nonce', type: 'string' },
        { name: 'issuedAt', type: 'uint256' },
        { name: 'statement', type: 'string' },
      ],
    } as const;
    const valueBase = {
      nonce,
      issuedAt,
      statement,
    };
    return { domain, types, valueBase };
  }

  async verifyTypedSignature(
    address: string,
    signature: string,
    nonce: string,
    issuedAt: number,
    statement: string,
  ): Promise<boolean> {
    try {
      const { domain, types, valueBase } = this.getLoginTypedData(
        issuedAt,
        statement,
        nonce,
      );
      const recoveredAddress = ethers.verifyTypedData(
        domain,
        types,
        { address, ...valueBase },
        signature,
      );
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch {
      return false;
    }
  }
  async login(
    address: string,
    signature: string,
    nonce: string,
    issuedAt: number,
    statement: string,
  ): Promise<{ token: string; user: User }> {
    const normalizedAddress = address.toLowerCase();
    const user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user || !user.lastNonce) {
      throw new UnauthorizedException('No nonce found for this address');
    }

    if (user.nonceExpiresAt && new Date() > user.nonceExpiresAt) {
      throw new UnauthorizedException('Nonce has expired. Please request a new one.');
    }

    if (user.lastNonce !== nonce) {
      throw new UnauthorizedException('Invalid nonce. Please request a fresh one.');
    }

    const isValid = await this.verifyTypedSignature(
      address,
      signature,
      nonce,
      issuedAt,
      statement,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    user.lastNonce = undefined;
    user.nonceExpiresAt = undefined;
    await this.userRepository.save(user);

    const payload = { sub: user.id, address: user.address };
    const token = this.jwtService.sign(payload);

    return { token, user };
  }
}
