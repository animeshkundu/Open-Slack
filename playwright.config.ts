import { defineConfig, devices } from '@playwright/test';

const configuredBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const deployedBaseURL = configuredBaseURL
  ? configuredBaseURL.endsWith('/')
    ? configuredBaseURL
    : `${configuredBaseURL}/`
  : undefined;
const previewBuild = process.env.PLAYWRIGHT_PREVIEW === 'true';
const isCI = process.env.CI === 'true';
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'Open-Slack';
const localBaseURL = previewBuild
  ? isCI
    ? `http://localhost:4173/${repositoryName}/`
    : 'http://localhost:4173/'
  : 'http://localhost:3000/';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 3,
  reporter: 'html',
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: deployedBaseURL ?? localBaseURL,
    actionTimeout: 10000,
    navigationTimeout: 15000,
    trace: 'on-first-retry',
    permissions: ['camera', 'microphone'],
    launchOptions: {
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Cross-browser huddle validation (Chromium <-> Firefox)
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /huddle\.spec\.ts|p2p-multibrowser\.spec\.ts/,
    },
  ],
  webServer: deployedBaseURL
    ? [
        {
          command: 'node tests/e2e/localNostrRelay.mjs',
          url: 'http://127.0.0.1:7777',
          reuseExistingServer: !process.env.CI,
          timeout: 60000,
        },
      ]
    : [
        {
          command: 'node tests/e2e/localNostrRelay.mjs',
          url: 'http://127.0.0.1:7777',
          reuseExistingServer: !process.env.CI,
          timeout: 60000,
        },
        {
          command: previewBuild
            ? isCI
              ? `npm run preview -- --host 0.0.0.0 --port 4173 --base /${repositoryName}/`
              : 'npm run preview -- --host 0.0.0.0 --port 4173'
            : 'npm run dev',
          url: localBaseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      ],
});
