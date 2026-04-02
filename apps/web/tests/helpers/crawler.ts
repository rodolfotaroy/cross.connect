/**
 * tests/helpers/crawler.ts
 *
 * BFS page crawler utility.
 *
 * Starting from a list of seed URLs, the crawler:
 *  1. Navigates to each URL using the authenticated Playwright page.
 *  2. Records HTTP status codes, console errors, uncaught exceptions, and
 *     failed network requests (4xx / 5xx).
 *  3. Extracts all <a href="..."> links and enqueues in-scope, non-excluded
 *     ones for the next BFS level.
 *  4. Stops when the queue is empty, maxPages is reached, or maxDepth is
 *     exceeded.
 *
 * The caller is responsible for:
 *  - Providing an authenticated Playwright `Page`.
 *  - Passing `excludePatterns` that match any routes that must not be visited.
 *  - Asserting on the returned `CrawlResult[]` array.
 */
import type { Page, Response } from '@playwright/test';
import { shouldExclude } from './safe-crawl-rules';

export interface NetworkError {
  url: string;
  status: number;
}

export interface CrawlResult {
  /** Pathname that was visited (e.g. "/orders/abc-123") */
  pathname: string;
  /** Full URL that was navigated to */
  url: string;
  /** HTTP status returned by the page navigation, null if navigation failed */
  httpStatus: number | null;
  /** console.error() / console.warn() calls observed while on the page */
  consoleErrors: string[];
  /** Sub-resource fetch/XHR calls that returned 4xx or 5xx */
  networkErrors: NetworkError[];
  /** Uncaught JS exception message, if any */
  jsException: string | null;
}

export interface CrawlOptions {
  /**
   * Maximum BFS depth from seed URLs (0 = seed only, 1 = seed + one hop, …).
   * Default: 2
   */
  maxDepth?: number;
  /**
   * Hard cap on total pages visited regardless of depth.
   * Default: 80
   */
  maxPages?: number;
  /**
   * Additional patterns to exclude on top of the global safe-crawl rules.
   */
  extraExcludePatterns?: RegExp[];
  /**
   * Whether to print each visited URL to stdout.
   * Default: false
   */
  verbose?: boolean;
}

/**
 * Perform a BFS crawl starting from `seedPathnames`, using an authenticated
 * Playwright page.  Returns a `CrawlResult` for every page visited.
 *
 * @param page        Authenticated Playwright page
 * @param baseURL     The base URL of the app (e.g. "http://localhost:3210")
 * @param seedPathnames  Starting paths, e.g. ["/dashboard", "/orders"]
 */
export async function crawl(
  page: Page,
  baseURL: string,
  seedPathnames: string[],
  options: CrawlOptions = {},
): Promise<CrawlResult[]> {
  const { maxDepth = 2, maxPages = 80, extraExcludePatterns = [], verbose = false } = options;

  const results: CrawlResult[] = [];
  const visited = new Set<string>();

  // Queue entries: [pathname, depth]
  const queue: [string, number][] = seedPathnames.map((p) => [p, 0]);

  while (queue.length > 0 && results.length < maxPages) {
    const [pathname, depth] = queue.shift()!;

    // Normalise to strip query strings and fragments for dedup.
    const normPath = pathname.split('?')[0].split('#')[0];

    if (visited.has(normPath)) continue;

    // Apply global + extra exclusion rules.
    if (shouldExclude(normPath)) continue;
    if (extraExcludePatterns.some((re) => re.test(normPath))) continue;

    visited.add(normPath);

    const fullUrl = `${baseURL}${normPath}`;
    if (verbose) console.log(`[crawler] visiting ${fullUrl} (depth ${depth})`);

    // ── Instrument the page for this navigation ──────────────────────────────
    const consoleErrors: string[] = [];
    const networkErrors: NetworkError[] = [];
    let jsException: string | null = null;

    const consoleHandler = (msg: { type(): string; text(): string }) => {
      // Only capture genuine errors, not warnings.
      // Next.js dev mode produces many console.warn calls (webpack, hydration,
      // image optimisation, etc.) that are not actionable in smoke tests.
      if (msg.type() === 'error') {
        consoleErrors.push(`[error] ${msg.text()}`);
      }
    };

    const responseHandler = (res: Response) => {
      const status = res.status();
      // Ignore expected redirects and static assets.
      if (status >= 400 && !res.url().includes('/_next/') && !res.url().includes('/favicon')) {
        networkErrors.push({ url: res.url(), status });
      }
    };

    const exceptionHandler = (err: Error) => {
      jsException = err.message;
    };

    page.on('console', consoleHandler);
    page.on('response', responseHandler);
    page.on('pageerror', exceptionHandler);

    let httpStatus: number | null = null;

    try {
      const response = await page.goto(fullUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      });

      // Follow any middleware redirects — record the final URL status.
      httpStatus = response?.status() ?? null;

      // If the page redirected us away (e.g. RBAC → /portal), do not
      // extract links from the redirect destination to avoid polluting the
      // crawl of the current role.
      const finalPathname = new URL(page.url()).pathname;
      const redirectedAway = finalPathname !== normPath;

      if (!redirectedAway && depth < maxDepth) {
        // Extract all same-origin anchor hrefs.
        const hrefs: string[] = await page.$$eval('a[href]', (anchors) =>
          anchors.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? '').filter(Boolean),
        );

        for (const href of hrefs) {
          try {
            // Resolve relative or absolute href against the base URL.
            const resolved = new URL(href, fullUrl);
            // Only follow same-origin, pathname-only links.
            if (resolved.origin === new URL(baseURL).origin) {
              const link = resolved.pathname + resolved.search;
              if (!visited.has(resolved.pathname)) {
                queue.push([link, depth + 1]);
              }
            }
          } catch {
            // Invalid href — skip.
          }
        }
      }
    } catch (err) {
      // Navigation timeout or net::ERR_* — record as status null.
      consoleErrors.push(`[navigation-error] ${(err as Error).message}`);
    } finally {
      page.off('console', consoleHandler);
      page.off('response', responseHandler);
      page.off('pageerror', exceptionHandler);
    }

    results.push({
      pathname: normPath,
      url: fullUrl,
      httpStatus,
      consoleErrors,
      networkErrors,
      jsException,
    });
  }

  return results;
}

