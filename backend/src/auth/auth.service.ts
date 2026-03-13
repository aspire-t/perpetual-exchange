import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
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
  // Nonce expiration time: 5 minutes
  private readonly NONCE_EXPIRY_MS = 5 * 60 * 1000;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  /**
   * Generate a cryptographically secure nonce for login
   */
  generateNonce(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Get a fresh nonce for a user address
   * Creates new user if not exists
   */
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

    // Generate fresh nonce
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

  async verifySignature(
    address: string,
    message: string,
    signature: string,
  ): Promise<boolean> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      return recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Login with nonce-based replay protection
   *
   * Message format: "Login to Exchange\nNonce: {nonce}\nTimestamp: {timestamp}"
   */
  async login(
    address: string,
    message: string,
    signature: string,
    nonce?: string,
  ): Promise<{ token: string; user: User }> {
    // Verify signature
    const isValid = await this.verifySignature(address, message, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    const normalizedAddress = address.toLowerCase();
    let user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    // If nonce provided, validate it (replay protection)
    if (nonce) {
      if (!user || !user.lastNonce) {
        throw new UnauthorizedException('No nonce found for this address');
      }

      // Check if nonce has expired
      if (user.nonceExpiresAt && new Date() > user.nonceExpiresAt) {
        throw new UnauthorizedException(
          'Nonce has expired. Please request a new one.',
        );
      }

      // Check if nonce matches
      if (user.lastNonce !== nonce) {
        throw new UnauthorizedException(
          'Invalid nonce. Please request a fresh one.',
        );
      }

      // Check if message contains the nonce (prevent simple replay)
      if (!message.includes(nonce)) {
        throw new UnauthorizedException(
          'Message does not contain the expected nonce',
        );
      }

      // Invalidate used nonce
      user.lastNonce = undefined;
      user.nonceExpiresAt = undefined;
      await this.userRepository.save(user);
    }

    // Create user if not exists (for backwards compatibility)
    if (!user) {
      user = this.userRepository.create({ address: normalizedAddress });
      await this.userRepository.save(user);
    }

    const payload = { sub: user.id, address: user.address };
    const token = this.jwtService.sign(payload);

    return { token, user };
  }

  /**
   * Simple login without nonce (for backwards compatibility)
   * Note: This is less secure and should be deprecated
   */
  async simpleLogin(
    address: string,
    message: string,
    signature: string,
  ): Promise<{ token: string; user: User }> {
    const isValid = await this.verifySignature(address, message, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    const normalizedAddress = address.toLowerCase();
    let user = await this.userRepository.findOne({
      where: { address: normalizedAddress },
    });

    if (!user) {
      user = this.userRepository.create({ address: normalizedAddress });
      await this.userRepository.save(user);
    }

    const payload = { sub: user.id, address: user.address };
    const token = this.jwtService.sign(payload);

    return { token, user };
  }
}
