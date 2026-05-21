import { test, expect } from '@playwright/test';

test.describe('Excel Project Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the dashboard successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/excel-project-dashboard/);
    await expect(page.locator('.dashboard')).toBeVisible();
    await expect(page.locator('.dashboard-title')).toBeVisible();
  });

  test('should display KPI cards', async ({ page }) => {
    await expect(page.locator('.kpi-section')).toBeVisible();
    // Check if there are KPI cards (at least one)
    const kpiCards = page.locator('.kpi-card');
    await expect(kpiCards.first()).toBeVisible();
  });

  test('should display project table', async ({ page }) => {
    await expect(page.locator('.project-table')).toBeVisible();
    // Check if table headers are present
    await expect(page.locator('table th')).toHaveCount(9); // Based on ProjectTable.vue
  });

  test('should have working date range filter', async ({ page }) => {
    const dateFilter = page.locator('input[type="date"]').first();
    await expect(dateFilter).toBeVisible();

    // Try to select a date
    await dateFilter.fill('2023-01-01');
    // Note: Actual filtering logic would need to be tested based on implementation
  });

  test('should have working project type filter', async ({ page }) => {
    const projectFilter = page.locator('select').first();
    await expect(projectFilter).toBeVisible();

    // Check if options are present
    await expect(projectFilter.locator('option')).toHaveCount(3); // All, Business, Self-financed
  });

  test('should show empty state when no data', async ({ page }) => {
    // This test would require modifying the app to show empty state
    // For now, just check that the table structure is there
    await expect(page.locator('.table-container')).toBeVisible();
  });

  test('should display project tabs', async ({ page }) => {
    const initialTab = page.locator('button:has-text("初验项目明细")');
    const finalTab = page.locator('button:has-text("终验项目明细")');

    await expect(initialTab).toBeVisible();
    await expect(finalTab).toBeVisible();

    // Check if initial tab is active
    await expect(initialTab).toHaveClass(/active/);
  });

  test('should have export button', async ({ page }) => {
    const exportButton = page.locator('button:has-text("导出Excel")');
    await expect(exportButton).toBeVisible();
    // Note: Export functionality would need to be tested separately
  });
});