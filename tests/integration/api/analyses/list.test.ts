/**
 * @jest-environment node
 */

import { GET } from '@/app/api/analyses/list/route';
import { NextRequest } from 'next/server';

// Mock the database queries
const mockGetAnalyses = jest.fn();

jest.mock('@/lib/db/queries', () => ({
  getAnalyses: mockGetAnalyses,
}));

// Helper function to create a mock request
function createMockRequest(searchParams?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/analyses/list');
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  return new NextRequest(url, {
    method: 'GET',
  });
}

// Mock data for tests
const mockAnalyses = [
  {
    id: '1',
    customer_name: 'Test Customer 1',
    brief_count: 5,
    created_at: '2023-12-01T10:00:00Z',
    visibility_data: { seo: 85, social: 70 },
    technical_data: { performance: 90, security: 95 },
    competitive_insights: { position: 'strong' },
  },
  {
    id: '2',
    customer_name: 'Test Customer 2',
    brief_count: 3,
    created_at: '2023-12-02T15:30:00Z',
    visibility_data: { seo: 60, social: 45 },
    technical_data: { performance: 75, security: 80 },
    competitive_insights: { position: 'moderate' },
  },
];

describe('/api/analyses/list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET request handling', () => {
    it('should return analyses successfully', async () => {
      const request = createMockRequest();
      mockGetAnalyses.mockResolvedValue(mockAnalyses);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockAnalyses);
      expect(mockGetAnalyses).toHaveBeenCalledWith(50, 0); // Default limit and offset
    });

    it('should return empty array when no analyses exist', async () => {
      const request = createMockRequest();
      mockGetAnalyses.mockResolvedValue([]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should handle database query with default parameters', async () => {
      const request = createMockRequest();
      mockGetAnalyses.mockResolvedValue(mockAnalyses);

      await GET(request);

      expect(mockGetAnalyses).toHaveBeenCalledWith(50, 0);
    });

    it('should handle large datasets', async () => {
      const request = createMockRequest();
      const largeDataset = Array(100).fill(null).map((_, index) => ({
        id: `analysis-${index}`,
        customer_name: `Customer ${index}`,
        brief_count: Math.floor(Math.random() * 10) + 1,
        created_at: new Date().toISOString(),
        visibility_data: {},
        technical_data: {},
        competitive_insights: {},
      }));
      
      mockGetAnalyses.mockResolvedValue(largeDataset);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(100);
    });

    it('should maintain data structure integrity', async () => {
      const request = createMockRequest();
      mockGetAnalyses.mockResolvedValue(mockAnalyses);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Check that each analysis has required fields
      data.forEach((analysis: any) => {
        expect(analysis).toHaveProperty('id');
        expect(analysis).toHaveProperty('customer_name');
        expect(analysis).toHaveProperty('brief_count');
        expect(analysis).toHaveProperty('created_at');
        expect(typeof analysis.id).toBe('string');
        expect(typeof analysis.customer_name).toBe('string');
        expect(typeof analysis.brief_count).toBe('number');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors', async () => {
      const request = createMockRequest();
      mockGetAnalyses.mockRejectedValue(new Error('Database connection failed'));

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch analyses' });
    });

    it('should handle database timeout errors', async () => {
      const request = createMockRequest();
      mockGetAnalyses.mockRejectedValue(new Error('Query timeout'));

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch analyses' });
    });

    it('should handle unexpected database errors', async () => {
      const request = createMockRequest();
      mockGetAnalyses.mockRejectedValue(new Error('Unexpected database error'));

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch analyses' });
    });

    it('should handle malformed database responses', async () => {
      const request = createMockRequest();
      // Mock returns null instead of array
      mockGetAnalyses.mockResolvedValue(null);

      const response = await GET(request);

      // Should handle gracefully - either return empty array or 500
      expect([200, 500]).toContain(response.status);
    });

    it('should log errors for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const request = createMockRequest();
      const testError = new Error('Test database error');
      mockGetAnalyses.mockRejectedValue(testError);

      await GET(request);

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching analyses:', testError);
      
      consoleSpy.mockRestore();
    });

    it('should not expose internal error details', async () => {
      const request = createMockRequest();
      const sensitiveError = new Error('Database password is wrong for user admin123');
      mockGetAnalyses.mockRejectedValue(sensitiveError);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Failed to fetch analyses' });
      
      // Ensure sensitive information is not leaked
      expect(JSON.stringify(data)).not.toContain('password');
      expect(JSON.stringify(data)).not.toContain('admin123');
    });
  });

  describe('Data validation and security', () => {
    it('should handle analyses with missing optional fields', async () => {
      const incompleteAnalyses = [
        {
          id: '1',
          customer_name: 'Test Customer',
          brief_count: 5,
          created_at: '2023-12-01T10:00:00Z',
          // Missing optional fields
        },
      ];
      
      const request = createMockRequest();
      mockGetAnalyses.mockResolvedValue(incompleteAnalyses);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(incompleteAnalyses);
    });

    it('should handle analyses with special characters in customer names', async () => {
      const specialCharAnalyses = [
        {
          id: '1',
          customer_name: 'Test & Co. <script>alert("xss")</script>',
          brief_count: 5,
          created_at: '2023-12-01T10:00:00Z',
        },
      ];
      
      const request = createMockRequest();
      mockGetAnalyses.mockResolvedValue(specialCharAnalyses);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data[0].customer_name).toBe('Test & Co. <script>alert("xss")</script>');
      // Data should be returned as-is, client should handle sanitization
    });

    it('should handle concurrent requests', async () => {
      const request1 = createMockRequest();
      const request2 = createMockRequest();
      
      mockGetAnalyses.mockResolvedValue(mockAnalyses);

      const promise1 = GET(request1);
      const promise2 = GET(request2);
      
      const [response1, response2] = await Promise.all([promise1, promise2]);
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(mockGetAnalyses).toHaveBeenCalledTimes(2);
    });

    it('should handle very large customer names', async () => {
      const longNameAnalyses = [
        {
          id: '1',
          customer_name: 'A'.repeat(1000), // Very long name
          brief_count: 5,
          created_at: '2023-12-01T10:00:00Z',
        },
      ];
      
      const request = createMockRequest();
      mockGetAnalyses.mockResolvedValue(longNameAnalyses);

      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Performance considerations', () => {
    it('should complete requests in reasonable time', async () => {
      const request = createMockRequest();
      mockGetAnalyses.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockAnalyses), 100))
      );

      const startTime = Date.now();
      const response = await GET(request);
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle database slowness gracefully', async () => {
      const request = createMockRequest();
      
      // Simulate slow database
      mockGetAnalyses.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockAnalyses), 1000))
      );

      const response = await GET(request);
      
      expect(response.status).toBe(200);
    });
  });

  describe('Response format validation', () => {
    it('should return valid JSON', async () => {
      const request = createMockRequest();
      mockGetAnalyses.mockResolvedValue(mockAnalyses);

      const response = await GET(request);
      
      expect(response.headers.get('content-type')).toContain('application/json');
      
      // Should be valid JSON
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should maintain consistent response structure for success', async () => {
      const request = createMockRequest();
      mockGetAnalyses.mockResolvedValue(mockAnalyses);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should maintain consistent response structure for errors', async () => {
      const request = createMockRequest();
      mockGetAnalyses.mockRejectedValue(new Error('Test error'));

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
      expect(typeof data.error).toBe('string');
      expect(Object.keys(data)).toEqual(['error']);
    });
  });
});