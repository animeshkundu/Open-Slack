import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  const isGhPages = process.env.GITHUB_PAGES === 'true';
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'Open-Slack';
  const pagesBasePath = `/${repositoryName}/`;
  const appVersion = process.env.npm_package_version ?? '1.0.0';
  const buildId =
    process.env.GITHUB_SHA?.slice(0, 12) ||
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
    process.env.BUILD_ID ||
    `${Date.now().toString(36)}`;

  return {
    base: isGhPages ? pagesBasePath : './',
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __BUILD_ID__: JSON.stringify(buildId),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // Manual registration via virtual:pwa-register so browser + installed PWA
        // both skipWaiting, claim clients, and reload onto the new release.
        injectRegister: false,
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Open-Slack Workspace',
          short_name: 'OpenSlack',
          description: 'Open-source, privacy-first Slack clone with P2P encrypted mesh',
          theme_color: '#4A154B',
          background_color: '#1A1D21',
          display: 'standalone',
          start_url: isGhPages ? pagesBasePath : './',
          // Bust installed-app shell metadata whenever the release identity changes.
          id: isGhPages ? `${pagesBasePath}?v=${appVersion}-${buildId}` : `./?v=${appVersion}-${buildId}`,
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          // Content-hashed assets + HTML are revisioned in the precache manifest per build.
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // Always prefer the network for navigations so releases are not sticky.
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: `openslack-html-${buildId}`,
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 8,
                  maxAgeSeconds: 60 * 60 * 24,
                },
              },
            },
            {
              urlPattern: ({ request }) =>
                request.destination === 'script' ||
                request.destination === 'style' ||
                request.destination === 'worker',
              handler: 'CacheFirst',
              options: {
                cacheName: `openslack-assets-${buildId}`,
                expiration: {
                  maxEntries: 64,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
      }),
    ],
    build: {
      minify: 'esbuild' as const,
      cssMinify: 'esbuild' as const,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['src/test/**/*.test.ts'],
      setupFiles: './src/test/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        thresholds: {
          statements: 80,
          branches: 65,
          functions: 75,
          lines: 80,
        },
        exclude: [
          'node_modules/**',
          'dist/**',
          '**/*.d.ts',
          'tests/**',
          'src/test/**',
          'vite.config.ts',
          'playwright.config.ts',
        ],
      },
    },
  };
});
