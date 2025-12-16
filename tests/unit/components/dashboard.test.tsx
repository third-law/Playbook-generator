import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '@/app/dashboard/page';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockAnalyses = [
  {
    id: '1',
    customer_name: 'Test Customer 1',
    brief_count: 5,
    created_at: '2023-12-01T10:00:00Z',
  },
  {
    id: '2',
    customer_name: 'Another Company',
    brief_count: 3,
    created_at: '2023-12-02T15:30:00Z',
  },
];

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Rendering', () => {
    it('should render dashboard header correctly', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<DashboardPage />);

      expect(screen.getByText('AI Visibility Tool')).toBeInTheDocument();
      expect(screen.getByText('Previous Analyses')).toBeInTheDocument();
      expect(screen.getByText('View and manage your AI visibility analyses')).toBeInTheDocument();
    });

    it('should render Create New Analysis button', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<DashboardPage />);

      const createButton = screen.getByText('Create New Analysis');
      expect(createButton).toBeInTheDocument();
      expect(createButton.closest('a')).toHaveAttribute('href', '/analyze/new');
    });

    it('should render search input', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<DashboardPage />);

      const searchInput = screen.getByPlaceholderText('Search by customer name...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should render logout button', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<DashboardPage />);

      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  describe('Data Loading', () => {
    it('should show loading state initially', () => {
      mockFetch.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve([]),
        }), 100))
      );

      render(<DashboardPage />);

      expect(screen.getByText('Loading analyses...')).toBeInTheDocument();
    });

    it('should fetch analyses on mount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAnalyses),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analyses/list');
      });
    });

    it('should display analyses when loaded', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAnalyses),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer 1')).toBeInTheDocument();
        expect(screen.getByText('Another Company')).toBeInTheDocument();
      });

      expect(screen.getByText('5 briefs • Created 12/1/2023')).toBeInTheDocument();
      expect(screen.getByText('3 briefs • Created 12/2/2023')).toBeInTheDocument();
    });

    it('should show empty state when no analyses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('No analyses found')).toBeInTheDocument();
      });

      const createFirstAnalysisLink = screen.getByText('Create your first analysis →');
      expect(createFirstAnalysisLink.closest('a')).toHaveAttribute('href', '/analyze/new');
    });

    it('should handle fetch errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<DashboardPage />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching analyses:', expect.any(Error));
      });

      // Should still show empty state or handle gracefully
      expect(screen.queryByText('Loading analyses...')).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAnalyses),
      });
    });

    it('should filter analyses by customer name', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer 1')).toBeInTheDocument();
        expect(screen.getByText('Another Company')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by customer name...');
      await user.type(searchInput, 'Test');

      expect(screen.getByText('Test Customer 1')).toBeInTheDocument();
      expect(screen.queryByText('Another Company')).not.toBeInTheDocument();
    });

    it('should be case insensitive', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by customer name...');
      await user.type(searchInput, 'test');

      expect(screen.getByText('Test Customer 1')).toBeInTheDocument();
    });

    it('should show no results when search does not match', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by customer name...');
      await user.type(searchInput, 'NonExistent');

      expect(screen.queryByText('Test Customer 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Another Company')).not.toBeInTheDocument();
    });

    it('should clear search results when input is cleared', async () => {
      const user = userEvent.setup();
      
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by customer name...');
      await user.type(searchInput, 'Test');

      expect(screen.queryByText('Another Company')).not.toBeInTheDocument();

      await user.clear(searchInput);

      expect(screen.getByText('Test Customer 1')).toBeInTheDocument();
      expect(screen.getByText('Another Company')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAnalyses),
      });
    });

    it('should navigate to analysis detail on click', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer 1')).toBeInTheDocument();
      });

      const analysisLink = screen.getByText('Test Customer 1').closest('a');
      expect(analysisLink).toHaveAttribute('href', '/analyze/1');
    });

    it('should handle logout', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAnalyses),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      render(<DashboardPage />);

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Analysis List Display', () => {
    it('should format dates correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          {
            id: '1',
            customer_name: 'Test Customer',
            brief_count: 5,
            created_at: '2023-12-01T10:00:00Z',
          }
        ]),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText(/Created 12\/1\/2023/)).toBeInTheDocument();
      });
    });

    it('should display correct brief count', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          {
            id: '1',
            customer_name: 'Test Customer',
            brief_count: 7,
            created_at: '2023-12-01T10:00:00Z',
          }
        ]),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('7 briefs •')).toBeInTheDocument();
      });
    });

    it('should handle singular brief count', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([
          {
            id: '1',
            customer_name: 'Test Customer',
            brief_count: 1,
            created_at: '2023-12-01T10:00:00Z',
          }
        ]),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('1 briefs •')).toBeInTheDocument();
      });
    });

    it('should show arrow icon for each analysis', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAnalyses),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        const arrowIcons = screen.getAllByRole('img', { hidden: true });
        expect(arrowIcons.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockAnalyses),
      });
    });

    it('should have proper heading hierarchy', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'AI Visibility Tool' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2, name: 'Previous Analyses' })).toBeInTheDocument();
      });
    });

    it('should have accessible links', async () => {
      render(<DashboardPage />);

      await waitFor(() => {
        const links = screen.getAllByRole('link');
        links.forEach(link => {
          expect(link).toHaveAttribute('href');
        });
      });
    });

    it('should have accessible form elements', () => {
      render(<DashboardPage />);

      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveAttribute('placeholder');
    });

    it('should have accessible buttons', () => {
      render(<DashboardPage />);

      const logoutButton = screen.getByRole('button', { name: 'Logout' });
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle non-ok response status', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading analyses...')).not.toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it('should handle malformed response data', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null), // Invalid response
      });

      render(<DashboardPage />);

      await waitFor(() => {
        expect(screen.queryByText('Loading analyses...')).not.toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });
});