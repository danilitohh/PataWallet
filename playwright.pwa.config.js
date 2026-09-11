import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/pwa',
  outputDir: './output/playwright/pwa-results',
  reporter: 'line',
  expect: { timeout: 10000 },
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    env: { ...process.env, VITE_AUTH_DISABLED: 'true' },
  },
})
