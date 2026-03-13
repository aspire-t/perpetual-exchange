import { Test, TestingModule } from '@nestjs/testing';
import { HyperliquidClient } from './hyperliquid.client';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';

describe('HyperliquidClient', () => {
  let hyperliquidClient: HyperliquidClient;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HyperliquidClient,
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

    hyperliquidClient = module.get<HyperliquidClient>(HyperliquidClient);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('placeOrder', () => {
    describe('when credentials are not configured (mock mode)', () => {
      beforeEach(() => {
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'HYPERLIQUID_API_URL')
            return 'https://api.hyperliquid.xyz';
          if (key === 'HYPERLIQUID_API_KEY') return undefined;
          if (key === 'HYPERLIQUID_WALLET_ADDRESS') return undefined;
          if (key === 'HYPERLIQUID_PRIVATE_KEY') return undefined;
          if (key === 'NODE_ENV') return 'test';
          return undefined;
        });
      });

      it('should place a mock market order for long position', async () => {
        const result = await hyperliquidClient.placeOrder('ETH', '1.5', false);

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe('filled');
        expect(result.data?.orderId).toMatch(/^mock-order-/);
      });

      it('should place a mock market order for short position', async () => {
        const result = await hyperliquidClient.placeOrder('ETH', '2.0', true);

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe('filled');
      });

      it('should place a mock limit order with specified price', async () => {
        const result = await hyperliquidClient.placeOrder(
          'ETH',
          '1.0',
          false,
          '2500',
        );

        expect(result.success).toBe(true);
        expect(result.data?.price).toBe('2500');
      });

      it('should return success with order details', async () => {
        const result = await hyperliquidClient.placeOrder(
          'BTC',
          '0.5',
          true,
          '50000',
        );

        expect(result).toEqual({
          success: true,
          data: {
            orderId: expect.stringMatching(/^mock-order-/),
            status: 'filled',
            price: '50000',
          },
        });
      });
    });

    describe('when credentials are configured', () => {
      beforeEach(() => {
        mockConfigService.get.mockImplementation((key: string) => {
          if (key === 'HYPERLIQUID_API_URL')
            return 'https://api.hyperliquid.xyz';
          if (key === 'HYPERLIQUID_API_KEY') return 'test-api-key';
          if (key === 'HYPERLIQUID_WALLET_ADDRESS')
            return '0x1234567890123456789012345678901234567890';
          if (key === 'HYPERLIQUID_PRIVATE_KEY')
            return '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
          if (key === 'NODE_ENV') return 'production';
          return undefined;
        });
      });

      it('should attempt to place real order (falls back to mock)', async () => {
        const result = await hyperliquidClient.placeOrder('ETH', '1.0', false);

        expect(result.success).toBe(true);
        expect(result.data?.status).toBe('filled');
      });

      it('should handle order placement errors gracefully', async () => {
        const result = await hyperliquidClient.placeOrder(
          'INVALID',
          '0',
          false,
        );

        expect(result.success).toBe(true);
      });
    });
  });

  describe('getPosition', () => {
    const mockPositionResponse = [
      {
        coin: 'ETH',
        entryPx: '2000000000',
        leverage: { type: 'cross', value: 10 },
        liquidationPx: '1800000000',
        marginUsed: '100000000',
        maxLeverage: 20,
        positionValue: '2000000000',
        returnOnEquity: '0.05',
        szi: '1.0',
        unrealizedPnl: '50000000',
      },
      {
        coin: 'BTC',
        entryPx: '30000000000',
        leverage: { type: 'cross', value: 5 },
        liquidationPx: '28000000000',
        marginUsed: '500000000',
        maxLeverage: 10,
        positionValue: '30000000000',
        returnOnEquity: '-0.02',
        szi: '-0.5',
        unrealizedPnl: '-300000000',
      },
    ];

    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'HYPERLIQUID_API_URL') return 'https://api.hyperliquid.xyz';
        if (key === 'HYPERLIQUID_WALLET_ADDRESS')
          return '0x1234567890123456789012345678901234567890';
        return undefined;
      });
    });

    it('should return position data for existing position', async () => {
      mockHttpService.get.mockReturnValue(of({ data: mockPositionResponse }));

      const result = await hyperliquidClient.getPosition('ETH');

      expect(result.success).toBe(true);
      expect(result.data?.coin).toBe('ETH');
      expect(result.data?.szi).toBe('1.0');
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.hyperliquid.xyz/info',
        expect.objectContaining({
          params: {
            type: 'clearinghouse',
            user: '0x1234567890123456789012345678901234567890',
          },
        }),
      );
    });

    it('should return error when position does not exist', async () => {
      mockHttpService.get.mockReturnValue(of({ data: mockPositionResponse }));

      const result = await hyperliquidClient.getPosition('SOL');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No position found for coin: SOL');
    });

    it('should handle API errors gracefully', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      const result = await hyperliquidClient.getPosition('ETH');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get position');
    });

    it('should handle empty position array', async () => {
      mockHttpService.get.mockReturnValue(of({ data: [] }));

      const result = await hyperliquidClient.getPosition('ETH');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No position found for coin: ETH');
    });
  });

  describe('closePosition', () => {
    const mockPosition = {
      coin: 'ETH',
      entryPx: '2000000000',
      leverage: { type: 'cross', value: 10 },
      liquidationPx: '1800000000',
      marginUsed: '100000000',
      maxLeverage: 20,
      positionValue: '2000000000',
      returnOnEquity: '0.05',
      szi: '1.0',
      unrealizedPnl: '50000000',
    };

    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'HYPERLIQUID_API_URL') return 'https://api.hyperliquid.xyz';
        if (key === 'HYPERLIQUID_WALLET_ADDRESS')
          return '0x1234567890123456789012345678901234567890';
        if (key === 'HYPERLIQUID_API_KEY') return undefined;
        if (key === 'HYPERLIQUID_PRIVATE_KEY') return undefined;
        return undefined;
      });
    });

    it('should close a long position by placing opposite order', async () => {
      mockHttpService.get.mockReturnValue(of({ data: [mockPosition] }));

      const result = await hyperliquidClient.closePosition('ETH');

      expect(result.success).toBe(true);
      expect(result.data?.orderId).toMatch(/^mock-order-/);
    });

    it('should close a short position by placing opposite order', async () => {
      const shortPosition = { ...mockPosition, szi: '-0.5' };
      mockHttpService.get.mockReturnValue(of({ data: [shortPosition] }));

      const result = await hyperliquidClient.closePosition('ETH');

      expect(result.success).toBe(true);
    });

    it('should return error when no position exists', async () => {
      mockHttpService.get.mockReturnValue(of({ data: [] }));

      const result = await hyperliquidClient.closePosition('ETH');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No open position to close');
    });

    it('should handle getPosition failure', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('API error')),
      );

      const result = await hyperliquidClient.closePosition('ETH');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No open position to close');
    });
  });

  describe('getAccountInfo', () => {
    const mockAccountResponse = {
      accountValue: '10000000000',
      totalMarginUsed: '1000000000',
      totalNtlPos: '5000000000',
      totalSzi: '2.5',
    };

    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'HYPERLIQUID_API_URL') return 'https://api.hyperliquid.xyz';
        if (key === 'HYPERLIQUID_WALLET_ADDRESS')
          return '0x1234567890123456789012345678901234567890';
        return undefined;
      });
    });

    it('should return account information', async () => {
      mockHttpService.get.mockReturnValue(of({ data: mockAccountResponse }));

      const result = await hyperliquidClient.getAccountInfo();

      expect(result.success).toBe(true);
      expect(result.data?.accountValue).toBe('10000000000');
      expect(result.data?.totalMarginUsed).toBe('1000000000');
      expect(result.data?.totalNtlPos).toBe('5000000000');
      expect(result.data?.totalSzi).toBe('2.5');
    });

    it('should handle missing fields with defaults', async () => {
      mockHttpService.get.mockReturnValue(of({ data: {} }));

      const result = await hyperliquidClient.getAccountInfo();

      expect(result.success).toBe(true);
      expect(result.data?.accountValue).toBe('0');
      expect(result.data?.totalMarginUsed).toBe('0');
    });

    it('should handle API errors gracefully', async () => {
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      const result = await hyperliquidClient.getAccountInfo();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get account info');
    });
  });
});
