import { Test, TestingModule } from '@nestjs/testing';
import { PriceController } from './price.controller';
import { PriceService } from './price.service';

describe('PriceController', () => {
  let controller: PriceController;
  let priceService: PriceService;

  const mockPriceService = {
    getPrice: jest.fn(),
    getPrices: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PriceController],
      providers: [
        {
          provide: PriceService,
          useValue: mockPriceService,
        },
      ],
    }).compile();

    controller = module.get<PriceController>(PriceController);
    priceService = module.get<PriceService>(PriceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPrice', () => {
    it('should get price for a specific coin', async () => {
      const mockResponse = {
        success: true,
        data: { coin: 'ETH', price: '2000.50' },
      };

      mockPriceService.getPrice.mockResolvedValue(mockResponse);

      const result = await controller.getPrice('ETH');

      expect(result).toEqual(mockResponse);
      expect(priceService.getPrice).toHaveBeenCalledWith('ETH');
    });
  });

  describe('getPrices', () => {
    it('should get ETH price when no coin query param (frontend default)', async () => {
      const mockResponse = {
        success: true,
        data: { coin: 'ETH', price: '2000.50' },
      };

      mockPriceService.getPrice.mockResolvedValue(mockResponse);

      const result = await controller.getPrices();

      expect(result).toEqual(mockResponse);
      expect(priceService.getPrice).toHaveBeenCalledWith('ETH');
    });

    it('should get single price when coin query param provided', async () => {
      const mockResponse = {
        success: true,
        data: { coin: 'ETH', price: '2000.50' },
      };

      mockPriceService.getPrice.mockResolvedValue(mockResponse);

      const result = await controller.getPrices('ETH');

      expect(result).toEqual(mockResponse);
      expect(priceService.getPrice).toHaveBeenCalledWith('ETH');
    });

    it('should get BTC price when coin query param is BTC', async () => {
      const mockResponse = {
        success: true,
        data: { coin: 'BTC', price: '50000.00' },
      };

      mockPriceService.getPrice.mockResolvedValue(mockResponse);

      const result = await controller.getPrices('BTC');

      expect(result).toEqual(mockResponse);
      expect(priceService.getPrice).toHaveBeenCalledWith('BTC');
    });
  });
});
