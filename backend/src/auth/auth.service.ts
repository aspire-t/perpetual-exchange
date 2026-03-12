import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/User.entity';
import * as ethers from 'ethers';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

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

  async login(
    address: string,
    message: string,
    signature: string,
  ): Promise<{ token: string; user: User }> {
    const isValid = await this.verifySignature(address, message, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    let user = await this.userRepository.findOne({ where: { address } });
    if (!user) {
      user = this.userRepository.create({ address });
      await this.userRepository.save(user);
    }

    // Simple token generation - in production use JWT
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    return { token, user };
  }
}
