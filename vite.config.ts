import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // `loadEnv` with a relative dir avoids depending on Node globals in the
  // browser-facing tsconfig while keeping the base path deployable anywhere.
  const env = loadEnv(mode, '.', '');
  return {
    base: env['VITE_BASE'] ?? '/',
    build: {
      rollupOptions: {
        input: ['index.html'],
      },
    },
  };
});
