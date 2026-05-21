import { test } from '@playwright/test';

test('diagnostic - capture errors', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/');
  await page.waitForTimeout(3000);

  console.log('--- console errors ---');
  errors.forEach(e => console.log(e));
  console.log('--- app div ---');
  const html = await page.locator('#app').innerHTML();
  console.log(html);
});
