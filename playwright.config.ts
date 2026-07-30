import { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
  testDir: './e2e/tests',
  // Allow room for waiting until the worker is online, plus several navigation +
  // result-polling attempts (MAX_PAGE_ATTEMPTS * RESULT_TIMEOUT_MS), without hitting
  // Playwright's default 30s per-test timeout.
  timeout: 90_000,
  // Retry the whole test in CI so a transient cold-worker failure re-navigates with
  // a fresh browser context instead of failing the job.
  retries: process.env.CI ? 2 : 0,
}

export default config
