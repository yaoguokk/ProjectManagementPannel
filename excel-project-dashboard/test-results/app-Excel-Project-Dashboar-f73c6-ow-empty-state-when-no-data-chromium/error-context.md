# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: app.spec.js >> Excel Project Dashboard E2E Tests >> should show empty state when no data
- Location: tests/e2e/app.spec.js:44:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/
Call log:
  - navigating to "http://127.0.0.1:5173/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Excel Project Dashboard E2E Tests', () => {
  4  |   test.beforeEach(async ({ page }) => {
> 5  |     await page.goto('/');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/
  6  |   });
  7  | 
  8  |   test('should load the dashboard successfully', async ({ page }) => {
  9  |     await expect(page).toHaveTitle(/excel-project-dashboard/);
  10 |     await expect(page.locator('.dashboard')).toBeVisible();
  11 |     await expect(page.locator('.dashboard-title')).toBeVisible();
  12 |   });
  13 | 
  14 |   test('should display KPI cards', async ({ page }) => {
  15 |     await expect(page.locator('.kpi-section')).toBeVisible();
  16 |     // Check if there are KPI cards (at least one)
  17 |     const kpiCards = page.locator('.kpi-card');
  18 |     await expect(kpiCards.first()).toBeVisible();
  19 |   });
  20 | 
  21 |   test('should display project table', async ({ page }) => {
  22 |     await expect(page.locator('.project-table')).toBeVisible();
  23 |     // Check if table headers are present
  24 |     await expect(page.locator('table th')).toHaveCount(9); // Based on ProjectTable.vue
  25 |   });
  26 | 
  27 |   test('should have working date range filter', async ({ page }) => {
  28 |     const dateFilter = page.locator('input[type="date"]').first();
  29 |     await expect(dateFilter).toBeVisible();
  30 | 
  31 |     // Try to select a date
  32 |     await dateFilter.fill('2023-01-01');
  33 |     // Note: Actual filtering logic would need to be tested based on implementation
  34 |   });
  35 | 
  36 |   test('should have working project type filter', async ({ page }) => {
  37 |     const projectFilter = page.locator('select').first();
  38 |     await expect(projectFilter).toBeVisible();
  39 | 
  40 |     // Check if options are present
  41 |     await expect(projectFilter.locator('option')).toHaveCount(3); // All, Business, Self-financed
  42 |   });
  43 | 
  44 |   test('should show empty state when no data', async ({ page }) => {
  45 |     // This test would require modifying the app to show empty state
  46 |     // For now, just check that the table structure is there
  47 |     await expect(page.locator('.table-container')).toBeVisible();
  48 |   });
  49 | 
  50 |   test('should display project tabs', async ({ page }) => {
  51 |     const initialTab = page.locator('button:has-text("初验项目明细")');
  52 |     const finalTab = page.locator('button:has-text("终验项目明细")');
  53 | 
  54 |     await expect(initialTab).toBeVisible();
  55 |     await expect(finalTab).toBeVisible();
  56 | 
  57 |     // Check if initial tab is active
  58 |     await expect(initialTab).toHaveClass(/active/);
  59 |   });
  60 | 
  61 |   test('should have export button', async ({ page }) => {
  62 |     const exportButton = page.locator('button:has-text("导出Excel")');
  63 |     await expect(exportButton).toBeVisible();
  64 |     // Note: Export functionality would need to be tested separately
  65 |   });
  66 | });
```