import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('archive page has no accessibility violations', async ({ page }) => {
    await page.goto('/archive');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('issue page has no accessibility violations', async ({ page }) => {
    await page.goto('/archive/2026-03-09-438-an-interactive-intro-to-crdts');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('404 page has no accessibility violations', async ({ page }) => {
    await page.goto('/does-not-exist');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
