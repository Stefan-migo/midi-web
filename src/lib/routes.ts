import type { Scene, Site } from '../content/types';

export interface RouteSpec {
  readonly id: string;
  readonly order: number;
  /** Root-relative path. The root is `/`; every other route ends with a slash. */
  readonly path: string;
  readonly scene: Scene;
}

export function buildRoutes(site: Site): RouteSpec[] {
  return [...site.scenes]
    .sort((a, b) => a.order - b.order)
    .map((scene) => ({
      id: scene.id,
      order: scene.order,
      path: scene.order === 0 ? '/' : `/${scene.id}/`,
      scene,
    }));
}

/** Strips a deploy base and normalises a pathname to a comparable route path. */
export function normalizePath(pathname: string, base = '/'): string {
  let path = pathname;
  if (base !== '/' && path.startsWith(base)) {
    path = `/${path.slice(base.length)}`;
  }
  if (path === '' || path === '/') return '/';
  return path.endsWith('/') ? path : `${path}/`;
}

/**
 * Route index for a pathname, defaulting to the first route. Unknown paths fall
 * back to home rather than throwing, so a mistyped URL still renders the site.
 */
export function routeIndex(pathname: string, routes: RouteSpec[], base = '/'): number {
  const path = normalizePath(pathname, base);
  const index = routes.findIndex((route) => route.path === path);
  return index === -1 ? 0 : index;
}

/** Joins the deploy base with a route path. `base` always ends with a slash. */
export function withBase(path: string, base: string): string {
  if (base === '/' || base === '') return path;
  return `${base.replace(/\/$/, '')}${path}`;
}

