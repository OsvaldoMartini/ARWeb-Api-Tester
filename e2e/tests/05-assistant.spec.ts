/**
 * AR Conversational Banking (AI Assistant) E2E tests.
 * Covers the welcome modal, mode selection, and submitting a question.
 */
import { test, expect } from '@playwright/test';

const INTRO_KEY = 'arweb_assistant_intro_seen';

test.describe('AR Conversational Banking', () => {
  test('shows welcome modal on first visit', async ({ page }) => {
    // Do NOT pre-set the localStorage key → modal should appear.
    await page.goto('/assistant');

    // Modal overlay: the WelcomeModal renders a full-screen fixed backdrop.
    // Use a text-based anchor that is unique to the modal.
    await expect(page.getByRole('button', { name: /Start as Bank Employee/ })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /Start as e-Banking Client/ })).toBeVisible();
    await expect(page.getByText('Select a conversation perspective to begin')).toBeVisible();
  });

  test('dismisses modal when Employee mode is selected', async ({ page }) => {
    await page.goto('/assistant');

    const employeeBtn = page.getByRole('button', { name: /Start as Bank Employee/ });
    await expect(employeeBtn).toBeVisible({ timeout: 8_000 });
    await employeeBtn.click();

    // After dismissal, the mode buttons must be gone.
    await expect(employeeBtn).toBeHidden({ timeout: 5_000 });
    // Page title is still visible after modal closes.
    await expect(page.locator('h2.page-title')).toHaveText('AR Conversational Banking');
  });

  test('dismisses modal via the X close button', async ({ page }) => {
    await page.goto('/assistant');

    const closeBtn = page.getByTitle('Close without changing mode');
    await expect(closeBtn).toBeVisible({ timeout: 8_000 });
    await closeBtn.click();

    await expect(page.getByRole('button', { name: /Start as Bank Employee/ })).toBeHidden({ timeout: 5_000 });
  });

  test('does not show welcome modal on second visit', async ({ page }) => {
    // Seed the key before navigating.
    await page.addInitScript((key) => {
      localStorage.setItem(key, '1');
    }, INTRO_KEY);

    await page.goto('/assistant');
    // Give time for React to mount — if modal were going to appear it would by now.
    await page.waitForTimeout(1_000);

    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toBeHidden();
  });

  test('renders question input and send button', async ({ page }) => {
    await page.addInitScript((key) => { localStorage.setItem(key, '1'); }, INTRO_KEY);
    await page.goto('/assistant');

    // The question textarea/input should be visible.
    await expect(page.locator('textarea, input[placeholder]').first()).toBeVisible({ timeout: 6_000 });
  });

  test('submits a question and receives an answer', async ({ page }) => {
    await page.addInitScript((key) => { localStorage.setItem(key, '1'); }, INTRO_KEY);
    await page.goto('/assistant');

    // Input is a plain <input>, not a <textarea>.
    const input = page.locator('input[placeholder*="Ask"]');
    await expect(input).toBeVisible({ timeout: 6_000 });

    await input.fill('What is the current balance of my accounts?');
    await page.getByRole('button', { name: 'Send' }).click();

    // The agent reply bubble has class "rounded-md border border-border bg-surface-alt".
    // Wait for any new bubble to appear — the turn list was empty before sending.
    const agentBubble = page.locator('.rounded-md.border.bg-surface-alt').filter({ hasText: /.+/ });
    await expect(agentBubble.first()).toBeVisible({ timeout: 30_000 });
  });
});
