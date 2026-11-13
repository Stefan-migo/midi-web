import type { Scene, Site } from '../content/types';
import { type RouteSpec } from './routes';
import { absoluteUrl, type SiteOptions } from './seo';

/**
 * Build-time transform that turns the shared HTML shell into the document for
 * one route: its own title, description, heading, nav state and social tags.
 *
 * It is pure and throws when the shell loses a marker it depends on, so a
 * markup change surfaces as a build error instead of a silently wrong page.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceInner(html: string, id: string, value: string): string {
  const pattern = new RegExp(`(<([a-z0-9]+)\\b[^>]*\\bid="${id}"[^>]*>)[\\s\\S]*?(</\\2>)`, 'i');
  if (!pattern.test(html)) {
    throw new Error(`prerender: cannot find element #${id} in the HTML shell`);
  }
  return html.replace(pattern, (_match, open: string, _tag: string, close: string) => {
    return `${open}${value}${close}`;
  });
}

function replaceOnce(html: string, pattern: RegExp, replacement: string, label: string): string {
  if (!pattern.test(html)) {
    throw new Error(`prerender: cannot find ${label} in the HTML shell`);
  }
  return html.replace(pattern, replacement);
}

/** Truncates on a word boundary so a description never ends mid-word. */
function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  const cut = value.slice(0, limit);
  const boundary = cut.lastIndexOf(' ');
  return `${boundary > 0 ? cut.slice(0, boundary) : cut}…`;
}

/**
 * A route needs a real description for crawlers. Body copy is preferred; a
 * scene without paragraphs falls back to its own title and subtitle instead of
 * shipping an empty tag. Note that `body` can be an empty string, which `??`
 * would happily accept — hence the length check.
 */
function describe(scene: Scene, site: Site): string {
  const body = scene.body?.paragraphs.join(' ').trim() ?? '';
  if (body.length > 0) return truncate(body, 160);
  // A subtitle is optional, so an empty one must not leave a dangling sentence
  // behind, and a scene named after the collective must not repeat `site.name`
  // right before it.
  const lead = [scene.title, scene.subtitle]
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== site.name);
  return truncate([...lead, `${site.name}, colectivo artístico.`].join('. '), 160);
}

function revealMarkup(scene: Scene): string {
  const gallery = scene.gallery ?? [];
  const firstGalleryItem = gallery[0];
  const heading = firstGalleryItem?.title ?? scene.body?.heading ?? scene.title;
  const paragraphs = (scene.body?.paragraphs ?? []).map((text) => `<p>${escapeHtml(text)}</p>`).join('');
  const links = (scene.body?.links ?? []).map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)} ↗</a>`).join('');
  const art = gallery.length
    ? `<div class="gallery-items">${gallery.map((item) => `<img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}">`).join('')}</div><div class="work-switch"><button id="previous" aria-label="Pieza anterior">←</button><span id="work-index">01 / ${String(gallery.length).padStart(2, '0')}</span><button id="next" aria-label="Pieza siguiente">→</button></div>`
    : '';
  return `<h2 id="reveal-title">${escapeHtml(heading)}</h2>${paragraphs}${links}${art}`;
}

function jsonLd(route: RouteSpec, routes: RouteSpec[], site: Site, options: SiteOptions, title: string, description: string): string {
  const origin = options.siteUrl?.replace(/\/+$/, '');
  if (!origin) return '';
  const canonical = absoluteUrl(route.path, options)!;
  const contact = site.scenes.find((item) => item.body?.links?.some((link) => link.href.startsWith('mailto:')));
  const contactLinks = contact?.body?.links ?? [];
  const organization: Record<string, unknown> = { '@type': 'Organization', '@id': `${origin}/#organization`, name: site.name, url: origin };
  const email = contactLinks.find((link) => link.href.startsWith('mailto:'))?.href.slice(7);
  const sameAs = contactLinks.filter((link) => link.kind === 'social').map((link) => link.href);
  if (email) organization.email = email;
  if (sameAs.length) organization.sameAs = sameAs;
  const pageType = route.order === 0 ? 'WebPage' : route.scene.gallery ? 'CollectionPage' : contactLinks.some((link) => link.href.startsWith('mailto:') && route.scene.body?.links === contactLinks) ? 'ContactPage' : route.scene.body?.paragraphs.length ? 'AboutPage' : 'WebPage';
  const webSiteId = `${origin}/#website`;
  const graph: Record<string, unknown>[] = [
    { '@type': 'WebSite', '@id': webSiteId, name: site.name, url: origin, inLanguage: 'es' },
    organization,
    { '@type': pageType, '@id': `${canonical}#webpage`, url: canonical, name: title, description, inLanguage: 'es', isPartOf: { '@id': webSiteId } },
  ];
  if (route.order !== 0) {
    const home = routes[0]!;
    graph.push({ '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`, itemListElement: [
      { '@type': 'ListItem', position: 1, name: home.scene.navLabel, item: absoluteUrl(home.path, options) },
      { '@type': 'ListItem', position: 2, name: route.scene.navLabel, item: canonical },
    ] });
  }
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;
}

