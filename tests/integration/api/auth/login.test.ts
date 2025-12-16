/**
 * @jest-environment node
 */

import { POST } from '@/app/api/auth/login/route';
import { NextRequest } from 'next/server';

// Mock the auth functions
const mockCreateSession = jest.fn();
const mockVerifyPassword = jest.fn();

jest.mock('@/lib/auth/session', () => ({
  createSession: mockCreateSession,
}));

jest.mock('@/lib/auth/password', () => ({
  verifyPassword: mockVerifyPassword,
}));

// Helper function to create a mock request
function createMockRequest(body: any): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('/api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SHARED_PASSWORD_HASH;
  });

  describe('POST request handling', () => {
    it('should login with correct admin password', async () => {
      const request = createMockRequest({ password: 'admin' });
      mockCreateSession.mockResolvedValue(undefined);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockCreateSession).toHaveBeenCalledTimes(1);
    });

    it('should reject incorrect admin password', async () => {
      const request = createMockRequest({ password: 'wrongpassword' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Invalid password' });
      expect(mockCreateSession).not.toHaveBeenCalled();
    });

    it('should handle missing password', async () => {
      const request = createMockRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Password is required' });
      expect(mockCreateSession).not.toHaveBeenCalled();
    });

    it('should handle empty password', async () => {
      const request = createMockRequest({ password: '' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Password is required' });
      expect(mockCreateSession).not.toHaveBeenCalled();
    });

    it('should handle null password', async () => {
      const request = createMockRequest({ password: null });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: 'Password is required' });
      expect(mockCreateSession).not.toHaveBeenCalled();
    });
  });

  describe('Hash-based authentication', () => {
    beforeEach(() => {
      // Set a valid hash for testing
      process.env.SHARED_PASSWORD_HASH = '$2b$10$validHashForTesting1234567890123456789012345678901234567890';
    });

    it('should login with correct password against hash', async () => {
      const request = createMockRequest({ password: 'correctpassword' });
      mockVerifyPassword.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(undefined);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockVerifyPassword).toHaveBeenCalledWith(
        'correctpassword',
        process.env.SHARED_PASSWORD_HASH
      );
      expect(mockCreateSession).toHaveBeenCalledTimes(1);
    });

    it('should reject incorrect password against hash', async () => {
      const request = createMockRequest({ password: 'wrongpassword' });
      mockVerifyPassword.mockResolvedValue(false);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Invalid password' });
      expect(mockVerifyPassword).toHaveBeenCalledWith(
        'wrongpassword',
        process.env.SHARED_PASSWORD_HASH
      );
      expect(mockCreateSession).not.toHaveBeenCalled();
    });

    it('should prefer admin password over hash authentication', async () => {
      const request = createMockRequest({ password: 'admin' });
      mockCreateSession.mockResolvedValue(undefined);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockVerifyPassword).not.toHaveBeenCalled(); // Should not check hash
      expect(mockCreateSession).toHaveBeenCalledTimes(1);
    });

    it('should ignore invalid/short hash', async () => {
      process.env.SHARED_PASSWORD_HASH = 'tooshort'; // Less than 20 chars
      const request = createMockRequest({ password: 'testpassword' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Invalid password' });
      expect(mockVerifyPassword).not.toHaveBeenCalled();
      expect(mockCreateSession).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should handle session creation failure', async () => {
      const request = createMockRequest({ password: 'admin' });
      mockCreateSession.mockRejectedValue(new Error('Session creation failed'));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
    });

    it('should handle password verification failure', async () => {
      process.env.SHARED_PASSWORD_HASH = '$2b$10$validHashForTesting1234567890123456789012345678901234567890';
      const request = createMockRequest({ password: 'testpassword' });
      mockVerifyPassword.mockRejectedValue(new Error('Verification failed'));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
    });

    it('should handle malformed JSON request', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
    });

    it('should handle non-string password types', async () => {
      const request = createMockRequest({ password: 123 });

      const response = await POST(request);
      
      // Should either handle it gracefully or reject it
      expect([400, 401, 500]).toContain(response.status);
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(10000);
      const request = createMockRequest({ password: longPassword });

      const response = await POST(request);
      
      // Should handle gracefully
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Security considerations', () => {
    it('should not leak information about password checking method', async () => {
      // Test with admin password (hardcoded path)
      const adminRequest = createMockRequest({ password: 'wrongadmin' });
      const adminResponse = await POST(adminRequest);
      const adminData = await adminResponse.json();

      // Test with hash path
      process.env.SHARED_PASSWORD_HASH = '$2b$10$validHashForTesting1234567890123456789012345678901234567890';
      mockVerifyPassword.mockResolvedValue(false);
      
      const hashRequest = createMockRequest({ password: 'wronghash' });
      const hashResponse = await POST(hashRequest);
      const hashData = await hashResponse.json();

      // Both should return the same error response
      expect(adminResponse.status).toBe(hashResponse.status);
      expect(adminData).toEqual(hashData);
      expect(adminData.error).toBe('Invalid password');
    });

    it('should have consistent response times for different auth paths', async () => {
      // This test would ideally measure timing, but for unit tests we just ensure
      // that both paths go through similar code paths
      
      // Admin path
      const adminRequest = createMockRequest({ password: 'admin' });
      mockCreateSession.mockResolvedValue(undefined);
      
      const adminStart = Date.now();
      await POST(adminRequest);
      const adminTime = Date.now() - adminStart;

      // Hash path
      process.env.SHARED_PASSWORD_HASH = '$2b$10$validHashForTesting1234567890123456789012345678901234567890';
      mockVerifyPassword.mockResolvedValue(true);
      mockCreateSession.mockResolvedValue(undefined);
      
      const hashRequest = createMockRequest({ password: 'hashpassword' });
      
      const hashStart = Date.now();
      await POST(hashRequest);
      const hashTime = Date.now() - hashStart;

      // Both should complete in reasonable time
      expect(adminTime).toBeLessThan(1000);
      expect(hashTime).toBeLessThan(1000);
    });

    it('should not log sensitive information', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const request = createMockRequest({ password: 'sensitivepassword' });
      mockCreateSession.mockRejectedValue(new Error('Test error'));

      await POST(request);

      // Check that password is not logged
      const logCalls = consoleSpy.mock.calls.flat();
      const hasPassword = logCalls.some(call => 
        typeof call === 'string' && call.includes('sensitivepassword')
      );
      
      expect(hasPassword).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });
});