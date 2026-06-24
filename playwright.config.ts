import { defineConfig, devices } from '@playwright/test'

/**
 * E2E config for bREALliant.
 *
 * Tests run against a Vite dev server started in `test` mode (`npm run dev:e2e`),
 * which loads `.env.test` so the app talks to a LOCAL Supabase Docker stack
 * (http://127.0.0.1:54321) instead of the real project. See e2e/README.md.
 */

const PORT = 5174
const BASE_URL = `http://localhost:${PORT}`
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  // Per-test timeout. Local Supabase round-trips (sign up, progress upserts)
  // are fast but give a comfortable margin.
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['html'], ['list']] : 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev:e2e',
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