function navMarkup(routes: RouteSpec[], active: RouteSpec): string {
  const links = routes
    .map((route) => {
      const current = route.id === active.id ? ' aria-current="page"' : '';
      return `<a href="${escapeHtml(route.path)}" aria-label="${escapeHtml(
        route.scene.navLabel,
      )}" title="${escapeHtml(route.scene.navLabel)}"${current}></a>`;
    })
    .join('');
  return `<nav aria-label="Escenas" class="scene-map is-visually-hidden">${links}</nav>`;
}

/**
 * Open Graph, Twitter and canonical. Canonical and `og:url` are only emitted
 * when the origin is known, so the site never advertises a guessed domain.
 */
function socialHead(
  route: RouteSpec,
  site: Site,
  title: string,
  description: string,
  options: SiteOptions,
): string {
  const tags = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${escapeHtml(site.name)}">`,
    `<meta property="og:locale" content="es">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
  ];
  const url = absoluteUrl(route.path, options);
  if (url) {
    tags.unshift(`<link rel="canonical" href="${escapeHtml(url)}">`);
    tags.push(`<meta property="og:url" content="${escapeHtml(url)}">`);
  }
  return tags.join('');
}

export function renderRouteHtml(
  shell: string,
  route: RouteSpec,
  routes: RouteSpec[],
  site: Site,
  options: SiteOptions,
): string {
  const { scene } = route;
  // The home scene ships no tagline, so it is titled after the collective alone.
  const title = scene.order === 0
    ? scene.subtitle
      ? `${site.name} / ${scene.subtitle}`
      : scene.title
    : `${scene.title} — ${site.name}`;
  const description = describe(scene, site);

  let html = shell;
  html = replaceOnce(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`, '<title>');
  html = replaceOnce(
    html,
    /<meta name="description" content="[^"]*">/i,
    `<meta name="description" content="${escapeHtml(description)}">`,
    'the description meta tag',
  );
  html = replaceOnce(
    html,
    /<!--midi:seo-->/,
    `${socialHead(route, site, title, description, options)}${jsonLd(route, routes, site, options, title, description)}`,
    'the social head marker',
  );
  html = replaceOnce(
    html,
    /<main id="world" data-scene="[^"]*"/i,
    `<main id="world" data-scene="${scene.order}"`,
    'the #world scene attribute',
  );
  html = replaceOnce(
    html,
    /<nav aria-label="Escenas"[\s\S]*?<\/nav>/i,
    navMarkup(routes, route),
    'the scene nav',
  );
  html = replaceInner(html, 'reveal-body', revealMarkup(scene));
  html = replaceInner(html, 'scene-title', escapeHtml(scene.title));
  html = replaceInner(html, 'scene-subtitle', escapeHtml(scene.subtitle));

  if (options.base !== '/') {
    const prefix = options.base.replace(/\/$/, '');
    html = html.replace(/href="\/(?!\/)/g, `href="${prefix}/`);
  }

  return html;
}
