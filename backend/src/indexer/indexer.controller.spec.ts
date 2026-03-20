import { Test, TestingModule } from '@nestjs/testing';
import { IndexerController } from './indexer.controller';
import { IndexerService } from './indexer.service';
import { JwtService } from '@nestjs/jwt';

describe('IndexerController', () => {
  let indexerController: IndexerController;
  let indexerService: IndexerService;

  const mockIndexerService = {
    processDepositEvent: jest.fn(),
    processWithdrawEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IndexerController],
      providers: [
        {
          provide: IndexerService,
          useValue: mockIndexerService,
        },
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
      ],
    }).compile();

    indexerController = module.get<IndexerController>(IndexerController);
    indexerService = module.get<IndexerService>(IndexerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDeposit', () => {
    it('should handle deposit event successfully', async () => {
      const body = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '1000000000000000000',
        txHash: '0xabc123',
        blockNumber: 100,
      };

      mockIndexerService.processDepositEvent.mockResolvedValue({
        success: true,
        data: {
          txHash: body.txHash,
          status: 'confirmed',
          amount: body.amount,
        },
      });

      const result = await indexerController.handleDeposit(body);

      expect(result).toEqual({
        success: true,
        data: {
          txHash: body.txHash,
          status: 'confirmed',
          amount: body.amount,
        },
      });
      expect(mockIndexerService.processDepositEvent).toHaveBeenCalledWith(
        body.address,
        BigInt(body.amount),
        body.txHash,
        body.blockNumber,
      );
    });

    it('should handle error when user not found', async () => {
      const body = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '1000000000000000000',
        txHash: '0xabc123',
        blockNumber: 100,
      };

      mockIndexerService.processDepositEvent.mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result = await indexerController.handleDeposit(body);

      expect(result).toEqual({
        success: false,
        error: 'User not found',
      });
    });
  });

  describe('handleWithdraw', () => {
    it('should handle withdraw event successfully', async () => {
      const body = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '500000000000000000',
        txHash: '0xdef456',
        blockNumber: 101,
      };

      mockIndexerService.processWithdrawEvent.mockResolvedValue({
        success: true,
        data: {
          status: 'confirmed',
          amount: body.amount,
        },
      });

      const result = await indexerController.handleWithdraw(body);

      expect(result).toEqual({
        success: true,
        data: {
          status: 'confirmed',
          amount: body.amount,
        },
      });
      expect(mockIndexerService.processWithdrawEvent).toHaveBeenCalledWith(
        body.address,
        BigInt(body.amount),
        body.txHash,
        body.blockNumber,
      );
    });

    it('should handle error when user not found', async () => {
      const body = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '500000000000000000',
        txHash: '0xdef456',
        blockNumber: 101,
      };

      mockIndexerService.processWithdrawEvent.mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result = await indexerController.handleWithdraw(body);

      expect(result).toEqual({
        success: false,
        error: 'User not found',
      });
    });
  });
});
