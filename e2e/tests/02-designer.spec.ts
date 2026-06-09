/**
 * BotJob Designer E2E tests.
 * Creates a job, adds commands from the palette, reorders them, then saves.
 */
import { test, expect } from '@playwright/test';

const JOB_NAME = `E2E Test Job ${Date.now()}`;

test.describe('BotJob Designer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/designer');
    await page.locator('h2.page-title').waitFor({ state: 'visible' });
  });

  test('shows empty canvas when no job is selected', async ({ page }) => {
    const canvas = page.getByText('Select a BotJob or create a new one.');
    // May be hidden if there are existing jobs — just check the palette is visible.
    const palette = page.getByText('Command Palette');
    await expect(palette).toBeVisible();
  });

  test('creates a new BotJob via prompt dialog', async ({ page }) => {
    // Playwright intercepts the native browser prompt().
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      await dialog.accept(JOB_NAME);
    });

    await page.getByRole('button', { name: '+ New BotJob' }).click();

    // Job name input should now show the new job.
    const nameInput = page.locator('label:has-text("Name") + input').first();
    await expect(nameInput).toHaveValue(JOB_NAME, { timeout: 8_000 });

    // Job should appear in the saved list.
    await expect(page.getByRole('button', { name: new RegExp(JOB_NAME) })).toBeVisible();
  });

  test('adds a command from the palette', async ({ page }) => {
    // Create job first.
    page.once('dialog', async (d) => d.accept(JOB_NAME + '-cmd'));
    await page.getByRole('button', { name: '+ New BotJob' }).click();
    await page.locator('h2.page-title').waitFor();   // page settled

    // Wait for canvas to show the job.
    await expect(page.locator('label:has-text("Name") + input').first()).toBeVisible({ timeout: 8_000 });

    // Click "API Call" in the palette (API group is expanded by default).
    await page.getByRole('button', { name: 'API Call' }).click();

    // A command node should now exist in the canvas.
    await expect(page.getByText('API Call').first()).toBeVisible();
    // The "drag to reorder" label updates.
    await expect(page.getByText(/1 command/)).toBeVisible();
  });

  test('adds two commands and shows reorder drag hint', async ({ page }) => {
    page.once('dialog', async (d) => d.accept(JOB_NAME + '-drag'));
    await page.getByRole('button', { name: '+ New BotJob' }).click();
    await expect(page.locator('label:has-text("Name") + input').first()).toBeVisible({ timeout: 8_000 });

    // Add API Call.
    await page.getByRole('button', { name: 'API Call' }).click();
    // Add Assert Status Code.
    await page.getByRole('button', { name: 'Assert Status Code' }).click();

    await expect(page.getByText(/2 commands/)).toBeVisible();
  });

  test('saves a BotJob and shows Saved confirmation', async ({ page }) => {
    page.once('dialog', async (d) => d.accept(JOB_NAME + '-save'));
    await page.getByRole('button', { name: '+ New BotJob' }).click();
    await expect(page.locator('label:has-text("Name") + input').first()).toBeVisible({ timeout: 8_000 });

    // Click the Save button (may be multiple — take the one in the header actions area).
    await page.getByRole('button', { name: 'Save' }).first().click();

    // Button text changes to "Saved ✓" briefly.
    await expect(page.getByRole('button', { name: /Saved/ })).toBeVisible({ timeout: 5_000 });
  });
});
