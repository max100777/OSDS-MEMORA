import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/health', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'healthy', models: { lstm: 'untrained' } }),
  }));
});

test('opens the dashboard, navigates between sections, and opens the viva guide', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();

  await page.getByRole('button', { name: 'Simulator' }).click();
  await expect(page.getByRole('heading', { name: 'Memory Simulator' })).toBeVisible();

  await page.getByRole('button', { name: 'Algorithms' }).click();
  await expect(page.getByRole('heading', { name: 'Algorithm Comparison' })).toBeVisible();

  await page.getByTitle('Open OSDS Viva & Project Defense Cheat Sheet').click();
  await expect(page.getByRole('heading', { name: 'OSDS Viva Defense & Conceptual Architecture Guide' })).toBeVisible();
});
