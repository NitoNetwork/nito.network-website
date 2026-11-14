import { defineConfig } from "@playwright/test";

const port = 4177;

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: ".cache/playwright-results",
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: "line",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build:test && npm run preview -- --port ${port}`,
    url: `http://127.0.0.1:${port}/en/`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
