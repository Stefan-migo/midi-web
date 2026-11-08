import { withBase, type RouteSpec } from './routes';

/**
 * Build-time SEO inputs. `siteUrl` stays optional on purpose: a canonical or a
 * sitemap pointing at a guessed domain is worse than emitting neither.
 */
export interface SiteOptions {
  /** Deploy base, e.g. `/` or `/midi-web/`. Always ends with a slash. */
  base: string;
  /** Absolute origin, e.g. `https://midi.ar`. No trailing slash required. */
  siteUrl?: string;
}

function cleanOrigin(siteUrl: string): string {
  return siteUrl.replace(/\/+$/, '');
}

/** Absolute URL for a route path, or `undefined` when the origin is unknown. */
export function absoluteUrl(path: string, options: SiteOptions): string | undefined {
  if (!options.siteUrl) return undefined;
  return `${cleanOrigin(options.siteUrl)}${withBase(path, options.base)}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Sitemap for every route. Returns `undefined` without a known origin, because
 * `<loc>` must be absolute.
 */
export function sitemapXml(routes: RouteSpec[], options: SiteOptions): string | undefined {
  if (!options.siteUrl) return undefined;
  const urls = routes
    .map((route) => absoluteUrl(route.path, options))
    .filter((url): url is string => Boolean(url))
    .map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`)
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n');
}

export function robotsTxt(options: SiteOptions): string {
  const lines = ['User-agent: *', 'Allow: /'];
  if (options.siteUrl) {
    lines.push('', `Sitemap: ${cleanOrigin(options.siteUrl)}${withBase('/sitemap.xml', options.base)}`);
  }
  return `${lines.join('\n')}\n`;
}
