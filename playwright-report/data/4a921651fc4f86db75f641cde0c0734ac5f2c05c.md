# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-flow.spec.ts >> Authentication >> should login as carrier
- Location: e2e\full-flow.spec.ts:61:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // Test credentials
  4   | const SHIPPER = {
  5   |   email: 'shipper@freshchain.vn',
  6   |   password: '123456',
  7   | };
  8   | 
  9   | const CARRIER = {
  10  |   email: 'carrier@freshchain.vn',
  11  |   password: '123456',
  12  | };
  13  | 
  14  | const ADMIN = {
  15  |   email: 'admin@freshchain.vn',
  16  |   password: '123456',
  17  | };
  18  | 
  19  | // Base URL
  20  | const BASE_URL = 'http://localhost:3000';
  21  | 
  22  | /**
  23  |  * Helper function to login
  24  |  */
  25  | async function login(page, credentials) {
> 26  |   await page.goto(`${BASE_URL}/login`);
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  27  |   
  28  |   // Use name attributes instead of type selectors (form uses react-hook-form)
  29  |   await page.fill('input[name="email"]', credentials.email);
  30  |   await page.fill('input[name="password"]', credentials.password);
  31  |   
  32  |   // Click submit button
  33  |   await page.click('button[type="submit"]');
  34  |   
  35  |   // Wait for navigation away from login page
  36  |   try {
  37  |     await page.waitForNavigation({ timeout: 15000 });
  38  |   } catch (e) {
  39  |     // Navigation might not trigger a navigation event, that's ok
  40  |     console.log('Navigation wait timed out, checking if we moved');
  41  |   }
  42  |   
  43  |   // Wait for page to be fully loaded
  44  |   await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
  45  |     // If networkidle times out, that's ok - page might not be fully loaded
  46  |   });
  47  | }
  48  | 
  49  | /**
  50  |  * TEST 1: Login Verification
  51  |  */
  52  | test.describe('Authentication', () => {
  53  |   test('should login as shipper', async ({ page }) => {
  54  |     await login(page, SHIPPER);
  55  |     
  56  |     // Verify we're on dashboard or home
  57  |     const url = page.url();
  58  |     expect(url).toContain('localhost:3000');
  59  |   });
  60  | 
  61  |   test('should login as carrier', async ({ page }) => {
  62  |     await login(page, CARRIER);
  63  |     
  64  |     const url = page.url();
  65  |     expect(url).toContain('localhost:3000');
  66  |   });
  67  | });
  68  | 
  69  | /**
  70  |  * TEST 2: AI Assistant - Tạo Đơn Hàng
  71  |  */
  72  | test.describe('AI Assistant - Create Order Flow', () => {
  73  |   test('should navigate to AI assistant page', async ({ page }) => {
  74  |     await login(page, SHIPPER);
  75  | 
  76  |     // Try to navigate to AI assistant
  77  |     await page.goto(`${BASE_URL}/create-order-ai`);
  78  |     
  79  |     // Check if page loaded (could be redirect if feature not available yet)
  80  |     const pageTitle = await page.title();
  81  |     console.log('Page title:', pageTitle);
  82  |     
  83  |     // Verify we're still in the app
  84  |     expect(page.url()).toContain('localhost:3000');
  85  |   });
  86  | 
  87  |   test('should display dashboard', async ({ page }) => {
  88  |     await login(page, SHIPPER);
  89  |     
  90  |     // Check dashboard loads
  91  |     const heading = await page.locator('h1, h2, [role="heading"]').first();
  92  |     if (await heading.isVisible()) {
  93  |       const text = await heading.textContent();
  94  |       console.log('Dashboard heading:', text);
  95  |     }
  96  |   });
  97  | });
  98  | 
  99  | /**
  100 |  * TEST 3: Navigation & Basic UI
  101 |  */
  102 | test.describe('Navigation & UI', () => {
  103 |   test('should have sidebar navigation', async ({ page }) => {
  104 |     await login(page, SHIPPER);
  105 |     
  106 |     // Look for navigation elements
  107 |     const sidebar = await page.locator('[data-testid="sidebar"], nav, aside').first();
  108 |     if (await sidebar.isVisible()) {
  109 |       console.log('Sidebar visible');
  110 |       expect(sidebar).toBeVisible();
  111 |     }
  112 |   });
  113 | 
  114 |   test('should navigate to shipments page', async ({ page }) => {
  115 |     await login(page, SHIPPER);
  116 |     
  117 |     // Try to find and click shipments link
  118 |     await page.goto(`${BASE_URL}/shipments`);
  119 |     expect(page.url()).toContain('shipments');
  120 |   });
  121 | 
  122 |   test('should navigate to matching page', async ({ page }) => {
  123 |     await login(page, CARRIER);
  124 |     
  125 |     await page.goto(`${BASE_URL}/matching`);
  126 |     expect(page.url()).toContain('matching');
```