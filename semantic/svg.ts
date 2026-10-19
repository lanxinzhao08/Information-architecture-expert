import type { Component, SemanticGraph, RelationType } from "./semantic";

const NODE_W = 180;
const NODE_H = 48;
const GAP_X = 110;
const GAP_Y = 28;
const PAD = 32;

const PALETTE = ["#dbeafe", "#dcfce7", "#fef3c7", "#fce7f3", "#ede9fe", "#ccfbf1", "#fee2e2"];
const STROKES = ["#2563eb", "#16a34a", "#d97706", "#db2777", "#7c3aed", "#0d9488", "#dc2626"];

const DASH: Partial<Record<RelationType, string>> = {
  related_to: "4 4",
  alternative_to: "8 4",
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only allow http(s) links so crawled/LLM data can't inject javascript: URLs. */
function safeHref(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : null;
  } catch {
    return null;
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

/** Left-to-right layered layout: a source sits left of what it points to. */
function layout(components: Component[], edges: SemanticGraph["edges"]) {
  const connected = new Set<string>();
  edges.forEach((e) => {
    connected.add(e.source);
    connected.add(e.target);
  });
  const nodes = components.filter((c) => connected.has(c.id));

  const layer = new Map(nodes.map((n) => [n.id, 0]));
  // Bounded relaxation so cycles terminate.
  for (let i = 0; i < nodes.length; i++) {
    let changed = false;
    for (const e of edges) {
      const next = (layer.get(e.source) ?? 0) + 1;
      if (next > (layer.get(e.target) ?? 0) && next < nodes.length) {
        layer.set(e.target, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const columns: Component[][] = [];
  nodes.forEach((n) => {
    const l = layer.get(n.id) ?? 0;
    (columns[l] ??= []).push(n);
  });

  // One barycenter pass to reduce edge crossings.
  const row = new Map<string, number>();
  columns.forEach((col, ci) => {
    if (!col) return;
    if (ci > 0) {
      const score = (n: Component) => {
        const ps = edges
          .filter((e) => e.target === n.id && row.has(e.source))
          .map((e) => row.get(e.source)!);
        return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : Infinity;
      };
      col.sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));
    } else {
      col.sort((a, b) => a.name.localeCompare(b.name));
    }
    col.forEach((n, i) => row.set(n.id, i));
  });

  const pos = new Map<string, { x: number; y: number }>();
  columns.forEach((col, ci) => {
    col?.forEach((n, ri) => {
      pos.set(n.id, {
        x: PAD + ci * (NODE_W + GAP_X),
        y: PAD + ri * (NODE_H + GAP_Y),
      });
    });
  });

  const width = PAD * 2 + columns.length * NODE_W + (columns.length - 1) * GAP_X;
  const height =
    PAD * 2 + Math.max(...columns.map((c) => c?.length ?? 0), 1) * (NODE_H + GAP_Y) - GAP_Y;

  return { nodes, pos, width: Math.max(width, 200), height: Math.max(height, 100) };
}

export function renderSvg(graph: SemanticGraph): string {
  const base = layout(graph.components, graph.edges);
  const { nodes, pos, width } = base;
  const hasBackEdge = graph.edges.some(
    (e) => (pos.get(e.target)?.x ?? 0) <= (pos.get(e.source)?.x ?? 0)
  );
  const height = base.height + (hasBackEdge ? 70 : 0);

  const types = [...new Set(nodes.map((n) => n.type))];
  const typeIdx = (t: string) => types.indexOf(t) % PALETTE.length;

  const edgeSvg = graph.edges
    .map((e) => {
      const a = pos.get(e.source);
      const b = pos.get(e.target);
      if (!a || !b) return "";
      const forward = b.x > a.x;
      let d: string;
      let lx: number;
      let ly: number;
      if (forward) {
        const x1 = a.x + NODE_W;
        const y1 = a.y + NODE_H / 2;
        const y2 = b.y + NODE_H / 2;
        const dx = (b.x - x1) / 2;
        d = `M${x1},${y1} C${x1 + dx},${y1} ${b.x - dx},${y2} ${b.x},${y2}`;
        lx = (x1 + b.x) / 2;
        ly = (y1 + y2) / 2 - 4;
      } else {
        // Backward/same-column edge: arc under the nodes so it never crosses them.
        const x1 = a.x + NODE_W / 2;
        const x2 = b.x + NODE_W / 2;
        const y1 = a.y + NODE_H;
        const y2 = b.y + NODE_H;
        const drop = 50;
        d = `M${x1},${y1} C${x1},${y1 + drop} ${x2},${y2 + drop} ${x2},${y2}`;
        lx = (x1 + x2) / 2;
        ly = (y1 + y2) / 2 + drop * 0.75 + 12;
      }
      const dash = DASH[e.relation];
      const label = e.relation.replace(/_/g, " ");
      return (
        `<g><title>${esc(e.evidence)} (${Math.round(e.confidence * 100)}%)</title>` +
        `<path d="${d}" fill="none" stroke="#64748b" stroke-width="${1 + e.confidence}"` +
        (dash ? ` stroke-dasharray="${dash}"` : "") +
        ` marker-end="url(#arrow)"/>` +
        `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="10" fill="#334155" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(label)}</text></g>`
      );
    })
    .join("");

  const nodeSvg = nodes
    .map((n) => {
      const p = pos.get(n.id)!;
      const i = typeIdx(n.type);
      const href = safeHref(n.pages[0]);
      const body =
        `<rect x="${p.x}" y="${p.y}" width="${NODE_W}" height="${NODE_H}" rx="8" fill="${PALETTE[i]}" stroke="${STROKES[i]}"/>` +
        `<text x="${p.x + NODE_W / 2}" y="${p.y + 20}" text-anchor="middle" font-size="13" font-weight="600" fill="#0f172a">${esc(truncate(n.name, 24))}</text>` +
        `<text x="${p.x + NODE_W / 2}" y="${p.y + 36}" text-anchor="middle" font-size="10" fill="#475569">${esc(truncate(n.type, 24))}</text>`;
      const title = `<title>${esc(n.description)}</title>`;
      return href
        ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${title}${body}</a>`
        : `<g>${title}${body}</g>`;
    })
    .join("");

  const legend = types
    .map(
      (t, i) =>
        `<g transform="translate(${PAD + i * 110},${height + 4})"><rect width="12" height="12" rx="3" fill="${PALETTE[i % PALETTE.length]}" stroke="${STROKES[i % STROKES.length]}"/><text x="18" y="10" font-size="10" fill="#334155">${esc(truncate(t, 12))}</text></g>`
    )
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height + 28}" width="${width}" height="${height + 28}" font-family="system-ui, sans-serif">` +
    `<rect width="100%" height="100%" fill="#ffffff"/>` +
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#64748b"/></marker></defs>` +
    edgeSvg +
    nodeSvg +
    legend +
    `</svg>`
  );
}
