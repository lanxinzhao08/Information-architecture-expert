import { PageData } from "../types/page";

export interface GraphNode {
  id: string;
  url: string;
  title: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function normalizeUrl(url: string): string {
  const parsed = new URL(url);

  parsed.hash = "";

  if (parsed.pathname !== "/") {
    parsed.pathname = parsed.pathname.replace(/\/$/, "");
  }

  return parsed.toString();
}

export function buildGraph(pages: PageData[]): KnowledgeGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const pageMap = new Map<string, PageData>();

  // Create a lookup table for all crawled pages
  for (const page of pages) {
    pageMap.set(normalizeUrl(page.url), page);
  }

  // Create nodes
  for (const page of pages) {
    nodes.push({
      id: normalizeUrl(page.url),
      url: page.url,
      title: page.title || page.url,
    });
  }

  // Create edges based on hyperlinks
  for (const page of pages) {
    const source = normalizeUrl(page.url);

    for (const link of page.links) {
      const target = normalizeUrl(link.url);

      // Only create an edge if the target page was actually crawled
      if (!pageMap.has(target)) {
        continue;
      }

      // Don't create self-links
      if (source === target) {
        continue;
      }

      edges.push({
        source,
        target,
        label: link.text || undefined,
      });
    }
  }

  return {
    nodes,
    edges,
  };
}