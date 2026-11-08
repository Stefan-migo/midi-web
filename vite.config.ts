import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { site } from './src/content/site';
import { buildRoutes } from './src/lib/routes';
import { renderRouteHtml } from './src/lib/route-html';

/**
 * Emits one complete HTML document per route from the shared shell, so every
 * section is a crawlable URL with its own title, description and heading
 * instead of a hash fragment on a single document.
 */
function prerenderRoutes(base: string): Plugin {
  const routes = buildRoutes(site);
  return {
    name: 'midi-prerender-routes',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const entry = bundle['index.html'];
      if (!entry || entry.type !== 'asset') {
        throw new Error('prerender: index.html is missing from the bundle');
      }
      const shell = String(entry.source);
      for (const route of routes) {
        const html = renderRouteHtml(shell, route, routes, site, { base });
        if (route.path === '/') {
          entry.source = html;
          continue;
        }
        this.emitFile({
          type: 'asset',
          fileName: `${route.path.replace(/^\/|\/$/g, '')}/index.html`,
          source: html,
        });
      }
    },
  };
}

/**
 * The dev server only knows the shell file; this maps a route path onto it so
 * `/portafolio/` renders in development exactly as the built document does.
 */
function devRoutes(): Plugin {
  const known = new Set(buildRoutes(site).map((route) => route.path));
  return {
    name: 'midi-dev-routes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        // The project deliberately keeps Node globals out of the browser-facing
        // tsconfig, so `url` is narrowed here instead of pulling in @types/node.
        const req = request as unknown as { url?: string };
        const [pathname = ''] = (req.url ?? '').split('?');
        const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
        if (known.has(pathname) || known.has(path)) {
          req.url = '/index.html';
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // `loadEnv` with a relative dir avoids depending on Node globals in the
  // browser-facing tsconfig while keeping the base path deployable anywhere.
  const env = loadEnv(mode, '.', '');
  const base = env['VITE_BASE'] ?? '/';
  return {
    base,
    plugins: [prerenderRoutes(base), devRoutes()],
    build: {
      rollupOptions: {
        input: ['index.html'],
      },
    },
  };
});
