import { Test, TestingModule } from '@nestjs/testing';
import { DepositService } from './deposit.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/User.entity';
import { Deposit } from '../entities/Deposit.entity';

describe('DepositService', () => {
  let depositService: DepositService;
  let userRepository: Repository<User>;
  let depositRepository: Repository<Deposit>;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockDepositRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Deposit),
          useValue: mockDepositRepository,
        },
      ],
    }).compile();

    depositService = module.get<DepositService>(DepositService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    depositRepository = module.get<Repository<Deposit>>(
      getRepositoryToken(Deposit),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deposit', () => {
    it('should create a deposit successfully', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = '1000000000000000000';
      const txHash =
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      const user = { id: '1', address } as User;
      const deposit = {
        id: '1',
        user,
        amount,
        txHash,
        status: 'confirmed',
      } as Deposit;

      mockUserRepository.findOne.mockResolvedValue(user);
      mockDepositRepository.findOne.mockResolvedValue(null);
      mockDepositRepository.create.mockReturnValue(deposit);
      mockDepositRepository.save.mockResolvedValue(deposit);

      const result = await depositService.deposit(address, amount, txHash);

      expect(result).toEqual({
        success: true,
        data: {
          txHash,
          status: 'confirmed',
          amount,
        },
      });
      expect(mockDepositRepository.create).toHaveBeenCalledWith({
        user,
        amount: BigInt(amount),
        txHash,
        status: 'confirmed',
      });
      expect(mockDepositRepository.save).toHaveBeenCalledWith(deposit);
    });

    it('should return error when user not found', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = '1000000000000000000';
      const txHash = '0x1234567890abcdef';

      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await depositService.deposit(address, amount, txHash);

      expect(result).toEqual({
        success: false,
        error: 'User not found',
      });
    });

    it('should return error when txHash already exists', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const amount = '1000000000000000000';
      const txHash = '0xexistingtx';

      const user = { id: '1', address } as User;
      const existingDeposit = {
        id: '1',
        user,
        amount,
        txHash,
        status: 'confirmed',
      } as Deposit;

      mockUserRepository.findOne.mockResolvedValue(user);
      mockDepositRepository.findOne = jest
        .fn()
        .mockResolvedValue(existingDeposit);
      mockDepositRepository.create.mockReturnValue(existingDeposit);
      mockDepositRepository.save.mockResolvedValue(existingDeposit);

      const result = await depositService.deposit(address, amount, txHash);

      expect(result).toEqual({
        success: false,
        error: 'Transaction already processed',
      });
    });
  });
});
