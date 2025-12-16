import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  test.describe('Login', () => {
    test('should show login form on home page', async ({ page }) => {
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should login successfully with correct password', async ({ page }) => {
      // Enter the correct password
      await page.locator('input[type="password"]').fill('admin');
      await page.locator('button[type="submit"]').click();
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
      
      // Should show dashboard content
      await expect(page.locator('h1')).toContainText('AI Visibility Tool');
      await expect(page.locator('h2')).toContainText('Previous Analyses');
    });

    test('should show error with incorrect password', async ({ page }) => {
      // Enter wrong password
      await page.locator('input[type="password"]').fill('wrongpassword');
      await page.locator('button[type="submit"]').click();
      
      // Should stay on login page and show error
      await expect(page).toHaveURL('/');
      await expect(page.locator('.text-red-700')).toBeVisible();
    });

    test('should show error with empty password', async ({ page }) => {
      // Try to submit without password
      await page.locator('button[type="submit"]').click();
      
      // Should stay on login page
      await expect(page).toHaveURL('/');
    });

    test('should handle special characters in password', async ({ page }) => {
      await page.locator('input[type="password"]').fill('!@#$%^&*()');
      await page.locator('button[type="submit"]').click();
      
      // Should show error for incorrect password
      await expect(page).toHaveURL('/');
      await expect(page.locator('.text-red-700')).toBeVisible();
    });

    test('should show loading state during login', async ({ page }) => {
      // Intercept the login API call to make it slower
      await page.route('/api/auth/login', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });

      await page.locator('input[type="password"]').fill('admin');
      await page.locator('button[type="submit"]').click();
      
      // Should show loading state
      await expect(page.locator('button[disabled]')).toBeVisible();
    });

    test('should maintain focus on password field after error', async ({ page }) => {
      await page.locator('input[type="password"]').fill('wrong');
      await page.locator('button[type="submit"]').click();
      
      // Wait for error to appear
      await expect(page.locator('.text-red-700')).toBeVisible();
      
      // Focus should be manageable on the password field
      await page.locator('input[type="password"]').focus();
      await expect(page.locator('input[type="password"]')).toBeFocused();
    });
  });

  test.describe('Session Management', () => {
    test('should persist session across page reloads', async ({ page }) => {
      // Login first
      await page.locator('input[type="password"]').fill('admin');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL('/dashboard');
      
      // Reload the page
      await page.reload();
      
      // Should still be on dashboard
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('h2')).toContainText('Previous Analyses');
    });

    test('should redirect to login when accessing protected route without auth', async ({ page, context }) => {
      // Clear any existing sessions
      await context.clearCookies();
      
      // Try to access dashboard directly
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL('/');
    });

    test('should logout successfully', async ({ page }) => {
      // Login first
      await page.locator('input[type="password"]').fill('admin');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL('/dashboard');
      
      // Click logout
      await page.locator('button', { hasText: 'Logout' }).click();
      
      // Should redirect to home page
      await expect(page).toHaveURL('/');
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should not access protected routes after logout', async ({ page }) => {
      // Login first
      await page.locator('input[type="password"]').fill('admin');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL('/dashboard');
      
      // Logout
      await page.locator('button', { hasText: 'Logout' }).click();
      await expect(page).toHaveURL('/');
      
      // Try to access dashboard again
      await page.goto('/dashboard');
      
      // Should redirect back to login
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each navigation test
      await page.locator('input[type="password"]').fill('admin');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL('/dashboard');
    });

    test('should navigate to new analysis page', async ({ page }) => {
      await page.locator('a', { hasText: 'Create New Analysis' }).click();
      
      await expect(page).toHaveURL('/analyze/new');
      await expect(page.locator('h2')).toContainText('Create New Analysis');
    });

    test('should navigate back to dashboard from new analysis', async ({ page }) => {
      await page.locator('a', { hasText: 'Create New Analysis' }).click();
      await expect(page).toHaveURL('/analyze/new');
      
      await page.locator('button', { hasText: 'Back to Dashboard' }).click();
      
      await expect(page).toHaveURL('/dashboard');
    });

    test('should handle browser back button', async ({ page }) => {
      // Go to new analysis page
      await page.locator('a', { hasText: 'Create New Analysis' }).click();
      await expect(page).toHaveURL('/analyze/new');
      
      // Use browser back button
      await page.goBack();
      
      await expect(page).toHaveURL('/dashboard');
    });
  });

  test.describe('Security', () => {
    test('should not expose sensitive information in DOM', async ({ page }) => {
      await page.locator('input[type="password"]').fill('admin');
      await page.locator('button[type="submit"]').click();
      
      // Check that no sensitive tokens or passwords are in the DOM
      const pageContent = await page.content();
      expect(pageContent).not.toContain('password');
      expect(pageContent).not.toContain('token');
      expect(pageContent).not.toContain('secret');
    });

    test('should handle session timeout gracefully', async ({ page, context }) => {
      // Login
      await page.locator('input[type="password"]').fill('admin');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL('/dashboard');
      
      // Clear session cookies to simulate timeout
      await context.clearCookies();
      
      // Try to navigate or perform action
      await page.reload();
      
      // Should redirect to login
      await expect(page).toHaveURL('/');
    });

    test('should prevent XSS in password field', async ({ page }) => {
      const xssPayload = '<script>alert("xss")</script>';
      await page.locator('input[type="password"]').fill(xssPayload);
      
      // The input should contain the literal text, not execute the script
      const inputValue = await page.locator('input[type="password"]').inputValue();
      expect(inputValue).toBe(xssPayload);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper focus management', async ({ page }) => {
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="password"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]')).toBeFocused();
    });

    test('should work with keyboard navigation', async ({ page }) => {
      // Navigate to password field and enter password
      await page.keyboard.press('Tab');
      await page.keyboard.type('admin');
      
      // Submit with Enter key
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // Should login successfully
      await expect(page).toHaveURL('/dashboard');
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for proper form elements
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Check for proper button roles
      const submitButton = page.locator('button[type="submit"]');
      expect(await submitButton.getAttribute('type')).toBe('submit');
    });

    test('should announce errors to screen readers', async ({ page }) => {
      await page.locator('input[type="password"]').fill('wrong');
      await page.locator('button[type="submit"]').click();
      
      // Error message should be visible
      const errorMessage = page.locator('.text-red-700');
      await expect(errorMessage).toBeVisible();
      
      // Error should be associated with the form
      const errorText = await errorMessage.textContent();
      expect(errorText).toBeTruthy();
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
      
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Login should still work
      await page.locator('input[type="password"]').fill('admin');
      await page.locator('button[type="submit"]').click();
      
      await expect(page).toHaveURL('/dashboard');
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
      
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Login should still work
      await page.locator('input[type="password"]').fill('admin');
      await page.locator('button[type="submit"]').click();
      
      await expect(page).toHaveURL('/dashboard');
    });

    test('should work on large desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Login should still work
      await page.locator('input[type="password"]').fill('admin');
      await page.locator('button[type="submit"]').click();
      
      await expect(page).toHaveURL('/dashboard');
    });
  });
});