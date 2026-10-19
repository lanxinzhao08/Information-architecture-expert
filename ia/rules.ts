import { readFile } from "node:fs/promises";
import path from "node:path";

const MAX_RULES_CHARS = 8000;

/** Used only when Rules.md is missing or empty. */
export const DEFAULT_RULES = `Rule A: Keep the tree at most 3 levels deep below the root, and give each page at most 8 children.
Rule B: Place related pages under the same parent, ordered by user journey (overview, concepts, how-to, reference). A page's parent must be the page that best introduces or summarizes it.
Rule C: Every page appears exactly once. Avoid near-duplicate sibling topics by placing overlapping pages next to each other under one parent.`;

/** Load the IA rules from Rules.md at the project root. */
export async function loadRules(): Promise<{ text: string; source: "Rules.md" | "default" }> {
  try {
    const raw = await readFile(path.join(process.cwd(), "Rules.md"), "utf8");
    const text = raw.trim().slice(0, MAX_RULES_CHARS);
    if (text) return { text, source: "Rules.md" };
  } catch {
    // fall through to defaults
  }
  return { text: DEFAULT_RULES, source: "default" };
}
