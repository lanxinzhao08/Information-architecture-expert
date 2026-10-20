import { readFile } from "node:fs/promises";
import path from "node:path";

const MAX_RULES_CHARS = 8000;

/** Used only when Rules.md is missing or empty. */
export const DEFAULT_RULES = `Rule A: Keep the tree at most 3 levels deep below the root, and give each page at most 8 children.
Rule B: Place related pages under the same parent, ordered by user journey (overview, concepts, how-to, reference). A page's parent must be the page that best introduces or summarizes it.
Rule C: Every page appears exactly once. Avoid near-duplicate sibling topics by placing overlapping pages next to each other under one parent.`;

import type { IaScope } from "./types";
export type { IaScope };

export interface LoadedRules {
  text: string;
  source: "Rules.md" | "default";
  /** Which Rule A section was kept. "all" means the file has no A1/A2 headings. */
  applied: "A1" | "A2" | "all";
}

/**
 * Keep Rule A1 or Rule A2, plus every other rule. Headings must stay
 * `### Rule A1` and `### Rule A2` for this split to find them.
 */
function isRuleHeading(line: string, rule: "A1" | "A2"): boolean {
  return new RegExp(`^###\\s+Rule ${rule}\\b`, "i").test(line);
}

export function rulesForScope(raw: string, scope: IaScope): { text: string; applied: "A1" | "A2" } | null {
  const wanted = scope === "product" ? "A1" : "A2";
  if (!new RegExp(`^###\\s+Rule ${wanted}\\b`, "im").test(raw)) return null;

  const lines = raw.split(/\r?\n/);
  const kept: string[] = [];
  let inRuleA = false;
  let skippingRule = false;
  let skippingProductOnly = false;

  for (const line of lines) {
    const marker = line.trim();
    if (marker === "<!-- product-only -->") {
      if (scope === "feature") skippingProductOnly = true;
      continue;
    }
    if (marker === "<!-- /product-only -->") {
      skippingProductOnly = false;
      continue;
    }
    if (skippingProductOnly) continue;

    if (/^##\s+/.test(line)) {
      inRuleA = /^##\s+Rule A\b/i.test(line);
      skippingRule = false;
      kept.push(line);
      continue;
    }
    if (inRuleA && /^###\s+/.test(line)) {
      skippingRule = !isRuleHeading(line, wanted);
      if (!skippingRule) kept.push(line);
      continue;
    }
    if (!skippingRule) kept.push(line);
  }

  const note =
    scope === "product"
      ? "This URL is a product link. Apply Rule A1. Do not apply Rule A2."
      : "This URL is one feature, not a product. Apply Rule A2 to this feature only. " +
        "Do not apply Rule A1. Do not add a product overview, a business process overview, " +
        "workflow-based groups, shared product reference, or a second feature. " +
        "The root page is this feature. Organize its descendants as that feature's overview, tasks, and reference.";
  const text = `${note}\n\n${kept.join("\n").replace(/\n{3,}/g, "\n\n").trim()}`;
  return { text, applied: wanted };
}

/** Load the IA rules from Rules.md at the project root. */
export async function loadRules(scope: IaScope): Promise<LoadedRules> {
  try {
    const raw = await readFile(path.join(process.cwd(), "Rules.md"), "utf8");
    const selected = raw.trim() ? rulesForScope(raw, scope) : null;
    if (selected) {
      return {
        text: selected.text.slice(0, MAX_RULES_CHARS),
        source: "Rules.md",
        applied: selected.applied,
      };
    }
    const text = raw.trim().slice(0, MAX_RULES_CHARS);
    if (text) return { text, source: "Rules.md", applied: "all" };
  } catch {
    // fall through to defaults
  }
  return { text: DEFAULT_RULES, source: "default", applied: "all" };
}
