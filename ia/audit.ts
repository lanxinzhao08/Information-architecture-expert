import { PageData } from "../types/page";
import { IaNode } from "./ia";
import { AuditFinding, IaScope, PageLabel } from "./types";

const OVERVIEW_TYPES = new Set(["product-overview", "process-overview", "feature-overview"]);
const REFERENCE_TYPES = new Set(["concepts", "config-reference", "api-reference", "use-case"]);
const MIN_SENTENCES = 3;

function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.hash = "";
  if (parsed.pathname !== "/") parsed.pathname = parsed.pathname.replace(/\/$/, "");
  return parsed.toString();
}

export function countSentences(content: string): number {
  return content.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 15).length;
}

/**
 * Deterministic rule checks on the recommended tree. Findings are advice for
 * the author; nothing here changes the tree.
 */
export function auditIa(
  pages: PageData[],
  labels: PageLabel[],
  tree: IaNode,
  scope: IaScope
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const indexByUrl = new Map(pages.map((p, i) => [normalizeUrl(p.url), i]));

  // Walk the tree once, remembering each real page's ancestors.
  const placed = new Map<number, number>();
  const ancestors = new Map<number, IaNode[]>();
  const missingTitles: string[] = [];
  const walk = (node: IaNode, path: IaNode[]) => {
    if (node.missing) missingTitles.push(norm(node.title));
    else if (node.url) {
      const i = indexByUrl.get(normalizeUrl(node.url));
      if (i !== undefined) {
        placed.set(i, (placed.get(i) ?? 0) + 1);
        ancestors.set(i, path);
      }
    }
    node.children.forEach((c) => walk(c, [...path, node]));
  };
  walk(tree, []);

  // Rule C: every page exactly once.
  pages.forEach((p, i) => {
    const n = placed.get(i) ?? 0;
    if (n !== 1) {
      findings.push({
        rule: "C",
        severity: "error",
        page: p.title || p.url,
        url: p.url,
        message: n === 0 ? "Page is missing from the tree." : `Page appears ${n} times in the tree.`,
      });
    }
  });

  // Rule B: overview pages.
  pages.forEach((p, i) => {
    if (!OVERVIEW_TYPES.has(labels[i]?.type)) return;
    const base = { rule: "B" as const, page: p.title || p.url, url: p.url };
    if (!/\boverview$/i.test((p.title || "").trim())) {
      findings.push({ ...base, severity: "warn", message: 'Title should follow "[Product / Feature / Process] overview".' });
    }
    if (countSentences(p.content) < MIN_SENTENCES) {
      findings.push({ ...base, severity: "warn", message: `Overview is thin (fewer than ${MIN_SENTENCES} sentences). Expand it or fold it into a broader page.` });
    }
    if (p.headings.some((h) => norm(h) === "overview")) {
      findings.push({ ...base, severity: "warn", message: 'Remove the section called "Overview"; the opening paragraphs are the overview.' });
    }
  });

  // Rule C: reference topics sit under the task they support.
  pages.forEach((p, i) => {
    const label = labels[i];
    if (!label || !REFERENCE_TYPES.has(label.type) || !label.task) return;
    const task = norm(label.task);
    const under = (ancestors.get(i) ?? []).some((a) => {
      const t = norm(a.title);
      return t && (t.includes(task) || task.includes(t));
    });
    if (!under) {
      findings.push({
        rule: "C",
        severity: "info",
        page: p.title || p.url,
        url: p.url,
        message: `Reference topic relates to task "${label.task}" but is not under it.`,
      });
    }
  });

  // Rule A: required overview pages (existing or proposed).
  const hasType = (type: string) => labels.some((l) => l.type === type);
  const hasMissing = (re: RegExp) => missingTitles.some((t) => re.test(t));
  if (scope === "product") {
    if (!hasType("product-overview") && !hasMissing(/product overview|overview/)) {
      findings.push({ rule: "A", severity: "warn", page: tree.title, message: "No product overview page." });
    }
    if (!hasType("process-overview") && !hasMissing(/process overview/)) {
      findings.push({ rule: "A", severity: "warn", page: tree.title, message: "No business process overview page." });
    }
  } else {
    for (const type of ["product-overview", "process-overview", "workflow"]) {
      pages.forEach((p, i) => {
        if (labels[i]?.type === type) {
          findings.push({ rule: "A", severity: "info", page: p.title || p.url, url: p.url, message: "Product-level page found in a feature section (Rule A2 does not use it)." });
        }
      });
    }
  }
  const features = new Set(labels.map((l) => l.feature && norm(l.feature)).filter(Boolean) as string[]);
  for (const feature of features) {
    const hasOverview = pages.some(
      (p, i) => labels[i]?.type === "feature-overview" && norm(labels[i].feature ?? "") === feature
    );
    if (!hasOverview && !hasMissing(new RegExp(feature.replace(/ /g, ".*")))) {
      findings.push({ rule: "A", severity: "warn", page: feature, message: `Feature "${feature}" has no overview page.` });
    }
  }

  return findings;
}
