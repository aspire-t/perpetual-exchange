import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/User.entity';
import { JwtService } from '@nestjs/jwt';
import * as ethers from 'ethers';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: Repository<User>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifySignature', () => {
    it('should return true for valid signature', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const message = 'Sign in to Perpetual Exchange';
      const wallet = new ethers.Wallet(
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      );
      const signature = await wallet.signMessage(message);

      const result = await authService.verifySignature(
        address,
        message,
        signature,
      );

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const message = 'Sign in to Perpetual Exchange';
      const invalidSignature = '0xinvalid';

      const result = await authService.verifySignature(
        address,
        message,
        invalidSignature,
      );

      expect(result).toBe(false);
    });

    it('should return false when signer does not match address', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const message = 'Sign in to Perpetual Exchange';
      const wallet = new ethers.Wallet(
        '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
      );
      const signature = await wallet.signMessage(message);

      const result = await authService.verifySignature(
        address,
        message,
        signature,
      );

      expect(result).toBe(false);
    });
  });

  describe('login', () => {
    it('should create user and return token if user does not exist', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const message = 'Sign in to Perpetual Exchange';
      const wallet = new ethers.Wallet(
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      );
      const signature = await wallet.signMessage(message);

      const newUser = { id: '1', address };
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await authService.login(address, message, signature);

      expect(mockUserRepository.create).toHaveBeenCalledWith({ address });
      expect(mockUserRepository.save).toHaveBeenCalledWith(newUser);
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.id).toBe('1');
    });

    it('should return token if user already exists', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const message = 'Sign in to Perpetual Exchange';
      const wallet = new ethers.Wallet(
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      );
      const signature = await wallet.signMessage(message);
      const existingUser = { id: '1', address };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await authService.login(address, message, signature);

      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.id).toBe('1');
    });

    it('should throw error if signature is invalid', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const message = 'Sign in to Perpetual Exchange';
      const invalidSignature = '0xinvalid';

      await expect(
        authService.login(address, message, invalidSignature),
      ).rejects.toThrow('Invalid signature');
    });
  });
});
