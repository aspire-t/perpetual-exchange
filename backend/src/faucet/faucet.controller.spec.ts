import { Test, TestingModule } from '@nestjs/testing';
import { FaucetController } from './faucet.controller';
import { FaucetService } from './faucet.service';

describe('FaucetController', () => {
  let faucetController: FaucetController;
  let faucetService: FaucetService;

  const mockFaucetService = {
    mint: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FaucetController],
      providers: [
        {
          provide: FaucetService,
          useValue: mockFaucetService,
        },
      ],
    }).compile();

    faucetController = module.get<FaucetController>(FaucetController);
    faucetService = module.get<FaucetService>(FaucetService);
  });

  describe('mint', () => {
    it('should return success response', async () => {
      const mintDto = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '1000000000000000000',
      };
      const expectedResult = {
        success: true,
        txHash: '0x faucet-mint-tx',
      };

      mockFaucetService.mint.mockResolvedValue(expectedResult);

      const result = await faucetController.mint(mintDto);

      expect(faucetService.mint).toHaveBeenCalledWith(
        mintDto.address,
        mintDto.amount,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should return error response when user not found', async () => {
      const mintDto = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '1000000000000000000',
      };
      const expectedResult = {
        success: false,
        error: 'User not found',
      };

      mockFaucetService.mint.mockResolvedValue(expectedResult);

      const result = await faucetController.mint(mintDto);

      expect(result).toEqual(expectedResult);
    });
  });
});
