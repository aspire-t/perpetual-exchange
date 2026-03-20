import { ConfigService } from '@nestjs/config';
import { getRequiredConfig } from './required-config';

describe('getRequiredConfig', () => {
  it('should return config value when present', () => {
    const configService = {
      get: jest.fn((key: string) => (key === 'JWT_SECRET' ? 'secret' : undefined)),
    } as unknown as ConfigService;

    expect(getRequiredConfig(configService, 'JWT_SECRET')).toBe('secret');
  });

  it('should throw when config value is missing', () => {
    const configService = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;

    expect(() => getRequiredConfig(configService, 'JWT_SECRET')).toThrow(
      'JWT_SECRET is required',
    );
  });
});
