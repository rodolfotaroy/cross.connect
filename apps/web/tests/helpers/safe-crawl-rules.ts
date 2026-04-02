/**
 * tests/helpers/safe-crawl-rules.ts
 *
 * URL patterns that the BFS crawler must never follow.
 *
 * Rules of thumb applied here:
 *  - Skip auth/session mutation endpoints (logout, signout).
 *  - Skip external links (handled separately by origin check).
 *  - Skip API routes — they return JSON, not HTML.
 *  - Skip resource download endpoints (e.g. document downloads).
 *  - Skip "new resource" form pages — they are safe to visit, but following
 *    links that submit forms (action="...") would risk creating test data.
 *    We do crawl /new pages but never submit their forms.
 *  - Skip deactivation / delete confirmation pages where a page load itself
 *    can trigger a side-effect (rare, but worth guarding).
 */
export const EXCLUDE_PATTERNS: RegExp[] = [
  // Auth signout
  /\/api\/auth\/signout/,
  /\/logout/,

  // Next.js API routes (return JSON / binary, not pages)
  /^\/api\//,

  // Document download endpoints
  /\/documents\/.*\/download/,

  // Avoid re-visiting the root redirect page in a loop
  /^\/?$/,
];

/**
 * Returns true if the given pathname should be skipped by the crawler.
 */
export function shouldExclude(pathname: string): boolean {
  return EXCLUDE_PATTERNS.some((re) => re.test(pathname));
}
