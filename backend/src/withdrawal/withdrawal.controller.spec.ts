import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalController } from './withdrawal.controller';
import { WithdrawalService } from './withdrawal.service';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

describe('WithdrawalController', () => {
  let withdrawalController: WithdrawalController;
  let withdrawalService: WithdrawalService;

  const mockWithdrawalService = {
    withdraw: jest.fn(),
    getUserWithdrawals: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WithdrawalController],
      providers: [
        {
          provide: WithdrawalService,
          useValue: mockWithdrawalService,
        },
        {
          provide: JwtAuthGuard,
          useValue: {},
        },
        {
          provide: JwtService,
          useValue: {},
        },
      ],
    }).compile();

    withdrawalController =
      module.get<WithdrawalController>(WithdrawalController);
    withdrawalService = module.get<WithdrawalService>(WithdrawalService);
  });

  describe('withdraw', () => {
    it('should require JwtAuthGuard', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        WithdrawalController.prototype.withdraw,
      );

      expect(guards).toContain(JwtAuthGuard);
    });

    it('should return success response', async () => {
      const withdrawalDto = {
        address: '0x1111111111111111111111111111111111111111',
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

      const result = await withdrawalController.withdraw(
        withdrawalDto,
        { user: { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' } } as any,
      );

      expect(withdrawalService.withdraw).toHaveBeenCalledWith(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
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

      const result = await withdrawalController.withdraw(
        withdrawalDto,
        { user: { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' } } as any,
      );

      expect(result).toEqual(expectedResult);
    });
  });

  describe('requestWithdrawal', () => {
    it('should return success response with signature', async () => {
      const withdrawalDto = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '500000000000000000',
      };
      const expectedResult = {
        success: true,
        data: {
          status: 'pending',
          amount: withdrawalDto.amount,
          signature: '0xSignature',
          nonce: 1,
          expiry: 1234567890,
        },
      };

      mockWithdrawalService.withdraw.mockResolvedValue(expectedResult);

      const result = await withdrawalController.requestWithdrawal(
        withdrawalDto,
        { user: { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' } } as any,
      );

      expect(withdrawalService.withdraw).toHaveBeenCalledWith(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        withdrawalDto.amount,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getUserWithdrawals', () => {
    it('should return user withdrawals', async () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      const expectedResult = {
        success: true,
        data: [],
      };

      mockWithdrawalService.getUserWithdrawals.mockResolvedValue(expectedResult);

      const result = await withdrawalController.getUserWithdrawals(address);

      expect(withdrawalService.getUserWithdrawals).toHaveBeenCalledWith(address);
      expect(result).toEqual(expectedResult);
    });
  });
});
