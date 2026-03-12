import { Test, TestingModule } from '@nestjs/testing';
import { PositionController } from './position.controller';
import { PositionService } from './position.service';

describe('PositionController', () => {
  let controller: PositionController;
  let positionService: PositionService;

  const mockPositionService = {
    openPosition: jest.fn(),
    closePosition: jest.fn(),
    getPosition: jest.fn(),
    getUserPositions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PositionController],
      providers: [
        {
          provide: PositionService,
          useValue: mockPositionService,
        },
      ],
    }).compile();

    controller = module.get<PositionController>(PositionController);
    positionService = module.get<PositionService>(PositionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('openPosition', () => {
    it('should open a position', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'position-1', isOpen: true },
      };

      mockPositionService.openPosition.mockResolvedValue(mockResponse);

      const result = await controller.openPosition({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        size: '1000000000000000000',
        entryPrice: '2000000000',
        isLong: true,
      });

      expect(result).toEqual(mockResponse);
      expect(positionService.openPosition).toHaveBeenCalledWith(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        BigInt('1000000000000000000'),
        BigInt('2000000000'),
        true,
      );
    });
  });

  describe('closePosition', () => {
    it('should close a position', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'position-1', isOpen: false, pnl: '100000000' },
      };

      mockPositionService.closePosition.mockResolvedValue(mockResponse);

      const result = await controller.closePosition('position-1');

      expect(result).toEqual(mockResponse);
      expect(positionService.closePosition).toHaveBeenCalledWith('position-1');
    });
  });

  describe('getPosition', () => {
    it('should get a position by id', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'position-1', isOpen: true },
      };

      mockPositionService.getPosition.mockResolvedValue(mockResponse);

      const result = await controller.getPosition('position-1');

      expect(result).toEqual(mockResponse);
      expect(positionService.getPosition).toHaveBeenCalledWith('position-1');
    });
  });

  describe('getUserPositions', () => {
    it('should get all positions for a user', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: 'position-1', isOpen: true },
          { id: 'position-2', isOpen: false },
        ],
      };

      mockPositionService.getUserPositions.mockResolvedValue(mockResponse);

      const result = await controller.getUserPositions(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      );

      expect(result).toEqual(mockResponse);
      expect(positionService.getUserPositions).toHaveBeenCalledWith(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        true,
      );
    });
  });
});
