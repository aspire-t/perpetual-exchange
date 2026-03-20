import { Test, TestingModule } from '@nestjs/testing';
import { HedgingController } from './hedging.controller';
import { HedgingService } from './hedging.service';
import { JwtService } from '@nestjs/jwt';

describe('HedgingController', () => {
  let controller: HedgingController;
  let hedgingService: HedgingService;

  const mockHedgingService = {
    openHedge: jest.fn(),
    closeHedge: jest.fn(),
    getHedge: jest.fn(),
    getPositionHedges: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HedgingController],
      providers: [
        {
          provide: HedgingService,
          useValue: mockHedgingService,
        },
        {
          provide: JwtService,
          useValue: { verify: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<HedgingController>(HedgingController);
    hedgingService = module.get<HedgingService>(HedgingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('openHedge', () => {
    it('should open a hedge for a position', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'hedge-1', isShort: true },
      };

      mockHedgingService.openHedge.mockResolvedValue(mockResponse);

      const result = await controller.openHedge('position-1');

      expect(result).toEqual(mockResponse);
      expect(hedgingService.openHedge).toHaveBeenCalledWith('position-1');
    });
  });

  describe('closeHedge', () => {
    it('should close a hedge', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'hedge-1', status: 'closed', pnl: '100000000' },
      };

      mockHedgingService.closeHedge.mockResolvedValue(mockResponse);

      const result = await controller.closeHedge('hedge-1');

      expect(result).toEqual(mockResponse);
      expect(hedgingService.closeHedge).toHaveBeenCalledWith('hedge-1');
    });
  });

  describe('getHedge', () => {
    it('should get a hedge by id', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'hedge-1', isShort: true },
      };

      mockHedgingService.getHedge.mockResolvedValue(mockResponse);

      const result = await controller.getHedge('hedge-1');

      expect(result).toEqual(mockResponse);
      expect(hedgingService.getHedge).toHaveBeenCalledWith('hedge-1');
    });
  });

  describe('getPositionHedges', () => {
    it('should get all hedges for a position', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: 'hedge-1', isShort: true },
          { id: 'hedge-2', isShort: false },
        ],
      };

      mockHedgingService.getPositionHedges.mockResolvedValue(mockResponse);

      const result = await controller.getPositionHedges('position-1');

      expect(result).toEqual(mockResponse);
      expect(hedgingService.getPositionHedges).toHaveBeenCalledWith('position-1');
    });
  });
});
