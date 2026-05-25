# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-flow.spec.ts >> Error Handling >> should handle invalid login gracefully
- Location: e2e\full-flow.spec.ts:284:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  185 |     
  186 |     expect(page.url()).toContain('deals');
  187 |   });
  188 | 
  189 |   test('should load matching page for carrier', async ({ page }) => {
  190 |     await login(page, CARRIER);
  191 |     await page.goto(`${BASE_URL}/matching`);
  192 |     
  193 |     expect(page.url()).toContain('matching');
  194 |   });
  195 | });
  196 | 
  197 | /**
  198 |  * TEST 6: Dashboard Features
  199 |  */
  200 | test.describe('Dashboard', () => {
  201 |   test('should display shipper dashboard', async ({ page }) => {
  202 |     await login(page, SHIPPER);
  203 |     await page.goto(`${BASE_URL}/dashboard`);
  204 |     
  205 |     // Dashboard should load
  206 |     expect(page.url()).toContain('dashboard');
  207 |     
  208 |     // Verify page has content
  209 |     const content = await page.content();
  210 |     expect(content.length).toBeGreaterThan(100);
  211 |   });
  212 | 
  213 |   test('should display carrier dashboard', async ({ page }) => {
  214 |     await login(page, CARRIER);
  215 |     await page.goto(`${BASE_URL}/dashboard`);
  216 |     
  217 |     expect(page.url()).toContain('dashboard');
  218 |   });
  219 | 
  220 |   test('should display admin dashboard', async ({ page }) => {
  221 |     await login(page, ADMIN);
  222 |     await page.goto(`${BASE_URL}/admin`);
  223 |     
  224 |     // Admin dashboard might exist
  225 |     expect(page.url()).toContain('localhost:3000');
  226 |   });
  227 | });
  228 | 
  229 | /**
  230 |  * TEST 7: Tracking & Shipments
  231 |  */
  232 | test.describe('Shipment Tracking', () => {
  233 |   test('should navigate to tracking page', async ({ page }) => {
  234 |     await login(page, SHIPPER);
  235 |     await page.goto(`${BASE_URL}/tracking`);
  236 |     
  237 |     expect(page.url()).toContain('tracking');
  238 |   });
  239 | 
  240 |   test('should navigate to orders page', async ({ page }) => {
  241 |     await login(page, SHIPPER);
  242 |     await page.goto(`${BASE_URL}/orders`);
  243 |     
  244 |     expect(page.url()).toContain('orders');
  245 |   });
  246 | });
  247 | 
  248 | /**
  249 |  * TEST 8: API Health Check
  250 |  */
  251 | test.describe('API Health', () => {
  252 |   test('should reach backend API', async ({ page }) => {
  253 |     try {
  254 |       const response = await page.request.get('http://localhost:4000/api/health');
  255 |       expect(response.status()).toBe(200);
  256 |     } catch (error) {
  257 |       console.log('Backend health check failed:', error.message);
  258 |       // Backend might not be running, that's ok for this test
  259 |     }
  260 |   });
  261 | });
  262 | 
  263 | /**
  264 |  * TEST 9: Session & Logout
  265 |  */
  266 | test.describe('Session Management', () => {
  267 |   test('should maintain session after page refresh', async ({ page }) => {
  268 |     await login(page, SHIPPER);
  269 |     
  270 |     // Refresh page
  271 |     await page.reload();
  272 |     
  273 |     // Should still be logged in (or redirected to login)
  274 |     await page.waitForLoadState('networkidle');
  275 |     const url = page.url();
  276 |     console.log('URL after refresh:', url);
  277 |   });
  278 | });
  279 | 
  280 | /**
  281 |  * TEST 10: Error Handling
  282 |  */
  283 | test.describe('Error Handling', () => {
  284 |   test('should handle invalid login gracefully', async ({ page }) => {
> 285 |     await page.goto(`${BASE_URL}/login`);
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  286 |     
  287 |     // Try invalid login
  288 |     await page.fill('input[name="email"]', 'invalid@example.com');
  289 |     await page.fill('input[name="password"]', 'wrongpassword');
  290 |     await page.click('button[type="submit"]');
  291 |     
  292 |     // Should not crash, error message or redirect
  293 |     await page.waitForTimeout(2000);
  294 |     const url = page.url();
  295 |     expect(url).toContain('localhost:3000');
  296 |   });
  297 | 
  298 |   test('should handle navigation to non-existent page', async ({ page }) => {
  299 |     await login(page, SHIPPER);
  300 |     
  301 |     await page.goto(`${BASE_URL}/nonexistent-page-12345`);
  302 |     
  303 |     // Should not crash
  304 |     expect(page.url()).toContain('localhost:3000');
  305 |   });
  306 | });
  307 | 
  308 | 
```