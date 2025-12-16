/**
 * @jest-environment node
 */

import { POST } from '@/app/api/auth/logout/route';
import { NextRequest } from 'next/server';

// Mock the auth functions
const mockDestroySession = jest.fn();

jest.mock('@/lib/auth/session', () => ({
  destroySession: mockDestroySession,
}));

// Helper function to create a mock request
function createMockRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('/api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST request handling', () => {
    it('should logout successfully', async () => {
      const request = createMockRequest();
      mockDestroySession.mockResolvedValue(undefined);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockDestroySession).toHaveBeenCalledTimes(1);
    });

    it('should handle logout without active session', async () => {
      const request = createMockRequest();
      mockDestroySession.mockResolvedValue(undefined);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockDestroySession).toHaveBeenCalledTimes(1);
    });

    it('should handle session destruction errors', async () => {
      const request = createMockRequest();
      mockDestroySession.mockRejectedValue(new Error('Session destruction failed'));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
    });

    it('should handle concurrent logout requests', async () => {
      const request1 = createMockRequest();
      const request2 = createMockRequest();
      
      mockDestroySession.mockResolvedValue(undefined);

      const promise1 = POST(request1);
      const promise2 = POST(request2);
      
      const [response1, response2] = await Promise.all([promise1, promise2]);
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(mockDestroySession).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const request = createMockRequest();
      
      // Mock a more complex error scenario
      mockDestroySession.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
    });

    it('should not expose internal error details', async () => {
      const request = createMockRequest();
      
      const sensitiveError = new Error('Database connection failed on server xyz123');
      mockDestroySession.mockRejectedValue(sensitiveError);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
      
      // Ensure sensitive information is not leaked
      expect(JSON.stringify(data)).not.toContain('Database');
      expect(JSON.stringify(data)).not.toContain('xyz123');
    });

    it('should log errors for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const request = createMockRequest();
      const testError = new Error('Test logout error');
      mockDestroySession.mockRejectedValue(testError);

      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith('Logout error:', testError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Security considerations', () => {
    it('should always attempt to destroy session even if already invalid', async () => {
      const request = createMockRequest();
      
      // Even if there's no valid session, we should still try to clear it
      mockDestroySession.mockResolvedValue(undefined);

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockDestroySession).toHaveBeenCalled();
    });

    it('should not leak session information in error responses', async () => {
      const request = createMockRequest();
      
      const errorWithSessionInfo = new Error('Failed to delete session token abc123xyz');
      mockDestroySession.mockRejectedValue(errorWithSessionInfo);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(JSON.stringify(data)).not.toContain('abc123xyz');
      expect(JSON.stringify(data)).not.toContain('token');
    });

    it('should handle rapid multiple logout attempts', async () => {
      const requests = Array(10).fill(0).map(() => createMockRequest());
      
      mockDestroySession.mockResolvedValue(undefined);

      const responses = await Promise.all(
        requests.map(request => POST(request))
      );

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      expect(mockDestroySession).toHaveBeenCalledTimes(10);
    });
  });

  describe('Response consistency', () => {
    it('should always return consistent response structure', async () => {
      const request = createMockRequest();
      mockDestroySession.mockResolvedValue(undefined);

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(typeof data.success).toBe('boolean');
      expect(Object.keys(data)).toEqual(['success']);
    });

    it('should return consistent error structure', async () => {
      const request = createMockRequest();
      mockDestroySession.mockRejectedValue(new Error('Test error'));

      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
      expect(Object.keys(data)).toEqual(['error']);
    });

    it('should have appropriate response headers', async () => {
      const request = createMockRequest();
      mockDestroySession.mockResolvedValue(undefined);

      const response = await POST(request);

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});