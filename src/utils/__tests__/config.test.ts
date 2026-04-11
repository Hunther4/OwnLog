import { getConfig } from '../config';

describe('getConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return the value of an environment variable', () => {
    process.env.TEST_VAR = 'test-value';
    expect(getConfig('TEST_VAR')).toBe('test-value');
  });

  it('should throw an error if a required environment variable is missing', () => {
    delete process.env.MISSING_VAR;
    expect(() => getConfig('MISSING_VAR', true)).toThrow('Missing required environment variable: MISSING_VAR');
  });

  it('should return undefined for non-required missing environment variable', () => {
    delete process.env.OPTIONAL_VAR;
    expect(getConfig('OPTIONAL_VAR', false)).toBeUndefined();
  });
});
