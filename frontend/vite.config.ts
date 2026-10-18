import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { imageWebpPlugin } from './build/imageWebpPlugin'
import { sitemapPlugin } from './build/sitemapPlugin'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const publicDir = path.resolve(__dirname, 'private')

  return {
    publicDir: 'private',
    plugins: [
      react(),
      tailwindcss(),
      // Build/dev-only asset generators — skipped under Vitest (mode === 'test')
      // so test runs don't invoke sharp or write artifacts into publicDir.
      ...(mode === 'test'
        ? []
        : [
            // Emit compressed .webp siblings for the brand rasters in publicDir
            // so <Image> can serve WebP with a PNG fallback. Copied into dist.
            imageWebpPlugin({ dir: publicDir }),
            // Generate sitemap.xml + robots.txt from the public-routes manifest
            // on every build and dev start; written into publicDir, copied to dist.
            sitemapPlugin({ publicDir, siteUrl: env.VITE_SITE_URL }),
          ]),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '127.0.0.1',
      // When VITE_API_URL is unset the app calls its own origin; forward API traffic
      // to Django so the session cookie and CSRF token stay first-party.
      proxy: {
        '/api': env.VITE_DEV_API_PROXY || 'http://127.0.0.1:8000',
        '/healthz': env.VITE_DEV_API_PROXY || 'http://127.0.0.1:8000',
      },
    },
    preview: {
      host: '127.0.0.1',
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],

    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return

            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'react-vendor'
            }

            if (id.includes('/recharts/') || id.includes('/d3-')) {
              return 'charts-vendor'
            }

            if (
              id.includes('/@radix-ui/') ||
              id.includes('/lucide-react/') ||
              id.includes('/motion/')
            ) {
              return 'ui-vendor'
            }
          },
        },
      },
    },

    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