/**
 * Assert that every result in `crawlResults` has no critical failures.
 * Throws a descriptive error listing all failures if any are found.
 */
export function assertNoCrawlFailures(crawlResults: CrawlResult[]): void {
  const failures: string[] = [];

  for (const r of crawlResults) {
    const issues: string[] = [];

    if (r.httpStatus !== null && r.httpStatus >= 400) {
      issues.push(`HTTP ${r.httpStatus}`);
    }
    if (r.jsException) {
      issues.push(`JS exception: ${r.jsException}`);
    }
    // Filter out known noisy but non-critical console messages.
    const criticalConsole = r.consoleErrors.filter(
      (e) =>
        !e.includes('ResizeObserver loop') &&
        !e.includes('Could not establish connection') &&
        // Next.js / React dev-mode noise
        !e.includes('Download the React DevTools') &&
        !e.includes('React does not recognize') &&
        !e.includes('Warning:') &&
        !e.includes('hydration') &&
        !e.includes('Hydration') &&
        // next-auth / Auth.js session polling errors in dev (non-critical)
        // CLIENT_FETCH_ERROR: next-auth v4 token refresh failure
        // next-auth: next-auth v4 console noise
        // authjs.dev: Auth.js v5 background getSession() aborted when the
        //   BFS crawler navigates away before the in-flight poll completes.
        !e.includes('CLIENT_FETCH_ERROR') &&
        !e.includes('next-auth') &&
        !e.includes('authjs.dev') &&
        // Playwright teardown artifacts — these are not app errors:
        // ERR_ABORTED occurs when the browser context is being closed while a
        // navigation is in-flight (e.g. after test timeout).
        // "Target page, context or browser has been closed" is emitted for every
        // queued navigation after Playwright tears down the context.
        !e.includes('ERR_ABORTED') &&
        !e.includes('frame was detached') &&
        !e.includes('Target page, context or browser has been closed'),
    );
    if (criticalConsole.length > 0) {
      issues.push(`console errors: ${criticalConsole.join(' | ')}`);
    }
    const criticalNetwork = r.networkErrors.filter(
      (n) => n.status >= 500 || (n.status === 401 && !n.url.includes('/auth/')),
    );
    if (criticalNetwork.length > 0) {
      issues.push(
        `network errors: ${criticalNetwork.map((n) => `${n.status} ${n.url}`).join(' | ')}`,
      );
    }

    if (issues.length > 0) {
      failures.push(`${r.pathname}: ${issues.join('; ')}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Crawl failures detected on ${failures.length} page(s):\n` +
        failures.map((f) => `  • ${f}`).join('\n'),
    );
  }
}
