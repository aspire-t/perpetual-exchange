import { Test, TestingModule } from '@nestjs/testing';
import { FundingRateController } from './funding-rate.controller';
import { FundingRateService } from './funding-rate.service';

describe('FundingRateController', () => {
  let fundingRateController: FundingRateController;
  let fundingRateService: FundingRateService;

  const mockFundingRateService = {
    getCurrentFundingRate: jest.fn(),
    getFundingRateHistory: jest.fn(),
    applyFundingToPositions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundingRateController],
      providers: [
        {
          provide: FundingRateService,
          useValue: mockFundingRateService,
        },
      ],
    }).compile();

    fundingRateController = module.get<FundingRateController>(
      FundingRateController,
    );
    fundingRateService = module.get<FundingRateService>(FundingRateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getFundingRate', () => {
    it('should return current funding rate for ETH by default', async () => {
      mockFundingRateService.getCurrentFundingRate.mockResolvedValue('0.0001');

      const result = await fundingRateController.getFundingRate();

      expect(result).toEqual({
        success: true,
        data: {
          symbol: 'ETH',
          fundingRate: '0.0001',
          interval: '8h',
        },
      });
      expect(fundingRateService.getCurrentFundingRate).toHaveBeenCalledWith('ETH');
    });

    it('should return current funding rate for specified symbol', async () => {
      mockFundingRateService.getCurrentFundingRate.mockResolvedValue('0.00015');

      const result = await fundingRateController.getFundingRate('BTC');

      expect(result).toEqual({
        success: true,
        data: {
          symbol: 'BTC',
          fundingRate: '0.00015',
          interval: '8h',
        },
      });
      expect(fundingRateService.getCurrentFundingRate).toHaveBeenCalledWith('BTC');
    });
  });

  describe('getFundingHistory', () => {
    const mockHistory = [
      { symbol: 'ETH', rate: '0.00015', timestamp: new Date() },
      { symbol: 'ETH', rate: '0.00012', timestamp: new Date() },
    ];

    it('should return funding rate history for ETH by default', async () => {
      mockFundingRateService.getFundingRateHistory.mockResolvedValue(mockHistory);

      const result = await fundingRateController.getFundingHistory();

      expect(result).toEqual({
        success: true,
        data: mockHistory,
      });
      expect(fundingRateService.getFundingRateHistory).toHaveBeenCalledWith('ETH');
    });

    it('should return funding rate history for specified symbol', async () => {
      mockFundingRateService.getFundingRateHistory.mockResolvedValue(mockHistory);

      const result = await fundingRateController.getFundingHistory('BTC');

      expect(result).toEqual({
        success: true,
        data: mockHistory,
      });
      expect(fundingRateService.getFundingRateHistory).toHaveBeenCalledWith('BTC');
    });
  });

  describe('applyFunding', () => {
    it('should apply funding to all positions and return result', async () => {
      const mockResult = {
        success: true,
        data: {
          positionsUpdated: 5,
          totalFundingApplied: '0.0005',
        },
      };
      mockFundingRateService.applyFundingToPositions.mockResolvedValue(mockResult);

      const result = await fundingRateController.applyFunding();

      expect(result).toEqual(mockResult);
      expect(fundingRateService.applyFundingToPositions).toHaveBeenCalled();
    });

    it('should return error when applyFundingToPositions fails', async () => {
      const mockError = {
        success: false,
        error: 'Failed to apply funding',
      };
      mockFundingRateService.applyFundingToPositions.mockResolvedValue(mockError);

      const result = await fundingRateController.applyFunding();

      expect(result).toEqual(mockError);
      expect(fundingRateService.applyFundingToPositions).toHaveBeenCalled();
    });
  });
});
