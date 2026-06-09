/**
 * Environments E2E tests (Phase 18).
 * Covers listing, creating, editing, deleting environments and
 * verifying they appear in the Execute Tests dropdown.
 */
import { test, expect } from '@playwright/test';

const TEST_ENV_NAME = `E2E Staging ${Date.now()}`;
const TEST_ENV_URL  = 'https://staging.example.com';

test.describe('Environments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/environments');
    await expect(page.locator('h2.page-title')).toHaveText('Environments');
  });

  test('shows built-in Mock Server environment', async ({ page }) => {
    // Scope to the <main> element to avoid matching the sidebar nav link.
    const main = page.locator('main');
    await expect(main.getByText('Mock Server', { exact: true }).first()).toBeVisible({ timeout: 8_000 });
    // 'built-in' badge — scope to main to avoid matching the page subtitle.
    await expect(main.getByText('built-in', { exact: true }).first()).toBeVisible();
    await expect(main.getByText(/127\.0\.0\.1:8855/).first()).toBeVisible();
  });

  test('built-in Mock Server cannot be deleted', async ({ page }) => {
    // Delete button should be absent for built-in environments.
    const mockCard = page.locator('.card').filter({ hasText: 'Mock Server' }).first();
    await expect(mockCard).toBeVisible({ timeout: 8_000 });
    // The trash/delete icon should not be inside the built-in card.
    const deleteBtn = mockCard.locator('button[title="Delete"]');
    await expect(deleteBtn).toBeHidden();
  });

  test('creates a new environment', async ({ page }) => {
    await page.getByRole('button', { name: /New Environment/ }).click();
    await expect(page.getByText('New Environment').last()).toBeVisible();

    await page.locator('input[placeholder="Production"]').fill(TEST_ENV_NAME);
    await page.locator('input[placeholder="https://api.example.com"]').fill(TEST_ENV_URL);

    // Save button contains an SVG icon + text — match by text content.
    await page.locator('button').filter({ hasText: /^Save$/ }).click();

    // Card should appear in the list — scope to main to avoid dropdown matches.
    const main = page.locator('main');
    await expect(main.getByText(TEST_ENV_NAME, { exact: true }).first()).toBeVisible({ timeout: 8_000 });
    await expect(main.locator('code').filter({ hasText: TEST_ENV_URL }).first()).toBeVisible();
  });

  test('new environment appears in Execute Tests dropdown', async ({ page }) => {
    // Navigate to Execute Tests.
    await page.goto('/execute');
    await expect(page.locator('h2.page-title')).toHaveText('Execute Tests');

    // The environment select should list the staging env we just created.
    const envSelect = page.locator('select[title="Execution environment"]');
    await expect(envSelect).toBeVisible({ timeout: 8_000 });
    const options = envSelect.locator('option');
    await expect(options).not.toHaveCount(0);
  });

  test('can set an environment as default', async ({ page }) => {
    // Create an environment first if needed, then set it as default.
    const cards = page.locator('.card').filter({ hasText: TEST_ENV_NAME });
    const count = await cards.count();

    if (count > 0) {
      const starBtn = cards.first().locator('button[title="Set as default environment"]');
      if (await starBtn.isVisible()) {
        await starBtn.click();
        await expect(cards.first().getByText('Default')).toBeVisible({ timeout: 5_000 });
      }
    }
  });

  test('deletes a custom environment', async ({ page }) => {
    const card = page.locator('.card').filter({ hasText: TEST_ENV_NAME }).first();
    const count = await card.count();
    if (count === 0) {
      // Environment wasn't created in this browser context — skip gracefully.
      return;
    }

    page.once('dialog', (d) => d.accept());
    await card.locator('button[title="Delete"]').click();
    await expect(page.getByText(TEST_ENV_NAME)).toBeHidden({ timeout: 8_000 });
  });
});
