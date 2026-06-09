/**
 * Mock Server E2E tests.
 * Verifies the start/stop toggle and status indicator.
 */
import { test, expect } from '@playwright/test';

test.describe('Mock Server', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mock');
    await expect(page.locator('h2.page-title')).toHaveText('Mock Server');
  });

  test('shows server status badge (Running or Stopped)', async ({ page }) => {
    // Either status is valid — we just assert one is visible.
    const running = page.getByText('Running');
    const stopped = page.getByText('Stopped');
    await expect(running.or(stopped).first()).toBeVisible({ timeout: 8_000 });
  });

  test('Start button is present when server is stopped', async ({ page }) => {
    const running = await page.getByText('Running').isVisible().catch(() => false);
    if (!running) {
      await expect(page.getByRole('button', { name: '▶ Start' })).toBeVisible();
    }
  });

  test('stop button is present when server is running', async ({ page }) => {
    const running = await page.getByText('Running').isVisible().catch(() => false);
    if (running) {
      await expect(page.getByRole('button', { name: '■ Stop' })).toBeVisible();
    }
  });

  test('toggles mock server state', async ({ page }) => {
    // Determine current state.
    const isRunning = await page.getByText('Running').isVisible().catch(() => false);

    if (isRunning) {
      await page.getByRole('button', { name: '■ Stop' }).click();
      await expect(page.getByText('Stopped')).toBeVisible({ timeout: 10_000 });
      // Restart for other tests.
      await page.getByRole('button', { name: '▶ Start' }).click();
      await expect(page.getByText('Running')).toBeVisible({ timeout: 10_000 });
    } else {
      await page.getByRole('button', { name: '▶ Start' }).click();
      await expect(page.getByText('Running')).toBeVisible({ timeout: 10_000 });
      await page.getByRole('button', { name: '■ Stop' }).click();
      await expect(page.getByText('Stopped')).toBeVisible({ timeout: 10_000 });
    }
  });

  test('shows request log section', async ({ page }) => {
    await expect(page.getByText('Request log')).toBeVisible();
  });

  test('shows port information', async ({ page }) => {
    // Port number is shown inside a <code> element only when status has loaded.
    // Assert on the label text; the port value may take a moment to appear.
    await expect(page.getByText(/port/i).first()).toBeVisible({ timeout: 8_000 });
  });
});
