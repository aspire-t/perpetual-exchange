import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalService } from './withdrawal.service';

describe('WithdrawalController', () => {
  let withdrawalController: WithdrawalController;
  let withdrawalService: WithdrawalService;

  const mockWithdrawalService = {
    withdraw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WithdrawalController],
      providers: [
        {
          provide: WithdrawalService,
          useValue: mockWithdrawalService,
        },
      ],
    }).compile();

    withdrawalController =
      module.get<WithdrawalController>(WithdrawalController);
    withdrawalService = module.get<WithdrawalService>(WithdrawalService);
  });

  describe('withdraw', () => {
    it('should return success response', async () => {
      const withdrawalDto = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '500000000000000000',
      };
      const expectedResult = {
        success: true,
        data: {
          status: 'pending',
          amount: withdrawalDto.amount,
        },
      };

      mockWithdrawalService.withdraw.mockResolvedValue(expectedResult);

      const result = await withdrawalController.withdraw(withdrawalDto);

      expect(withdrawalService.withdraw).toHaveBeenCalledWith(
        withdrawalDto.address,
        withdrawalDto.amount,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should return error when user not found', async () => {
      const withdrawalDto = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '500000000000000000',
      };
      const expectedResult = {
        success: false,
        error: 'User not found',
      };

      mockWithdrawalService.withdraw.mockResolvedValue(expectedResult);

      const result = await withdrawalController.withdraw(withdrawalDto);

      expect(result).toEqual(expectedResult);
    });

    it('should return error when there is a pending withdrawal', async () => {
      const withdrawalDto = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '500000000000000000',
      };
      const expectedResult = {
        success: false,
        error: 'You already have a pending withdrawal',
      };

      mockWithdrawalService.withdraw.mockResolvedValue(expectedResult);

      const result = await withdrawalController.withdraw(withdrawalDto);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('withdrawLegacy', () => {
    it('should return success response on /withdrawal endpoint', async () => {
      const withdrawalDto = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '1000000000000000000',
      };
      const expectedResult = {
        success: true,
        data: {
          status: 'pending',
          amount: withdrawalDto.amount,
        },
      };

      mockWithdrawalService.withdraw.mockResolvedValue(expectedResult);

      const result = await withdrawalController.withdrawLegacy(withdrawalDto);

      expect(withdrawalService.withdraw).toHaveBeenCalledWith(
        withdrawalDto.address,
        withdrawalDto.amount,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should return error when user not found on /withdrawal endpoint', async () => {
      const withdrawalDto = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '1000000000000000000',
      };
      const expectedResult = {
        success: false,
        error: 'User not found',
      };

      mockWithdrawalService.withdraw.mockResolvedValue(expectedResult);

      const result = await withdrawalController.withdrawLegacy(withdrawalDto);

      expect(result).toEqual(expectedResult);
    });
  });
});
