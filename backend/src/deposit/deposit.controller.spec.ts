import { Test, TestingModule } from '@nestjs/testing';
import { DepositController } from './deposit.controller';
import { DepositService } from './deposit.service';
import { JwtService } from '@nestjs/jwt';

describe('DepositController', () => {
  let depositController: DepositController;
  let depositService: DepositService;

  const mockDepositService = {
    deposit: jest.fn(),
    faucet: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepositController],
      providers: [
        {
          provide: DepositService,
          useValue: mockDepositService,
        },
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
      ],
    }).compile();

    depositController = module.get<DepositController>(DepositController);
    depositService = module.get<DepositService>(DepositService);
  });

  describe('deposit', () => {
    it('should return success response', async () => {
      const depositDto = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '1000000000000000000',
        txHash: '0x1234567890abcdef',
      };
      const expectedResult = {
        success: true,
        data: {
          txHash: depositDto.txHash,
          status: 'confirmed',
          amount: depositDto.amount,
        },
      };

      mockDepositService.deposit.mockResolvedValue(expectedResult);

      const result = await depositController.deposit(depositDto);

      expect(depositService.deposit).toHaveBeenCalledWith(
        depositDto.address,
        depositDto.amount,
        depositDto.txHash,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should return error when user not found', async () => {
      const depositDto = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '1000000000000000000',
        txHash: '0x1234567890abcdef',
      };
      const expectedResult = {
        success: false,
        error: 'User not found',
      };

      mockDepositService.deposit.mockResolvedValue(expectedResult);

      const result = await depositController.deposit(depositDto);

      expect(result).toEqual(expectedResult);
    });

    it('should return error when transaction already processed', async () => {
      const depositDto = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '1000000000000000000',
        txHash: '0xexistingtx',
      };
      const expectedResult = {
        success: false,
        error: 'Transaction already processed',
      };

      mockDepositService.deposit.mockResolvedValue(expectedResult);

      const result = await depositController.deposit(depositDto);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('faucet', () => {
    it('should mint to authenticated user address', async () => {
      const expectedResult = {
        success: true,
        data: {
          address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
          amount: '100000000',
          newBalance: '100000000',
        },
      };
      mockDepositService.faucet.mockResolvedValue(expectedResult);

      const result = await depositController.faucet(
        { address: '0xignored', amount: '100000000' },
        {
          user: { address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' },
        } as any,
      );

      expect(depositService.faucet).toHaveBeenCalledWith(
        '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        '100000000',
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
