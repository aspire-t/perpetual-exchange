import { Test, TestingModule } from '@nestjs/testing';
import { BalanceController } from './balance.controller';
import { BalanceService } from './balance.service';

describe('BalanceController', () => {
  let balanceController: BalanceController;
  let balanceService: BalanceService;

  const mockBalanceService = {
    getBalance: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BalanceController],
      providers: [
        {
          provide: BalanceService,
          useValue: mockBalanceService,
        },
      ],
    }).compile();

    balanceController = module.get<BalanceController>(BalanceController);
    balanceService = module.get<BalanceService>(BalanceService);
  });

  describe('getBalance', () => {
    it('should return balance data', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const expectedResult = {
        success: true,
        data: {
          totalDeposits: '1000',
          totalWithdrawals: '200',
          totalInPositions: '300',
          availableBalance: '500',
        },
      };

      mockBalanceService.getBalance.mockResolvedValue(expectedResult);

      const result = await balanceController.getBalance(address);

      expect(balanceService.getBalance).toHaveBeenCalledWith(address);
      expect(result).toEqual(expectedResult);
    });

    it('should return error when user not found', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const expectedResult = {
        success: false,
        error: 'User not found',
      };

      mockBalanceService.getBalance.mockResolvedValue(expectedResult);

      const result = await balanceController.getBalance(address);

      expect(result).toEqual(expectedResult);
    });
  });
});
