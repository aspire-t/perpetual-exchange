import { Test, TestingModule } from '@nestjs/testing';
import { PriceService } from './price.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('PriceService', () => {
  let priceService: PriceService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockReturnValue('https://api.hyperliquid.xyz');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    priceService = module.get<PriceService>(PriceService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('getPrice', () => {
    it('should return price for a valid coin', async () => {
      const mockResponse: AxiosResponse = {
        data: { ETH: '2041.55', BTC: '50000.00' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {} as any,
        },
      };

      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      const result = await priceService.getPrice('ETH');

      expect(result).toEqual({
        success: true,
        data: { coin: 'ETH', price: '2041.55' },
      });
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://api.hyperliquid.xyz/info',
        { type: 'allMids' },
      );
    });

    it('should return error when price not found', async () => {
      const mockResponse: AxiosResponse = {
        data: { ETH: '2041.55', BTC: '50000.00' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {} as any,
        },
      };

      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      const result = await priceService.getPrice('INVALID');

      expect(result).toEqual({
        success: false,
        error: 'Price not found for coin: INVALID',
      });
    });

    it('should return error when request fails', async () => {
      mockHttpService.post.mockReturnValueOnce(
        throwError(() => new Error('Network error')),
      );

      const result = await priceService.getPrice('ETH');

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch price for ETH: Network error',
      });
    });
  });

  describe('getPrices', () => {
    it('should return all prices', async () => {
      const mockResponse: AxiosResponse = {
        data: { ETH: '2041.55', BTC: '50000.00' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {} as any,
        },
      };

      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      const result = await priceService.getPrices();

      expect(result).toEqual({
        success: true,
        data: { ETH: '2041.55', BTC: '50000.00' },
      });
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://api.hyperliquid.xyz/info',
        { type: 'allMids' },
      );
    });

    it('should return error when request fails', async () => {
      mockHttpService.post.mockReturnValueOnce(
        throwError(() => new Error('Network error')),
      );

      const result = await priceService.getPrices();

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch prices: Network error',
      });
    });
  });
});
