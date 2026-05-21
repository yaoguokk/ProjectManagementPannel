import { test } from '@playwright/test';

test('diagnostic - get page HTML', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2000);
  const html = await page.content();
  console.log(html.substring(0, 3000));
  await page.screenshot({ path: 'tests/e2e/diagnostic.png' });
});
