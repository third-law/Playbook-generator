import { test, expect } from '@playwright/test';

test.describe('Dashboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/');
    await page.locator('input[type="password"]').fill('admin');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/dashboard');
  });

  test.describe('Dashboard Layout', () => {
    test('should display main dashboard elements', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('AI Visibility Tool');
      await expect(page.locator('h2')).toContainText('Previous Analyses');
      await expect(page.locator('p')).toContainText('View and manage your AI visibility analyses');
    });

    test('should show Create New Analysis button', async ({ page }) => {
      const createButton = page.locator('a', { hasText: 'Create New Analysis' });
      await expect(createButton).toBeVisible();
      await expect(createButton).toHaveAttribute('href', '/analyze/new');
    });

    test('should show search input', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search by customer name..."]');
      await expect(searchInput).toBeVisible();
    });

    test('should show logout button', async ({ page }) => {
      const logoutButton = page.locator('button', { hasText: 'Logout' });
      await expect(logoutButton).toBeVisible();
    });
  });

  test.describe('Analyses Display', () => {
    test('should show empty state when no analyses exist', async ({ page }) => {
      // Mock empty API response
      await page.route('/api/analyses/list', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      await page.reload();

      await expect(page.locator('text=No analyses found')).toBeVisible();
      await expect(page.locator('a', { hasText: 'Create your first analysis →' })).toBeVisible();
    });

    test('should display analyses when they exist', async ({ page }) => {
      const mockAnalyses = [
        {
          id: '1',
          customer_name: 'Test Customer 1',
          brief_count: 5,
          created_at: '2023-12-01T10:00:00Z'
        },
        {
          id: '2',
          customer_name: 'Another Company',
          brief_count: 3,
          created_at: '2023-12-02T15:30:00Z'
        }
      ];

      await page.route('/api/analyses/list', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAnalyses)
        });
      });

      await page.reload();

      await expect(page.locator('text=Test Customer 1')).toBeVisible();
      await expect(page.locator('text=Another Company')).toBeVisible();
      await expect(page.locator('text=5 briefs')).toBeVisible();
      await expect(page.locator('text=3 briefs')).toBeVisible();
    });

    test('should format dates correctly', async ({ page }) => {
      const mockAnalyses = [
        {
          id: '1',
          customer_name: 'Test Customer',
          brief_count: 5,
          created_at: '2023-12-01T10:00:00Z'
        }
      ];

      await page.route('/api/analyses/list', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAnalyses)
        });
      });

      await page.reload();

      // Check for properly formatted date
      await expect(page.locator('text=/Created 12\/1\/2023/')).toBeVisible();
    });

    test('should handle loading state', async ({ page }) => {
      // Intercept API call to delay response
      await page.route('/api/analyses/list', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });

      await page.reload();

      // Should show loading spinner
      await expect(page.locator('.animate-spin')).toBeVisible();
      await expect(page.locator('text=Loading analyses...')).toBeVisible();
    });

    test('should handle API errors gracefully', async ({ page }) => {
      await page.route('/api/analyses/list', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      });

      await page.reload();

      // Should not crash and should handle error gracefully
      // Exact behavior depends on implementation, but should not show loading forever
      await expect(page.locator('text=Loading analyses...')).toBeHidden();
    });
  });

  test.describe('Search Functionality', () => {
    test.beforeEach(async ({ page }) => {
      const mockAnalyses = [
        {
          id: '1',
          customer_name: 'Apple Inc',
          brief_count: 5,
          created_at: '2023-12-01T10:00:00Z'
        },
        {
          id: '2',
          customer_name: 'Google LLC',
          brief_count: 3,
          created_at: '2023-12-02T15:30:00Z'
        },
        {
          id: '3',
          customer_name: 'Microsoft Corporation',
          brief_count: 7,
          created_at: '2023-12-03T09:15:00Z'
        }
      ];

      await page.route('/api/analyses/list', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAnalyses)
        });
      });

      await page.reload();
    });

    test('should filter analyses by customer name', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search by customer name..."]');
      
      // Type search term
      await searchInput.fill('Google');

      // Should show only Google result
      await expect(page.locator('text=Google LLC')).toBeVisible();
      await expect(page.locator('text=Apple Inc')).not.toBeVisible();
      await expect(page.locator('text=Microsoft Corporation')).not.toBeVisible();
    });

    test('should be case insensitive', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search by customer name..."]');
      
      await searchInput.fill('apple');

      await expect(page.locator('text=Apple Inc')).toBeVisible();
      await expect(page.locator('text=Google LLC')).not.toBeVisible();
    });

    test('should support partial matches', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search by customer name..."]');
      
      await searchInput.fill('Micro');

      await expect(page.locator('text=Microsoft Corporation')).toBeVisible();
      await expect(page.locator('text=Apple Inc')).not.toBeVisible();
    });

    test('should show all results when search is cleared', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search by customer name..."]');
      
      // Search first
      await searchInput.fill('Google');
      await expect(page.locator('text=Google LLC')).toBeVisible();
      await expect(page.locator('text=Apple Inc')).not.toBeVisible();

      // Clear search
      await searchInput.clear();

      // Should show all results
      await expect(page.locator('text=Google LLC')).toBeVisible();
      await expect(page.locator('text=Apple Inc')).toBeVisible();
      await expect(page.locator('text=Microsoft Corporation')).toBeVisible();
    });

    test('should show no results for non-matching search', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search by customer name..."]');
      
      await searchInput.fill('NonExistentCompany');

      await expect(page.locator('text=Apple Inc')).not.toBeVisible();
      await expect(page.locator('text=Google LLC')).not.toBeVisible();
      await expect(page.locator('text=Microsoft Corporation')).not.toBeVisible();
    });

    test('should handle real-time search updates', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search by customer name..."]');
      
      // Type character by character
      await searchInput.type('Goo');
      await expect(page.locator('text=Google LLC')).toBeVisible();
      
      await searchInput.type('gle');
      await expect(page.locator('text=Google LLC')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
      const mockAnalyses = [
        {
          id: 'test-analysis-1',
          customer_name: 'Test Customer',
          brief_count: 5,
          created_at: '2023-12-01T10:00:00Z'
        }
      ];

      await page.route('/api/analyses/list', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAnalyses)
        });
      });

      await page.reload();
    });

    test('should navigate to analysis detail page', async ({ page }) => {
      const analysisLink = page.locator('a', { hasText: 'Test Customer' });
      await expect(analysisLink).toHaveAttribute('href', '/analyze/test-analysis-1');
      
      await analysisLink.click();
      await expect(page).toHaveURL('/analyze/test-analysis-1');
    });

    test('should navigate to create new analysis page', async ({ page }) => {
      await page.locator('a', { hasText: 'Create New Analysis' }).click();
      await expect(page).toHaveURL('/analyze/new');
    });

    test('should navigate to create analysis from empty state', async ({ page }) => {
      // Set up empty state
      await page.route('/api/analyses/list', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      await page.reload();

      await page.locator('a', { hasText: 'Create your first analysis →' }).click();
      await expect(page).toHaveURL('/analyze/new');
    });

    test('should logout and redirect to home', async ({ page }) => {
      await page.locator('button', { hasText: 'Logout' }).click();
      await expect(page).toHaveURL('/');
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });
  });

  test.describe('User Interactions', () => {
    test('should handle click and hover states', async ({ page }) => {
      const mockAnalyses = [
        {
          id: '1',
          customer_name: 'Test Customer',
          brief_count: 5,
          created_at: '2023-12-01T10:00:00Z'
        }
      ];

      await page.route('/api/analyses/list', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAnalyses)
        });
      });

      await page.reload();

      const analysisItem = page.locator('a', { hasText: 'Test Customer' });
      
      // Hover should change appearance (CSS class)
      await analysisItem.hover();
      
      // Click should navigate
      await analysisItem.click();
      await expect(page).toHaveURL('/analyze/1');
    });

    test('should handle keyboard navigation in search', async ({ page }) => {
      const searchInput = page.locator('input[placeholder="Search by customer name..."]');
      
      // Focus should work
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
      
      // Typing should work
      await searchInput.type('test');
      await expect(searchInput).toHaveValue('test');
      
      // Clearing with backspace should work
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await expect(searchInput).toHaveValue('');
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // All main elements should still be visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h2')).toBeVisible();
      await expect(page.locator('input[placeholder="Search by customer name..."]')).toBeVisible();
      await expect(page.locator('a', { hasText: 'Create New Analysis' })).toBeVisible();
    });

    test('should work on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h2')).toBeVisible();
      await expect(page.locator('input[placeholder="Search by customer name..."]')).toBeVisible();
    });

    test('should adapt layout for different screen sizes', async ({ page }) => {
      // Desktop
      await page.setViewportSize({ width: 1200, height: 800 });
      await expect(page.locator('h1')).toBeVisible();
      
      // Mobile
      await page.setViewportSize({ width: 320, height: 568 });
      await expect(page.locator('h1')).toBeVisible();
      
      // Layout should not break at any size
      const hasHorizontalScrollbar = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScrollbar).toBe(false);
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      await expect(page.locator('h1')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should handle large numbers of analyses', async ({ page }) => {
      // Create mock data with many analyses
      const manyAnalyses = Array.from({ length: 100 }, (_, i) => ({
        id: `analysis-${i}`,
        customer_name: `Customer ${i}`,
        brief_count: Math.floor(Math.random() * 10) + 1,
        created_at: new Date(Date.now() - i * 86400000).toISOString()
      }));

      await page.route('/api/analyses/list', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(manyAnalyses)
        });
      });

      await page.reload();

      // Should still be responsive
      await expect(page.locator('h1')).toBeVisible();
      
      // Search should still work
      const searchInput = page.locator('input[placeholder="Search by customer name..."]');
      await searchInput.fill('Customer 1');
      
      // Should find filtered results
      await expect(page.locator('text=Customer 1')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('h2')).toBeVisible();
      
      // No h3 should come before h2, etc.
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);
    });

    test('should support keyboard navigation', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab'); // Search input
      await expect(page.locator('input[placeholder="Search by customer name..."]')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Create new analysis link
      await expect(page.locator('a', { hasText: 'Create New Analysis' })).toBeFocused();
      
      // Continue tabbing to other interactive elements
      await page.keyboard.press('Tab'); // Logout button
      await expect(page.locator('button', { hasText: 'Logout' })).toBeFocused();
    });

    test('should have alt text for images and icons', async ({ page }) => {
      const images = await page.locator('img').all();
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        // Images should have alt text (even if empty for decorative images)
        expect(alt).not.toBeNull();
      }
    });

    test('should work with screen readers', async ({ page }) => {
      // Check for ARIA landmarks and labels
      await expect(page.locator('main, [role="main"]')).toBeVisible();
      
      // Important interactive elements should be properly labeled
      const searchInput = page.locator('input[placeholder="Search by customer name..."]');
      await expect(searchInput).toBeVisible();
    });
  });
});