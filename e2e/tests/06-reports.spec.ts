/**
 * Reports & Exports E2E tests.
 * Verifies that the page loads, download cards are visible, and catalog exports
 * trigger file downloads (checked via response status — no actual file open needed).
 */
import { test, expect } from '@playwright/test';

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('h2.page-title')).toHaveText('Reports & Exports');
  });

  test('shows Run Exports section', async ({ page }) => {
    await expect(page.getByText('Run Exports')).toBeVisible();
    await expect(page.getByText(/HTML Report/i)).toBeVisible();
    await expect(page.getByText(/CSV Export/i)).toBeVisible();
  });

  test('shows Catalog Exports section', async ({ page }) => {
    await expect(page.getByText('Catalog Exports')).toBeVisible();
    await expect(page.getByText('Postman Collection', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Bash / curl Script', { exact: true }).first()).toBeVisible();
  });

  test('Postman export endpoint returns JSON', async ({ page, request }) => {
    const baseURL = page.url().replace(/\/$/, '').replace(/\/reports$/, '');
    // The sidecar is proxied at /api on the web deployment.
    const res = await request.get(`${baseURL}/api/catalog/export/postman`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');
    const body = await res.json();
    // Postman collection v2.1 shape.
    expect(body).toHaveProperty('info');
    expect(body).toHaveProperty('item');
  });

  test('Bash export endpoint returns text/plain', async ({ page, request }) => {
    const baseURL = page.url().replace(/\/$/, '').replace(/\/reports$/, '');
    const res = await request.get(`${baseURL}/api/catalog/export/bash`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/plain');
  });

  test('shows a run selector dropdown (or empty state)', async ({ page }) => {
    // Either a <select> with runs is shown, or an empty-state / loading message.
    const selector = page.locator('select');
    const empty    = page.getByText(/no runs yet|no execution/i);
    await expect(selector.or(empty).first()).toBeVisible({ timeout: 8_000 });
  });
});
