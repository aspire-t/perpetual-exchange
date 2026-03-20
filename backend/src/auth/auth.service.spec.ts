import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/User.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'AUTH_CHAIN_ID') return '31337';
      if (key === 'AUTH_DOMAIN_NAME') return 'PerpetualExchange';
      if (key === 'AUTH_DOMAIN_VERSION') return '1';
      return defaultValue;
    }),
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
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyTypedSignature', () => {
    it('should return true for valid typed signature', async () => {
      const address = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
      const nonce = 'nonce-1';
      const issuedAt = 1711111111;
      const statement = 'Login to Exchange';
      const wallet = new ethers.Wallet(
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      );
      const signature = await wallet.signTypedData(
        {
          name: 'PerpetualExchange',
          version: '1',
          chainId: 31337,
        },
        {
          Login: [
            { name: 'address', type: 'address' },
            { name: 'nonce', type: 'string' },
            { name: 'issuedAt', type: 'uint256' },
            { name: 'statement', type: 'string' },
          ],
        },
        {
          address,
          nonce,
          issuedAt,
          statement,
        },
      );

      const result = await authService.verifyTypedSignature(
        address,
        signature,
        nonce,
        issuedAt,
        statement,
      );

      expect(result).toBe(true);
    });
  });

  describe('login', () => {
    it('should validate nonce and return token', async () => {
      const address = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
      const nonce = 'nonce-1';
      const issuedAt = 1711111111;
      const statement = 'Login to Exchange';
      const wallet = new ethers.Wallet(
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      );
      const signature = await wallet.signTypedData(
        {
          name: 'PerpetualExchange',
          version: '1',
          chainId: 31337,
        },
        {
          Login: [
            { name: 'address', type: 'address' },
            { name: 'nonce', type: 'string' },
            { name: 'issuedAt', type: 'uint256' },
            { name: 'statement', type: 'string' },
          ],
        },
        {
          address,
          nonce,
          issuedAt,
          statement,
        },
      );
      const existingUser = {
        id: '1',
        address,
        lastNonce: nonce,
        nonceExpiresAt: new Date(Date.now() + 300000),
      };
      mockUserRepository.findOne.mockResolvedValue(existingUser);
      mockUserRepository.save.mockResolvedValue(existingUser);
      mockJwtService.sign.mockReturnValue('token');

      const result = await authService.login(
        address,
        signature,
        nonce,
        issuedAt,
        statement,
      );

      expect(result.token).toBe('token');
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastNonce: undefined,
          nonceExpiresAt: undefined,
        }),
      );
    });

    it('should throw when nonce mismatched', async () => {
      const address = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
      mockUserRepository.findOne.mockResolvedValue({
        id: '1',
        address,
        lastNonce: 'another',
        nonceExpiresAt: new Date(Date.now() + 300000),
      });

      await expect(
        authService.login(address, '0xsig', 'nonce-1', 1711111111, 'Login'),
      ).rejects.toThrow('Invalid nonce');
    });
  });
});
