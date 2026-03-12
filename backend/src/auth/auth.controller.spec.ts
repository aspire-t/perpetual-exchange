import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return token and user on valid signature', async () => {
      const loginDto = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        message: 'Sign in to Perpetual Exchange',
        signature: '0xvalidsignature',
      };
      const expectedResult = {
        token: 'token123',
        user: { id: '1', address: loginDto.address },
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await authController.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto.address,
        loginDto.message,
        loginDto.signature,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should throw UnauthorizedException on invalid signature', async () => {
      const loginDto = {
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        message: 'Sign in to Perpetual Exchange',
        signature: '0xinvalid',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid signature'),
      );

      await expect(authController.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
