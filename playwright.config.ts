import { PlaywrightTestConfig } from '@playwright/test'

const config: PlaywrightTestConfig = {
  testDir: './e2e/tests',
  // Allow room for waiting until the worker is online, navigation, and the
  // result-polling budget without hitting Playwright's default 30s per-test timeout.
  timeout: 60_000,
  use: {
    trace: { mode: 'retain-on-failure', screenshots: false },
    screenshot: 'off',
    video: 'off',
  },
}

export default config
