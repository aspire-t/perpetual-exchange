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

      const normalizedAddress = address.toLowerCase();
      const newUser = { id: '1', address: normalizedAddress };
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await authService.login(address, message, signature);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        address: normalizedAddress,
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(newUser);
      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.id).toBe('1');
    });

    it('should return token if user already exists', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const normalizedAddress = address.toLowerCase();
      const message = 'Sign in to Perpetual Exchange';
      const wallet = new ethers.Wallet(
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      );
      const signature = await wallet.signMessage(message);
      const existingUser = { id: '1', address: normalizedAddress };

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

    describe('with nonce-based replay protection', () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const normalizedAddress = address.toLowerCase();
      const nonce = 'test-nonce-123';
      const message = `Login to Exchange\nNonce: ${nonce}\nTimestamp: 1234567890`;

      it('should validate nonce and clear it after successful login', async () => {
        const wallet = new ethers.Wallet(
          '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        );
        const signature = await wallet.signMessage(message);
        const existingUser = {
          id: '1',
          address: normalizedAddress,
          lastNonce: nonce,
          nonceExpiresAt: new Date(Date.now() + 300000), // 5 min in future
        };

        mockUserRepository.findOne.mockResolvedValue(existingUser);
        mockUserRepository.save.mockResolvedValue({
          ...existingUser,
          lastNonce: undefined,
        });
        mockJwtService.sign.mockReturnValue('mock-jwt-token');

        const result = await authService.login(
          address,
          message,
          signature,
          nonce,
        );

        expect(result.token).toBe('mock-jwt-token');
        expect(mockUserRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ lastNonce: undefined }),
        );
      });

      it('should throw error when no nonce exists for address', async () => {
        const wallet = new ethers.Wallet(
          '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        );
        const signature = await wallet.signMessage(message);

        mockUserRepository.findOne.mockResolvedValue(null);

        await expect(
          authService.login(address, message, signature, nonce),
        ).rejects.toThrow('No nonce found for this address');
      });

      it('should throw error when user has no nonce set', async () => {
        const wallet = new ethers.Wallet(
          '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        );
        const signature = await wallet.signMessage(message);
        const userWithoutNonce = {
          id: '1',
          address: normalizedAddress,
          lastNonce: undefined,
        };

        mockUserRepository.findOne.mockResolvedValue(userWithoutNonce);

        await expect(
          authService.login(address, message, signature, nonce),
        ).rejects.toThrow('No nonce found for this address');
      });

      it('should throw error when nonce has expired', async () => {
        const wallet = new ethers.Wallet(
          '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        );
        const signature = await wallet.signMessage(message);
        const expiredUser = {
          id: '1',
          address: normalizedAddress,
          lastNonce: nonce,
          nonceExpiresAt: new Date(Date.now() - 60000), // 1 min ago
        };

        mockUserRepository.findOne.mockResolvedValue(expiredUser);

        await expect(
          authService.login(address, message, signature, nonce),
        ).rejects.toThrow('Nonce has expired');
      });

      it('should throw error when nonce does not match', async () => {
        const wallet = new ethers.Wallet(
          '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        );
        const signature = await wallet.signMessage(message);
        const userWithDifferentNonce = {
          id: '1',
          address: normalizedAddress,
          lastNonce: 'different-nonce',
          nonceExpiresAt: new Date(Date.now() + 300000),
        };

        mockUserRepository.findOne.mockResolvedValue(userWithDifferentNonce);

        await expect(
          authService.login(address, message, signature, nonce),
        ).rejects.toThrow('Invalid nonce');
      });

      it('should throw error when message does not contain the nonce', async () => {
        const wallet = new ethers.Wallet(
          '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        );
        const messageWithoutNonce = 'Login to Exchange';
        const signature = await wallet.signMessage(messageWithoutNonce);
        const userWithMatchingNonce = {
          id: '1',
          address: normalizedAddress,
          lastNonce: nonce,
          nonceExpiresAt: new Date(Date.now() + 300000),
        };

        mockUserRepository.findOne.mockResolvedValue(userWithMatchingNonce);

        await expect(
          authService.login(address, messageWithoutNonce, signature, nonce),
        ).rejects.toThrow('Message does not contain the expected nonce');
      });
    });
  });

  describe('generateNonce', () => {
    it('should generate a 64-character hex string', () => {
      const nonce = authService.generateNonce();

      expect(nonce).toHaveLength(64);
      expect(nonce).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate unique nonces on each call', () => {
      const nonce1 = authService.generateNonce();
      const nonce2 = authService.generateNonce();

      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('getNonce', () => {
    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const normalizedAddress = address.toLowerCase();

    it('should create new user and return nonce for new address', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const newUser = {
        id: '1',
        address: normalizedAddress,
        lastNonce: 'new-nonce',
        nonceExpiresAt: new Date(),
      };
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);

      const result = await authService.getNonce(address);

      expect(result.success).toBe(true);
      expect(result.nonce).toBeDefined();
      expect(result.expiresAt).toBeDefined();
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        address: normalizedAddress,
      });
      expect(mockUserRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should update existing user with new nonce', async () => {
      const existingUser = {
        id: '1',
        address: normalizedAddress,
        lastNonce: 'old-nonce',
      };
      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue({
        ...existingUser,
        lastNonce: 'new-nonce',
        nonceExpiresAt: new Date(),
      });

      const result = await authService.getNonce(address);

      expect(result.success).toBe(true);
      expect(result.nonce).toBeDefined();
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          address: normalizedAddress,
          lastNonce: expect.any(String),
          nonceExpiresAt: expect.any(Date),
        }),
      );
    });

    it('should set nonce expiration to 5 minutes from now', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      const newUser = { id: '1', address: normalizedAddress };
      mockUserRepository.create.mockReturnValue(newUser);
      const savedUser = {
        ...newUser,
        nonceExpiresAt: new Date(),
      };
      mockUserRepository.save.mockResolvedValue(savedUser);

      const beforeCall = Date.now();
      const result = await authService.getNonce(address);
      const afterCall = Date.now();

      expect(result.expiresAt).toBeDefined();
      const expiresTime = result.expiresAt!.getTime();
      const expectedExpiry = beforeCall + 5 * 60 * 1000;
      const expectedExpiryMax = afterCall + 5 * 60 * 1000;

      expect(expiresTime).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(expiresTime).toBeLessThanOrEqual(expectedExpiryMax + 1000);
    });
  });

  describe('simpleLogin', () => {
    const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const normalizedAddress = address.toLowerCase();
    const message = 'Sign in to Perpetual Exchange';

    it('should create user and return token if user does not exist', async () => {
      const wallet = new ethers.Wallet(
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      );
      const signature = await wallet.signMessage(message);

      mockUserRepository.findOne.mockResolvedValue(null);
      const newUser = { id: '1', address: normalizedAddress };
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await authService.simpleLogin(address, message, signature);

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.id).toBe('1');
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        address: normalizedAddress,
      });
    });

    it('should return token if user already exists', async () => {
      const wallet = new ethers.Wallet(
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      );
      const signature = await wallet.signMessage(message);
      const existingUser = { id: '1', address: normalizedAddress };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await authService.simpleLogin(address, message, signature);

      expect(result.token).toBe('mock-jwt-token');
      expect(result.user.id).toBe('1');
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error if signature is invalid', async () => {
      const invalidSignature = '0xinvalid';

      await expect(
        authService.simpleLogin(address, message, invalidSignature),
      ).rejects.toThrow('Invalid signature');
    });
  });
});
