import { Test, TestingModule } from '@nestjs/testing';
import { KlineController } from './kline.controller';
import { KlineService } from './kline.service';

describe('KlineController', () => {
  let controller: KlineController;
  let service: KlineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KlineController],
      providers: [
        {
          provide: KlineService,
          useValue: {
            generateKlines: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<KlineController>(KlineController);
    service = module.get<KlineService>(KlineService);
  });

  describe('getKlines', () => {
    it('should return klines for symbol and timeframe', async () => {
      const mockKlines = [
        {
          symbol: 'ETH',
          timeframe: '1m',
          timestamp: new Date('2024-01-01T00:00:00Z'),
          open: '2000000000',
          high: '2010000000',
          low: '1990000000',
          close: '2005000000',
          volume: '100000000000000000',
        },
      ];

      jest.spyOn(service, 'generateKlines').mockResolvedValue(mockKlines);

      const result = await controller.getKlines('ETH', '1m', 10);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockKlines);
    });

    it('should handle invalid timeframe', async () => {
      const result = await controller.getKlines('ETH', 'invalid', 10);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid timeframe');
    });
  });
});
