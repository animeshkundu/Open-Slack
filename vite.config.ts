import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

function pagesBase(): string {
  if (process.env.GITHUB_PAGES !== 'true') {
    return '/';
  }

  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'Open-Slack';
  return `/${repoName}/`;
}

export default defineConfig(() => {
  return {
    base: pagesBase(),
    plugins: [react(), tailwindcss()],
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
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      sourcemap: false,
      minify: 'esbuild',
      reportCompressedSize: true,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return;
            }
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('\\react\\')) {
              return 'react-vendor';
            }
            if (id.includes('yjs') || id.includes('y-indexeddb') || id.includes('trystero')) {
              return 'p2p-vendor';
            }
            if (id.includes('lucide-react') || id.includes('motion') || id.includes('canvas-confetti')) {
              return 'ui-vendor';
            }
            if (id.includes('react-markdown') || id.includes('remark-gfm')) {
              return 'markdown-vendor';
            }
          },
        },
      },
    },
    esbuild: {
      // Drop noisy debug statements from production/Pages bundles.
      pure: ['console.log', 'console.debug', 'console.info'],
      legalComments: 'none',
    },
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['src/test/**/*.test.ts'],
      setupFiles: './src/test/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
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
