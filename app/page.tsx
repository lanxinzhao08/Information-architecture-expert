"use client";

import { useState } from "react";

interface IaNode {
  url: string;
  title: string;
  moved?: boolean;
  reason?: string;
  children: IaNode[];
}

interface Result {
  pageCount: number;
  rulesSource: "Rules.md" | "default";
  rules: string;
  ia: {
    current: IaNode;
    recommended: IaNode;
    movedCount: number;
  };
}

function safeHref(url: string): string | undefined {
  return /^https?:\/\//i.test(url) ? url : undefined;
}

function Tree({ node, showMoved }: { node: IaNode; showMoved?: boolean }) {
  const highlight = showMoved && node.moved;
  return (
    <li className="py-0.5">
      <a
        href={safeHref(node.url)}
        target="_blank"
        rel="noopener noreferrer"
        className={highlight ? "font-semibold text-blue-700" : "hover:underline"}
        title={node.reason ?? node.url}
      >
        {node.title}
      </a>
      {highlight && (
        <span className="ml-2 rounded bg-blue-100 px-1.5 text-xs text-blue-800">
          moved
        </span>
      )}
      {node.children.length > 0 && (
        <ul className="ml-5 border-l pl-3">
          {node.children.map((child) => (
            <Tree key={child.url} node={child} showMoved={showMoved} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevise() {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to analyze");
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to analyze website.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-3xl font-bold">Information Architecture Reviser</h1>
        <p className="mb-8 text-gray-600">
          Enter a documentation section URL. The pages in that section are
          crawled and reorganized into a recommended information architecture
          following the rules in <code>Rules.md</code>.
        </p>

        <form
          className="flex gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleRevise();
          }}
        >
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/docs"
            className="flex-1 rounded border px-4 py-3"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-black px-6 py-3 text-white disabled:opacity-50"
          >
            {loading ? "Revising..." : "Revise IA"}
          </button>
        </form>

        {loading && (
          <p className="mt-6 text-sm text-gray-500">
            Crawling the section and reorganizing it. This can take a few minutes.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-6 rounded bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-10">
            <h2 className="mb-1 text-xl font-semibold">Recommended information architecture</h2>
            <p className="mb-4 text-sm text-gray-600">
              {result.pageCount} pages, {result.ia.movedCount} moved. Rules from{" "}
              {result.rulesSource === "Rules.md" ? (
                <code>Rules.md</code>
              ) : (
                "built-in defaults (Rules.md is empty)"
              )}
              . Moved pages are highlighted; hover for the reason.
            </p>

            <ul className="rounded border p-4 text-sm">
              <Tree node={result.ia.recommended} showMoved />
            </ul>

            <details className="mt-6 text-sm">
              <summary className="cursor-pointer font-medium text-gray-700">
                Rules applied
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs text-gray-700">
                {result.rules}
              </pre>
            </details>

            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium text-gray-700">
                Current structure (for comparison)
              </summary>
              <ul className="mt-2 rounded border p-4 text-gray-600">
                <Tree node={result.ia.current} />
              </ul>
            </details>
          </div>
        )}
      </div>
    </main>
  );
}
