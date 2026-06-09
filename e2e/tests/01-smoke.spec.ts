/**
 * Smoke tests — every page must load and render its correct h2.page-title.
 * No API interaction, just navigation and DOM checks.
 */
import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/',           title: 'ARWEB API Tester' },
  { path: '/import',     title: 'Import APIs' },
  { path: '/catalog',    title: 'API Catalog' },
  { path: '/categories', title: 'Business Categories' },
  { path: '/assistant',  title: 'AR Conversational Banking' },
  { path: '/test-cases', title: 'Test Cases' },
  { path: '/builder',        title: 'Bot Builder' },
  { path: '/designer',      title: 'BotJob Designer' },
  { path: '/environments',  title: 'Environments' },
  { path: '/execute',       title: 'Execute Tests' },
  { path: '/mock',       title: 'Mock Server' },
  { path: '/reports',    title: 'Reports & Exports' },
  { path: '/settings',   title: 'Settings' },
] as const;

for (const { path, title } of PAGES) {
  test(`${path} — page title is "${title}"`, async ({ page }) => {
    // Suppress the assistant welcome modal so it doesn't block the title check.
    await page.addInitScript(() => {
      localStorage.setItem('arweb_assistant_intro_seen', '1');
    });

    await page.goto(path);

    // h2.page-title is rendered by <PageHeader> on every page.
    const heading = page.locator('h2.page-title');
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(title);
  });
}

test('sidebar navigation highlights the active item', async ({ page }) => {
  await page.goto('/catalog');
  // The active nav link should contain the label text and be visually distinct.
  const activeLink = page.locator('nav a[aria-current="page"], nav a.active').first();
  await expect(activeLink).toBeVisible();
});
