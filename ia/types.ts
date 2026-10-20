export type IaScope = "product" | "feature";

export const PAGE_TYPES = [
  "product-overview",
  "process-overview",
  "feature-overview",
  "task",
  "concepts",
  "config-reference",
  "api-reference",
  "use-case",
  "workflow",
  "other",
] as const;
export type PageType = (typeof PAGE_TYPES)[number];

/** Output of the classify stage. One label per page, index-aligned with the crawl. */
export interface PageLabel {
  type: PageType;
  /** Feature the page belongs to, when it can be told from the page. */
  feature?: string;
  /** Task a reference page relates to (Rule C: reference sits under its task). */
  task?: string;
}

export type Severity = "error" | "warn" | "info";

export interface AuditFinding {
  rule: "A" | "B" | "C";
  severity: Severity;
  /** Page title (or proposed topic title) the finding is about. */
  page: string;
  url?: string;
  message: string;
}
