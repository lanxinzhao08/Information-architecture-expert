import { NextRequest, NextResponse } from "next/server";
import { crawlSiteWithStats } from "../../../../crawler/crawler";
import { classifyPages } from "../../../../ia/classify";
import { reviseIa } from "../../../../ia/ia";
import type { IaNode } from "../../../../ia/ia";
import { auditIa } from "../../../../ia/audit";
import { loadRules } from "../../../../ia/rules";
import { PAGE_TYPES, PageLabel, IaScope } from "../../../../ia/types";
import { PageData } from "../../../../types/page";

export const maxDuration = 7200;

/**
 * One endpoint per pipeline stage so Claude Code skills (and anyone else) can
 * run crawl, classify, reorganize and audit separately and inspect the JSON
 * between them. The UI uses /api/crawl, which runs all four in order.
 */

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function parseScope(value: unknown): IaScope | null {
  return value === "product" || value === "feature" ? value : null;
}

function parsePages(value: unknown): PageData[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const pages: PageData[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const p = raw as Record<string, unknown>;
    if (typeof p.url !== "string" || !/^https?:\/\//i.test(p.url)) return null;
    pages.push({
      url: p.url,
      title: typeof p.title === "string" ? p.title : "",
      description: typeof p.description === "string" ? p.description : undefined,
      headings: Array.isArray(p.headings) ? p.headings.filter((h): h is string => typeof h === "string") : [],
      links: [],
      content: typeof p.content === "string" ? p.content : "",
    });
  }
  return pages;
}

function parseLabels(value: unknown, count: number): PageLabel[] | null {
  if (!Array.isArray(value) || value.length !== count) return null;
  const types = new Set<string>(PAGE_TYPES);
  return value.map((raw) => {
    const l = (raw ?? {}) as Record<string, unknown>;
    return {
      type: types.has(String(l.type)) ? (l.type as PageLabel["type"]) : "other",
      feature: typeof l.feature === "string" ? l.feature : undefined,
      task: typeof l.task === "string" ? l.task : undefined,
    };
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stage: string }> }
) {
  const { stage } = await params;
  try {
    const body = await request.json();

    if (stage === "crawl") {
      const url = body.url;
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
      } catch {
        return bad("A valid http(s) url is required");
      }
      const { pages, stats } = await crawlSiteWithStats(url, { maxPages: 400 });
      if (pages.length === 0) return bad("No pages found", 422);
      return NextResponse.json({ startUrl: url, pageCount: pages.length, crawl: stats, pages });
    }

    const scope = parseScope(body.scope);
    if (!scope) return bad('scope must be "product" or "feature"');
    const pages = parsePages(body.pages);
    if (!pages) return bad("pages must be a non-empty array from the crawl stage");

    if (stage === "classify") {
      return NextResponse.json({ labels: await classifyPages(pages, scope) });
    }

    if (stage === "reorganize") {
      const labels = body.labels === undefined ? undefined : parseLabels(body.labels, pages.length);
      if (body.labels !== undefined && !labels) return bad("labels must match pages one to one");
      const rules = await loadRules(scope);
      const ia = await reviseIa(pages, rules.text, scope, labels ?? undefined);
      return NextResponse.json({ appliedRule: rules.applied, ia });
    }

    if (stage === "audit") {
      const labels = parseLabels(body.labels, pages.length);
      if (!labels) return bad("labels must match pages one to one");
      const tree = body.tree as IaNode | undefined;
      if (!tree || typeof tree.title !== "string" || !Array.isArray(tree.children)) {
        return bad("tree must be the recommended tree from the reorganize stage");
      }
      return NextResponse.json({ findings: auditIa(pages, labels, tree, scope) });
    }

    return bad(`Unknown stage "${stage}"`, 404);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error && error.message ? error.message : "Stage failed";
    return NextResponse.json({ error: message.slice(0, 300) }, { status: 500 });
  }
}
