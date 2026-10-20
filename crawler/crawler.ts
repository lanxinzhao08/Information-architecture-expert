import { chromium, type Page } from "playwright";
import * as cheerio from "cheerio";
import { PageData, PageLink } from "../types/page";

interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);

  // Remove #section
  parsed.hash = "";

  // Remove trailing slash except for root
  if (parsed.pathname !== "/") {
    parsed.pathname = parsed.pathname.replace(/\/$/, "");
  }

  return parsed.toString();
}

/**
 * Get the path scope from the starting URL.
 *
 * Example:
 *
 * https://example.com/docs/payments/
 *
 * becomes:
 *
 * /docs/payments
 */
function getScopePath(startUrl: string): string {
  const parsed = new URL(startUrl);

  let path = parsed.pathname;

  if (path !== "/") {
    path = path.replace(/\/$/, "");
  }

  return path;
}

/**
 * Determine whether a URL belongs to the crawl scope.
 */
function isInScope(
  targetUrl: string,
  startUrl: string
): boolean {
  try {
    const target = new URL(targetUrl);
    const start = new URL(startUrl);

    // Must use the same hostname
    if (target.hostname !== start.hostname) {
      return false;
    }

    const scopePath = getScopePath(startUrl);

    // If the starting URL is the domain root,
    // the entire domain is in scope.
    if (scopePath === "") {
      return true;
    }

    const targetPath = target.pathname.replace(/\/$/, "");

    // Exact match
    if (targetPath === scopePath) {
      return true;
    }

    // Child page
    if (targetPath.startsWith(scopePath + "/")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Ignore files that are unlikely to be HTML pages.
 */
function isCrawlableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    const ignoredExtensions = [
      ".pdf",
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
      ".webp",
      ".zip",
      ".xml",
      ".json",
      ".css",
      ".js",
      ".mp4",
      ".mp3",
      ".woff",
      ".woff2",
      ".ttf",
    ];

    const pathname = parsed.pathname.toLowerCase();

    return !ignoredExtensions.some((extension) =>
      pathname.endsWith(extension)
    );
  } catch {
    return false;
  }
}

/** Drop the site name and anything after the first "|". */
export function pageTitle(raw: string): string {
  const name = raw.split("|")[0]?.trim() ?? "";
  return name || raw.trim();
}

/**
 * Open collapsed navigation groups so their child links enter the DOM. Only
 * button-like toggles are clicked, never links, so the page cannot navigate away.
 */
async function expandCollapsedNav(page: Page): Promise<void> {
  try {
    for (let round = 0; round < 4; round++) {
      const clicked = await page.evaluate(() => {
        const toggles = Array.from(
          document.querySelectorAll<HTMLElement>(
            'button[aria-expanded="false"], [role="button"][aria-expanded="false"]'
          )
        ).filter((el) => el.tagName !== "A").slice(0, 200);
        toggles.forEach((el) => el.click());
        return toggles.length;
      });
      if (clicked === 0) break;
      await page.waitForTimeout(150);
    }
  } catch {
    // Best effort: a page that blocks scripting still gets read as-is.
  }
}

async function readPage(page: Page, url: string): Promise<PageData> {
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 50000,
  });

  // Docs sites often render the sidebar client-side; give it a moment.
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await expandCollapsedNav(page);

  const html = await page.content();

  const $ = cheerio.load(html);

  const title = pageTitle($("title").text());

  const description =
    $('meta[name="description"]').attr("content")?.trim() || "";

  const headings = $("h1, h2, h3")
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean);

  const links: PageLink[] = [];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    const text = $(element).text().trim();

    if (!href) {
      return;
    }

    try {
      links.push({
        url: new URL(href, url).toString(),
        text,
      });
    } catch {
      // Ignore invalid URLs
    }
  });

  const content = $("body").text().replace(/\s+/g, " ").trim();

  return {
    url,
    title,
    description,
    headings,
    links,
    content,
  };
}

const SITEMAP_TIMEOUT_MS = 10_000;
const MAX_SITEMAPS = 20;

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(SITEMAP_TIMEOUT_MS) });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

/**
 * URLs the site itself lists in its sitemap(s). This finds articles that no
 * crawled page links to. Only same-host sitemaps are fetched.
 */
async function sitemapUrls(startUrl: string): Promise<string[]> {
  const origin = new URL(startUrl).origin;
  const host = new URL(startUrl).hostname;

  const pending: string[] = [`${origin}/sitemap.xml`];
  const robots = await fetchText(`${origin}/robots.txt`);
  for (const match of robots?.matchAll(/^\s*sitemap:\s*(\S+)/gim) ?? []) {
    pending.push(match[1]);
  }

  const seen = new Set<string>();
  const found: string[] = [];

  while (pending.length > 0 && seen.size < MAX_SITEMAPS) {
    const sitemap = pending.shift()!;
    if (seen.has(sitemap)) continue;
    try {
      if (new URL(sitemap).hostname !== host) continue;
    } catch {
      continue;
    }
    seen.add(sitemap);

    const xml = await fetchText(sitemap);
    if (!xml) continue;
    const isIndex = /<sitemapindex/i.test(xml);
    for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      const loc = match[1].replace(/&amp;/g, "&");
      if (isIndex) pending.push(loc);
      else found.push(loc);
    }
  }

  return found;
}

