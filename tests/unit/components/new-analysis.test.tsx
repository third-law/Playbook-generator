import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewAnalysisPage from '@/app/analyze/new/page';

// Mock router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('New Analysis Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render page header correctly', () => {
      render(<NewAnalysisPage />);

      expect(screen.getByText('AI Visibility Tool')).toBeInTheDocument();
      expect(screen.getByText('Create New Analysis')).toBeInTheDocument();
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    });

    it('should render form elements', () => {
      render(<NewAnalysisPage />);

      expect(screen.getByLabelText('Customer Name *')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter customer or company name')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Analysis' })).toBeInTheDocument();
    });

    it('should render development notice', () => {
      render(<NewAnalysisPage />);

      expect(screen.getByText('Feature Under Development')).toBeInTheDocument();
      expect(screen.getByText(/The full analysis creation workflow is currently being developed/)).toBeInTheDocument();
    });

    it('should have submit button disabled initially', () => {
      render(<NewAnalysisPage />);

      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Interaction', () => {
    it('should enable submit button when customer name is entered', async () => {
      const user = userEvent.setup();
      render(<NewAnalysisPage />);

      const input = screen.getByLabelText('Customer Name *');
      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });

      expect(submitButton).toBeDisabled();

      await user.type(input, 'Test Customer');

      expect(submitButton).toBeEnabled();
    });

    it('should disable submit button when customer name is removed', async () => {
      const user = userEvent.setup();
      render(<NewAnalysisPage />);

      const input = screen.getByLabelText('Customer Name *');
      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });

      await user.type(input, 'Test Customer');
      expect(submitButton).toBeEnabled();

      await user.clear(input);
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button for whitespace-only input', async () => {
      const user = userEvent.setup();
      render(<NewAnalysisPage />);

      const input = screen.getByLabelText('Customer Name *');
      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });

      await user.type(input, '   ');
      expect(submitButton).toBeDisabled();
    });

    it('should update input value correctly', async () => {
      const user = userEvent.setup();
      render(<NewAnalysisPage />);

      const input = screen.getByLabelText('Customer Name *') as HTMLInputElement;

      await user.type(input, 'Acme Corporation');
      expect(input.value).toBe('Acme Corporation');
    });
  });

  describe('Form Submission', () => {
    it('should show error when submitting empty form', async () => {
      render(<NewAnalysisPage />);

      const form = screen.getByRole('form') || screen.getByTestId('form') || screen.getByText('Create Analysis').closest('form');
      if (form) {
        fireEvent.submit(form);
      } else {
        // Fallback: click submit button directly
        const submitButton = screen.getByRole('button', { name: 'Create Analysis' });
        fireEvent.click(submitButton);
      }

      await waitFor(() => {
        expect(screen.getByText('Customer name is required')).toBeInTheDocument();
      });
    });

    it('should show error for whitespace-only customer name', async () => {
      const user = userEvent.setup();
      render(<NewAnalysisPage />);

      const input = screen.getByLabelText('Customer Name *');
      await user.type(input, '   ');

      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Customer name is required')).toBeInTheDocument();
      });
    });

    it('should navigate to dashboard on successful submission', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<NewAnalysisPage />);

      const input = screen.getByLabelText('Customer Name *');
      await user.type(input, 'Test Customer');

      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Creating analysis for:', 'Test Customer');
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });

      consoleSpy.mockRestore();
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      render(<NewAnalysisPage />);

      const input = screen.getByLabelText('Customer Name *');
      await user.type(input, 'Test Customer');

      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });
      fireEvent.click(submitButton);

      // Check for loading state (might be brief)
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      
      // Wait for submission to complete
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should disable form elements during loading', async () => {
      const user = userEvent.setup();
      render(<NewAnalysisPage />);

      const input = screen.getByLabelText('Customer Name *');
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      
      await user.type(input, 'Test Customer');

      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });
      fireEvent.click(submitButton);

      // Elements should be disabled during loading
      expect(input).toBeDisabled();
      expect(cancelButton).toBeDisabled();

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should clear error when typing after error', async () => {
      const user = userEvent.setup();
      render(<NewAnalysisPage />);

      // Submit empty form to trigger error
      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Customer name is required')).toBeInTheDocument();
      });

      // Start typing in input
      const input = screen.getByLabelText('Customer Name *');
      await user.type(input, 'T');

      // Error should be cleared
      expect(screen.queryByText('Customer name is required')).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to dashboard when clicking Back button', () => {
      render(<NewAnalysisPage />);

      const backButton = screen.getByText('Back to Dashboard');
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to dashboard when clicking Cancel button', () => {
      render(<NewAnalysisPage />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<NewAnalysisPage />);

      expect(screen.getByRole('heading', { level: 1, name: 'AI Visibility Tool' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Create New Analysis' })).toBeInTheDocument();
    });

    it('should have proper form labels', () => {
      render(<NewAnalysisPage />);

      const input = screen.getByLabelText('Customer Name *');
      expect(input).toBeRequired();
    });

    it('should have accessible buttons', () => {
      render(<NewAnalysisPage />);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });

      expect(cancelButton).toBeInTheDocument();
      expect(submitButton).toBeInTheDocument();
    });

    it('should show error messages accessibly', async () => {
      render(<NewAnalysisPage />);

      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('Customer name is required');
        expect(errorMessage).toHaveClass('text-red-700');
      });
    });
  });

  describe('Visual States', () => {
    it('should show loading spinner when submitting', async () => {
      const user = userEvent.setup();
      render(<NewAnalysisPage />);

      const input = screen.getByLabelText('Customer Name *');
      await user.type(input, 'Test Customer');

      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });
      fireEvent.click(submitButton);

      // Check for spinner (SVG with spinning animation)
      const spinner = screen.getByText('Creating...').previousElementSibling;
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should show error styling when error is displayed', async () => {
      render(<NewAnalysisPage />);

      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorContainer = screen.getByText('Customer name is required').closest('div');
        expect(errorContainer).toHaveClass('bg-red-100', 'border-red-400', 'text-red-700');
      });
    });

    it('should show disabled styling on submit button', () => {
      render(<NewAnalysisPage />);

      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });
      expect(submitButton).toHaveClass('disabled:bg-gray-400', 'disabled:cursor-not-allowed');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long customer names', async () => {
      const user = userEvent.setup();
      render(<NewAnalysisPage />);

      const longName = 'A'.repeat(1000);
      const input = screen.getByLabelText('Customer Name *');
      
      await user.type(input, longName);
      expect((input as HTMLInputElement).value).toBe(longName);

      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });
      expect(submitButton).toBeEnabled();
    });

    it('should handle special characters in customer name', async () => {
      const user = userEvent.setup();
      render(<NewAnalysisPage />);

      const specialName = 'Test & Co. <script>alert("test")</script>';
      const input = screen.getByLabelText('Customer Name *');
      
      await user.type(input, specialName);
      expect((input as HTMLInputElement).value).toBe(specialName);
    });

    it('should handle unicode characters', async () => {
      const user = userEvent.setup();
      render(<NewAnalysisPage />);

      const unicodeName = '测试公司 🏢 العربية';
      const input = screen.getByLabelText('Customer Name *');
      
      await user.type(input, unicodeName);
      expect((input as HTMLInputElement).value).toBe(unicodeName);
    });

    it('should trim whitespace from customer name before validation', async () => {
      const user = userEvent.setup();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      render(<NewAnalysisPage />);

      const input = screen.getByLabelText('Customer Name *');
      await user.type(input, '  Test Customer  ');

      const submitButton = screen.getByRole('button', { name: 'Create Analysis' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Creating analysis for:', '  Test Customer  ');
      });

      consoleSpy.mockRestore();
    });
  });
});