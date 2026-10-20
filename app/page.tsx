"use client";

import { useState } from "react";

interface IaNode {
  url: string;
  title: string;
  moved?: boolean;
  missing?: boolean;
  reason?: string;
  children: IaNode[];
}

type IaScope = "product" | "feature";

interface Result {
  pageCount: number;
  scope: IaScope;
  rulesSource: "Rules.md" | "default";
  appliedRule: "A1" | "A2" | "all";
  rules: string;
  ia: {
    current: IaNode;
    recommended: IaNode;
    movedCount: number;
    missingCount?: number;
    audit?: {
      rule: "A" | "B" | "C";
      severity: "error" | "warn" | "info";
      page: string;
      url?: string;
      message: string;
    }[];
  };
}

function safeHref(url: string): string | undefined {
  return /^https?:\/\//i.test(url) ? url : undefined;
}

function Tree({ node, showMoved }: { node: IaNode; showMoved?: boolean }) {
  const missing = Boolean(showMoved && node.missing);
  const moved = Boolean(showMoved && node.moved && !missing);
  const href = missing ? undefined : safeHref(node.url);
  const className = missing
    ? "font-semibold text-amber-900"
    : moved
      ? "font-semibold text-blue-700"
      : "hover:underline";
  const label = (
    <>
      {node.title}
      {moved && (
        <span className="ml-2 rounded bg-blue-100 px-1.5 text-xs font-normal text-blue-800">
          moved
        </span>
      )}
      {missing && (
        <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs font-normal text-amber-950">
          missing
        </span>
      )}
    </>
  );

  const title = href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={node.reason ?? node.url}
    >
      {label}
    </a>
  ) : (
    <span className={className} title={node.reason}>
      {label}
    </span>
  );

  return (
    <li className="py-0.5">
      {missing ? (
        <div className="my-0.5 rounded bg-amber-50 px-1 py-0.5">
          {title}
          {node.reason && (
            <span className="mt-0.5 block text-xs text-amber-950/80">{node.reason}</span>
          )}
        </div>
      ) : (
        title
      )}
      {node.children.length > 0 && (
        <ul className="ml-5 border-l pl-3">
          {node.children.map((child, index) => (
            <Tree
              key={`${child.url || "missing"}:${child.title}:${index}`}
              node={child}
              showMoved={showMoved}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [scope, setScope] = useState<IaScope>("product");
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
        body: JSON.stringify({ url: url.trim(), scope }),
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
          following the rules in <code>Rules.md</code>. Choose whether the link
          is a product (Rule A1) or a feature (Rule A2). Topics the section needs
          for a complete journey, and does not have yet, are added and highlighted.
        </p>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleRevise();
          }}
        >
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-800">
              This link is for
            </legend>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ["product", "Product", "Rule A1"],
                  ["feature", "Feature", "Rule A2"],
                ] as const
              ).map(([value, label, rule]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-2 rounded border px-4 py-2 ${
                    scope === value ? "border-black bg-gray-50" : "border-gray-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value={value}
                    checked={scope === value}
                    onChange={() => setScope(value)}
                  />
                  <span>{label}</span>
                  <span className="text-xs text-gray-500">{rule}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex gap-3">
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
          </div>
        </form>

        {loading && (
          <p className="mt-6 text-sm text-gray-500">
            Crawling the section and its descendant pages, then reorganizing them.
            A large section can take a while.
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
              {result.pageCount} pages, {result.ia.movedCount} moved,{" "}
              {result.ia.missingCount ?? 0} missing.{" "}
              {result.appliedRule === "all" ? (
                result.rulesSource === "Rules.md" ? (
                  <>
                    Rules from <code>Rules.md</code>
                  </>
                ) : (
                  "Built-in defaults (Rules.md is empty)"
                )
              ) : (
                <>
                  {result.appliedRule} applied for a {result.scope}, plus Rules B
                  and C from <code>Rules.md</code>
                </>
              )}
              . Moved pages are blue. Missing topics are amber; they are not
              pages yet.
            </p>

            <ul className="rounded border p-4 text-sm">
              <Tree node={result.ia.recommended} showMoved />
            </ul>

            {result.ia.audit && result.ia.audit.length > 0 && (
              <details className="mt-6 text-sm" open>
                <summary className="cursor-pointer font-medium text-gray-700">
                  Rule audit ({result.ia.audit.length} findings)
                </summary>
                <ul className="mt-2 space-y-1 rounded border p-3">
                  {result.ia.audit.map((f, i) => (
                    <li key={i}>
                      <span
                        className={`mr-2 rounded px-1.5 text-xs ${
                          f.severity === "error"
                            ? "bg-red-100 text-red-800"
                            : f.severity === "warn"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        Rule {f.rule}
                      </span>
                      <strong>{f.page}</strong>: {f.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}

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
