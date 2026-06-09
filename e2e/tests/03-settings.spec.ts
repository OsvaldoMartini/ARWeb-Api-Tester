/**
 * Settings page E2E tests.
 * Covers provider selection and the API key save flow.
 */
import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h2.page-title')).toHaveText('Settings');
  });

  test('renders the provider selector', async ({ page }) => {
    const select = page.locator('select#provider');
    await expect(select).toBeVisible();
    // Should have at least one option.
    const options = select.locator('option');
    await expect(options).not.toHaveCount(0);
  });

  test('shows Base URL field for Ollama provider', async ({ page }) => {
    const select = page.locator('select#provider');
    await select.selectOption('ollama');
    await expect(page.locator('input#baseUrl')).toBeVisible();
    await expect(page.locator('input#baseUrl')).toHaveAttribute('placeholder', /localhost:11434/);
  });

  test('does not show Base URL for OpenAI provider', async ({ page }) => {
    const select = page.locator('select#provider');
    await select.selectOption('openai');
    await expect(page.locator('input#baseUrl')).toBeHidden();
  });

  test('saves a provider setting and shows success message', async ({ page }) => {
    // Select Anthropic, enter a dummy key, save.
    await page.locator('select#provider').selectOption('anthropic');
    await page.locator('input#apiKey').fill('sk-ant-test-playwright-e2e-key');

    await page.getByRole('button', { name: 'Save' }).click();

    // Success message should appear within 5 s.
    await expect(page.getByText('Saved — AI provider is active.')).toBeVisible({ timeout: 5_000 });
  });

  test('shows local services card with port info', async ({ page }) => {
    await expect(page.getByText('Local services')).toBeVisible();
    await expect(page.getByText('8787')).toBeVisible();
    await expect(page.getByText('8855')).toBeVisible();
  });

  test('shows AES-256-GCM encryption note', async ({ page }) => {
    await expect(page.getByText(/AES-256-GCM/)).toBeVisible();
  });
});
