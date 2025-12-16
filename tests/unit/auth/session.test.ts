/**
 * @jest-environment node
 */

import { createSession, verifySession, destroySession } from '@/lib/auth/session';

// Mock Next.js cookies
const mockCookies = {
  set: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
};

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve(mockCookies)),
}));

// Mock jose
const mockSign = jest.fn();
const mockVerify = jest.fn();

jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: mockSign,
  })),
  jwtVerify: mockVerify,
}));

describe('Session Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SESSION_SECRET = 'test-secret-key-for-testing';
  });

  describe('createSession', () => {
    it('should create a session with valid JWT token', async () => {
      const mockToken = 'mock.jwt.token';
      mockSign.mockResolvedValue(mockToken);

      await createSession();

      expect(mockSign).toHaveBeenCalledWith(expect.any(Uint8Array));
      expect(mockCookies.set).toHaveBeenCalledWith(
        'session',
        mockToken,
        {
          httpOnly: true,
          secure: false, // NODE_ENV is test
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/',
        }
      );
    });

    it('should set secure flag in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const mockToken = 'mock.jwt.token';
      mockSign.mockResolvedValue(mockToken);

      await createSession();

      expect(mockCookies.set).toHaveBeenCalledWith(
        'session',
        mockToken,
        expect.objectContaining({
          secure: true,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should use default secret if SESSION_SECRET not set', async () => {
      delete process.env.SESSION_SECRET;
      
      const mockToken = 'mock.jwt.token';
      mockSign.mockResolvedValue(mockToken);

      await createSession();

      expect(mockSign).toHaveBeenCalledWith(
        new TextEncoder().encode('dev-secret-change-in-production')
      );
    });

    it('should handle JWT signing errors', async () => {
      mockSign.mockRejectedValue(new Error('JWT signing failed'));

      await expect(createSession()).rejects.toThrow('JWT signing failed');
    });
  });

  describe('verifySession', () => {
    it('should return true for valid session token', async () => {
      const mockToken = 'valid.jwt.token';
      mockCookies.get.mockReturnValue({ value: mockToken });
      mockVerify.mockResolvedValue({ payload: { authenticated: true } });

      const result = await verifySession();

      expect(result).toBe(true);
      expect(mockVerify).toHaveBeenCalledWith(
        mockToken,
        expect.any(Uint8Array)
      );
    });

    it('should return false when no session cookie exists', async () => {
      mockCookies.get.mockReturnValue(undefined);

      const result = await verifySession();

      expect(result).toBe(false);
      expect(mockVerify).not.toHaveBeenCalled();
    });

    it('should return false when session cookie has no value', async () => {
      mockCookies.get.mockReturnValue({});

      const result = await verifySession();

      expect(result).toBe(false);
      expect(mockVerify).not.toHaveBeenCalled();
    });

    it('should return false for expired token', async () => {
      const mockToken = 'expired.jwt.token';
      mockCookies.get.mockReturnValue({ value: mockToken });
      mockVerify.mockRejectedValue(new Error('Token expired'));

      const result = await verifySession();

      expect(result).toBe(false);
    });

    it('should return false for invalid token signature', async () => {
      const mockToken = 'invalid.jwt.token';
      mockCookies.get.mockReturnValue({ value: mockToken });
      mockVerify.mockRejectedValue(new Error('Invalid signature'));

      const result = await verifySession();

      expect(result).toBe(false);
    });

    it('should return false for malformed token', async () => {
      const mockToken = 'malformed-token';
      mockCookies.get.mockReturnValue({ value: mockToken });
      mockVerify.mockRejectedValue(new Error('Malformed token'));

      const result = await verifySession();

      expect(result).toBe(false);
    });

    it('should use correct secret for verification', async () => {
      const customSecret = 'custom-secret-key';
      process.env.SESSION_SECRET = customSecret;
      
      const mockToken = 'valid.jwt.token';
      mockCookies.get.mockReturnValue({ value: mockToken });
      mockVerify.mockResolvedValue({ payload: { authenticated: true } });

      await verifySession();

      expect(mockVerify).toHaveBeenCalledWith(
        mockToken,
        new TextEncoder().encode(customSecret)
      );
    });
  });

  describe('destroySession', () => {
    it('should delete the session cookie', async () => {
      await destroySession();

      expect(mockCookies.delete).toHaveBeenCalledWith('session');
    });

    it('should handle cookie deletion errors gracefully', async () => {
      mockCookies.delete.mockImplementation(() => {
        throw new Error('Cookie deletion failed');
      });

      await expect(destroySession()).rejects.toThrow('Cookie deletion failed');
    });
  });

  describe('Session Flow Integration', () => {
    it('should complete full session lifecycle', async () => {
      // Create session
      const mockToken = 'lifecycle.test.token';
      mockSign.mockResolvedValue(mockToken);
      
      await createSession();
      
      expect(mockCookies.set).toHaveBeenCalledWith(
        'session',
        mockToken,
        expect.objectContaining({
          httpOnly: true,
          maxAge: 60 * 60 * 24 * 7,
        })
      );

      // Verify session
      mockCookies.get.mockReturnValue({ value: mockToken });
      mockVerify.mockResolvedValue({ payload: { authenticated: true } });
      
      const isValid = await verifySession();
      expect(isValid).toBe(true);

      // Destroy session
      await destroySession();
      expect(mockCookies.delete).toHaveBeenCalledWith('session');
    });

    it('should handle session verification after destruction', async () => {
      // Simulate destroyed session
      mockCookies.get.mockReturnValue(undefined);

      const isValid = await verifySession();
      expect(isValid).toBe(false);
    });
  });

  describe('Security Properties', () => {
    it('should use httpOnly flag for XSS protection', async () => {
      const mockToken = 'security.test.token';
      mockSign.mockResolvedValue(mockToken);

      await createSession();

      expect(mockCookies.set).toHaveBeenCalledWith(
        'session',
        mockToken,
        expect.objectContaining({
          httpOnly: true,
        })
      );
    });

    it('should use sameSite lax for CSRF protection', async () => {
      const mockToken = 'security.test.token';
      mockSign.mockResolvedValue(mockToken);

      await createSession();

      expect(mockCookies.set).toHaveBeenCalledWith(
        'session',
        mockToken,
        expect.objectContaining({
          sameSite: 'lax',
        })
      );
    });

    it('should set appropriate expiration time', async () => {
      const mockToken = 'expiration.test.token';
      mockSign.mockResolvedValue(mockToken);

      await createSession();

      expect(mockCookies.set).toHaveBeenCalledWith(
        'session',
        mockToken,
        expect.objectContaining({
          maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
        })
      );
    });

    it('should handle concurrent session operations', async () => {
      const mockToken1 = 'concurrent.test.token1';
      const mockToken2 = 'concurrent.test.token2';
      
      mockSign
        .mockResolvedValueOnce(mockToken1)
        .mockResolvedValueOnce(mockToken2);

      const promise1 = createSession();
      const promise2 = createSession();

      await Promise.all([promise1, promise2]);

      expect(mockCookies.set).toHaveBeenCalledTimes(2);
      expect(mockCookies.set).toHaveBeenNthCalledWith(1, 'session', mockToken1, expect.any(Object));
      expect(mockCookies.set).toHaveBeenNthCalledWith(2, 'session', mockToken2, expect.any(Object));
    });
  });
});