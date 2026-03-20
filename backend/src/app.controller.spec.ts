import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  const mockAppService = {
    getHello: jest.fn(() => 'Hello World!'),
    getStats: jest.fn(async () => ({
      success: true,
      data: {
        totalValueLocked: '0',
        openInterest: '0',
        volume24h: '0',
        trades24h: 0,
      },
    })),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('stats', () => {
    it('should return platform stats', async () => {
      const result = await appController.getStats();
      expect(result.success).toBe(true);
      expect(mockAppService.getStats).toHaveBeenCalled();
    });
  });
});