export interface CrawlStats {
  /** Pages in scope that were found (crawled or still queued). */
  discovered: number;
  /** True when the page cap stopped the crawl with pages still queued. */
  truncated: boolean;
  /** URLs that could not be loaded after a retry. */
  failed: string[];
  /** In-scope URLs found only through the sitemap. */
  fromSitemap: number;
}

export async function crawlPage(url: string): Promise<PageData> {
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    return await readPage(page, url);
  } finally {
    await browser.close();
  }
}

export async function crawlSite(
  startUrl: string,
  options: CrawlOptions = {}
): Promise<PageData[]> {
  return (await crawlSiteWithStats(startUrl, options)).pages;
}

export async function crawlSiteWithStats(
  startUrl: string,
  options: CrawlOptions = {}
): Promise<{ pages: PageData[]; stats: CrawlStats }> {
  const maxPages = options.maxPages ?? 400;
  const maxDepth = options.maxDepth;

  const normalizedStartUrl =
    normalizeUrl(startUrl);

  const scopePath =
    getScopePath(normalizedStartUrl);

  console.log(
    `Crawl scope: ${scopePath || "/"}`
  );

  const queue: {
    url: string;
    depth: number;
  }[] = [
    {
      url: normalizedStartUrl,
      depth: 0,
    },
  ];

  const visited = new Set<string>();
  const queued = new Set<string>([normalizedStartUrl]);

  const results: PageData[] = [];
  const failed: string[] = [];
  let fromSitemap = 0;

  for (const raw of await sitemapUrls(normalizedStartUrl)) {
    try {
      const url = normalizeUrl(raw);
      if (queued.has(url) || !isInScope(url, normalizedStartUrl) || !isCrawlableUrl(url)) continue;
      queued.add(url);
      queue.push({ url, depth: 1 });
      fromSitemap++;
    } catch {
      // ignore malformed sitemap entries
    }
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (type === "image" || type === "media" || type === "font") {
      return route.abort();
    }
    return route.continue();
  });

  try {
  while (queue.length > 0 && results.length < maxPages) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    const {
      url,
      depth,
    } = current;

    const normalizedUrl =
      normalizeUrl(url);

    // Already visited
    if (visited.has(normalizedUrl)) {
      continue;
    }

    // Outside our scope
    if (
      !isInScope(
        normalizedUrl,
        normalizedStartUrl
      )
    ) {
      console.log(
        `Skipping out-of-scope URL: ${normalizedUrl}`
      );

      continue;
    }

    // Ignore PDFs, images, JS, etc.
    if (!isCrawlableUrl(normalizedUrl)) {
      continue;
    }

    if (maxDepth !== undefined && depth > maxDepth) {
      continue;
    }

    visited.add(normalizedUrl);

    console.log(
      `Crawling [depth ${depth}]: ${normalizedUrl}`
    );

    try {
      let data: PageData;
      try {
        data = await readPage(page, normalizedUrl);
      } catch {
        data = await readPage(page, normalizedUrl); // one retry
      }

      results.push(data);

      console.log(
        `Found: ${data.title} (${data.links.length} links)`
      );

      // Follow every in-scope descendant unless a depth limit was requested.
      if (maxDepth === undefined || depth < maxDepth) {
        for (const link of data.links) {
          const normalizedLink =
            normalizeUrl(link.url);

          if (visited.has(normalizedLink) || queued.has(normalizedLink)) {
            continue;
          }

          if (
            !isInScope(
              normalizedLink,
              normalizedStartUrl
            )
          ) {
            continue;
          }

          if (
            !isCrawlableUrl(normalizedLink)
          ) {
            continue;
          }

          queued.add(normalizedLink);
          queue.push({
            url: normalizedLink,
            depth: depth + 1,
          });
        }
      }
    } catch (error) {
      failed.push(normalizedUrl);
      console.error(
        `Failed to crawl ${normalizedUrl}`,
        error
      );
    }
  }

  const stats: CrawlStats = {
    discovered: results.length + failed.length + queue.filter((q) => !visited.has(normalizeUrl(q.url))).length,
    truncated: queue.some((q) => !visited.has(normalizeUrl(q.url))),
    failed,
    fromSitemap,
  };

  return { pages: results, stats };
  } finally {
    await browser.close();
  }
}