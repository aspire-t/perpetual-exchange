import { Test, TestingModule } from '@nestjs/testing';
import { PriceService } from './price.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

jest.useFakeTimers();

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

  let now: number;

  beforeEach(async () => {
    now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => now);

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

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
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

  describe('caching - getPrice', () => {
    it('should cache the price result and return cached value on subsequent calls within TTL', async () => {
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

      const firstResult = await priceService.getPrice('ETH');
      expect(firstResult).toEqual({
        success: true,
        data: { coin: 'ETH', price: '2041.55' },
      });

      const secondResult = await priceService.getPrice('ETH');
      expect(secondResult).toEqual({
        success: true,
        data: { coin: 'ETH', price: '2041.55' },
      });

      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });

    it('should refetch price after TTL expires', async () => {
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

      await priceService.getPrice('ETH');

      // Advance time by 6 seconds (TTL is 5 seconds)
      now += 6000;
      jest.advanceTimersByTime(6000);

      const mockResponse2: AxiosResponse = {
        data: { ETH: '2050.00', BTC: '50100.00' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {} as any,
        },
      };

      mockHttpService.post.mockReturnValueOnce(of(mockResponse2));

      const result = await priceService.getPrice('ETH');

      expect(result).toEqual({
        success: true,
        data: { coin: 'ETH', price: '2050.00' },
      });
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    });

    it('should cache different coins separately', async () => {
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

      // First call fetches all prices and caches them
      await priceService.getPrice('ETH');

      // Second call should use cached BTC price (from the first API call)
      await priceService.getPrice('BTC');

      // Both calls should only result in 1 API call since all prices are cached together
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });

    it('should not cache error responses', async () => {
      mockHttpService.post.mockReturnValueOnce(
        throwError(() => new Error('Network error')),
      );

      const firstResult = await priceService.getPrice('ETH');
      expect(firstResult.success).toBe(false);

      // Second call should also try to fetch since first was an error
      mockHttpService.post.mockReturnValueOnce(
        of({
          data: { ETH: '2041.55' },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: {
            headers: {} as any,
          },
        } as AxiosResponse),
      );

      const secondResult = await priceService.getPrice('ETH');
      expect(secondResult.success).toBe(true);

      // Both calls should hit the API since first was an error
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('caching - getPrices', () => {
    beforeEach(() => {
      // Reset cache to ensure clean state for getPrices tests
      (priceService as any).priceCache.clear();
      (priceService as any).allPricesCache = null;
    });

    it('should cache all prices and return cached value on subsequent calls within TTL', async () => {
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

      const firstResult = await priceService.getPrices();
      expect(firstResult).toEqual({
        success: true,
        data: { ETH: '2041.55', BTC: '50000.00' },
      });

      const secondResult = await priceService.getPrices();
      expect(secondResult).toEqual({
        success: true,
        data: { ETH: '2041.55', BTC: '50000.00' },
      });

      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });

    it('should refetch all prices after TTL expires', async () => {
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

      await priceService.getPrices();

      // Advance time by 6 seconds (TTL is 5 seconds)
      now += 6000;
      jest.advanceTimersByTime(6000);

      const mockResponse2: AxiosResponse = {
        data: { ETH: '2050.00', BTC: '50100.00' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {
          headers: {} as any,
        },
      };

      mockHttpService.post.mockReturnValueOnce(of(mockResponse2));

      const result = await priceService.getPrices();

      expect(result).toEqual({
        success: true,
        data: { ETH: '2050.00', BTC: '50100.00' },
      });
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    });

    it('should not cache error responses for getPrices', async () => {
      mockHttpService.post.mockReturnValueOnce(
        throwError(() => new Error('Network error')),
      );

      const firstResult = await priceService.getPrices();
      expect(firstResult.success).toBe(false);

      mockHttpService.post.mockReturnValueOnce(
        throwError(() => new Error('Network error')),
      );

      const secondResult = await priceService.getPrices();
      expect(secondResult.success).toBe(false);

      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    });
  });
});
