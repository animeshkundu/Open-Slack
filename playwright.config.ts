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
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: deployedBaseURL ?? localBaseURL,
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
  ],
  webServer: deployedBaseURL
    ? undefined
    : {
        command: previewBuild
          ? isCI
            ? `npm run preview -- --host 0.0.0.0 --port 4173 --base /${repositoryName}/`
            : 'npm run preview -- --host 0.0.0.0 --port 4173'
          : 'npm run dev',
        url: localBaseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
