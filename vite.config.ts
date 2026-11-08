import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { site } from './src/content/site';
import { buildRoutes } from './src/lib/routes';
import { renderRouteHtml } from './src/lib/route-html';
import { llmsTxt, robotsTxt, sitemapXml } from './src/lib/seo';

/**
 * Canonical origin of the published site. Every generated absolute URL
 * (canonical, `og:url`, sitemap) derives from it, so there is exactly one place
 * to change when the domain changes.
 */
const DEFAULT_SITE_URL = 'https://midi4all.art';

/**
 * Emits one complete HTML document per route from the shared shell, so every
 * section is a crawlable URL with its own title, description and heading
 * instead of a hash fragment on a single document.
 */
function prerenderRoutes(base: string, siteUrl?: string): Plugin {
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
        const html = renderRouteHtml(shell, route, routes, site, { base, siteUrl });
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
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt({ base, siteUrl }) });
      const llms = llmsTxt(routes, site.name, { base, siteUrl });
      if (llms !== undefined) this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llms });
      const sitemap = sitemapXml(routes, { base, siteUrl });
      if (sitemap !== undefined) {
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
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
  // The canonical home of the site. Override it with SITE_URL when the site
  // moves, or when building a preview on a different origin.
  const siteUrl = env['SITE_URL'] || DEFAULT_SITE_URL;
  return {
    base,
    plugins: [prerenderRoutes(base, siteUrl), devRoutes()],
    build: {
      rollupOptions: {
        input: ['index.html'],
      },
    },
  };
});
