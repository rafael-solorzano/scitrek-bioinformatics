import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

const defaultApiProxyTarget = 'http://127.0.0.1:8000';

function rejectApiSuffix(value) {
  const normalized = (value || '').trim().replace(/\/+$/, '');
  if (/(^|\/)api$/i.test(normalized)) {
    throw new Error(
      'VITE_API_BASE_URL must not end in /api; API paths already include that prefix.'
    );
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  rejectApiSuffix(env.VITE_API_BASE_URL);

  const proxyTarget = env.VITE_API_PROXY_TARGET || defaultApiProxyTarget;
  const proxy = Object.fromEntries(
    ['/api', '/healthz', '/readyz'].map(path => [
      path,
      { target: proxyTarget, changeOrigin: true },
    ])
  );

  return {
    plugins: [
      {
        name: 'scitrek-js-as-jsx',
        enforce: 'pre',
        async transform(code, id) {
          if (!/\/src\/.*\.js$/.test(id)) return null;
          return transformWithEsbuild(code, id, {
            loader: 'jsx',
            jsx: 'automatic',
          });
        },
      },
      react(),
    ],
    server: {
      host: '127.0.0.1',
      port: 3000,
      proxy,
    },
    preview: {
      host: '127.0.0.1',
      port: 3000,
      proxy,
    },
    build: {
      outDir: 'dist',
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
      include: ['src/**/*.test.{js,jsx}'],
      css: true,
      testTimeout: 15_000,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        thresholds: {
          statements: 57,
          branches: 46,
          functions: 45,
          lines: 58,
        },
        include: ['src/**/*.{js,jsx}'],
        exclude: [
          'src/**/*.test.{js,jsx}',
          'src/main.jsx',
          'src/reportWebVitals.js',
          'src/setupTests.js',
        ],
      },
    },
  };
});
