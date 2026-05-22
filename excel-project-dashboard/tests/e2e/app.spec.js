import { test, expect } from '@playwright/test';

test.describe('Excel Project Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.app');
  });

  test('should load the dashboard with breadcrumbs', async ({ page }) => {
    await expect(page.locator('.app')).toBeVisible();
    await expect(page.locator('.breadcrumbs')).toBeVisible();
    await expect(page.locator('.breadcrumb-item')).toHaveCount(4);
  });

  test('should display filter bar with date and type filters', async ({ page }) => {
    await expect(page.locator('.filter-bar')).toBeVisible();
    await expect(page.locator('.filter-label', { hasText: '时间范围' })).toBeVisible();
    await expect(page.locator('.filter-label', { hasText: '项目类型' })).toBeVisible();
    await expect(page.locator('.query-btn')).toBeVisible();
  });

  test('should have working quick date buttons', async ({ page }) => {
    const monthBtn = page.locator('.quick-date-btn', { hasText: '本月' });
    const customBtn = page.locator('.quick-date-btn', { hasText: '自定义' });
    await expect(monthBtn).toBeVisible();
    await expect(customBtn).toBeVisible();
    await expect(monthBtn).toHaveClass(/active/);
    await customBtn.click();
    await expect(customBtn).toHaveClass(/active/);
  });

  test('should have working project type buttons', async ({ page }) => {
    await expect(page.locator('.type-btn', { hasText: '全部' })).toBeVisible();
    await expect(page.locator('.type-btn', { hasText: '经营项目' })).toBeVisible();
    await expect(page.locator('.type-btn', { hasText: '自筹项目' })).toBeVisible();
  });

  test('should display KPI cards section', async ({ page }) => {
    await expect(page.locator('.kpi-section')).toBeVisible();
    const count = await page.locator('.kpi-card').count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display table section with tabs', async ({ page }) => {
    await expect(page.locator('.table-section')).toBeVisible();
    await expect(page.locator('.main-tabs')).toBeVisible();
    await expect(page.locator('.tab-btn', { hasText: '初验项目明细' })).toBeVisible();
    await expect(page.locator('.tab-btn', { hasText: '终验项目明细' })).toBeVisible();
  });

  test('should display upload area', async ({ page }) => {
    await expect(page.locator('.upload-section')).toBeVisible();
    await expect(page.locator('.upload-area')).toBeVisible();
    await expect(page.locator('.upload-title')).toBeVisible();
  });
});
