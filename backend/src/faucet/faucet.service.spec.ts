import { Test, TestingModule } from '@nestjs/testing';
import { FaucetService } from './faucet.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/User.entity';
import { Deposit } from '../entities/Deposit.entity';
import { ConfigService } from '@nestjs/config';

describe('FaucetService', () => {
  let faucetService: FaucetService;
  let userRepository: Repository<User>;
  let depositRepository: Repository<Deposit>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDepositRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'NODE_ENV') return 'test';
      if (key === 'ENABLE_FAUCET') return 'true';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaucetService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Deposit),
          useValue: mockDepositRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    faucetService = module.get<FaucetService>(FaucetService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    depositRepository = module.get<Repository<Deposit>>(
      getRepositoryToken(Deposit),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('mint', () => {
    const userAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const mintAmount = '1000000000000000000'; // 1 ETH

    it('should create a deposit for user', async () => {
      const user = { id: '1', address: userAddress, balance: '0' };
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.save.mockResolvedValue(user);
      mockDepositRepository.create.mockReturnValue({
        user,
        amount: mintAmount,
        txHash: '0x faucet-mint-tx',
      });
      mockDepositRepository.save.mockResolvedValue({ id: '1' });

      const result = await faucetService.mint(userAddress, mintAmount);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { address: userAddress.toLowerCase() },
      });
      expect(result.success).toBe(true);
      expect(result.txHash).toContain('0x');
    });

    it('should create user if user not found', async () => {
      const newUser = { id: '2', address: userAddress.toLowerCase(), balance: '0' };
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      mockDepositRepository.findOne.mockResolvedValue(null);
      mockDepositRepository.create.mockReturnValue({
        user: newUser,
        amount: mintAmount,
        txHash: '0x faucet-mint-tx',
      });
      mockDepositRepository.save.mockResolvedValue({ id: '1' });

      const result = await faucetService.mint(userAddress, mintAmount);

      expect(result.success).toBe(true);
    });

    it('should prevent duplicate mint within 24 hours', async () => {
      const user = { id: '1', address: userAddress };
      const recentDeposit = {
        id: '1',
        user,
        createdAt: new Date(),
        txHash: '0xrecent',
      };

      mockUserRepository.findOne.mockResolvedValue(user);
      mockDepositRepository.findOne.mockResolvedValue(recentDeposit);

      const result = await faucetService.mint(userAddress, mintAmount);

      expect(result.success).toBe(false);
      expect(result.error).toContain('24 hours');
    });

    it('should reject mint when faucet is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ENABLE_FAUCET') return 'false';
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const result = await faucetService.mint(userAddress, mintAmount);

      expect(result.success).toBe(false);
      expect(result.error).toContain('disabled');
    });
  });
});
