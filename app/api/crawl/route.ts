import { NextRequest, NextResponse } from "next/server";
import { crawlSite } from "../../../crawler/crawler";
import { reviseIa } from "../../../ia/ia";
import { IaScope, loadRules } from "../../../ia/rules";

export const maxDuration = 1800;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body.url;
    const scope: IaScope | null =
      body.scope === "product" || body.scope === "feature" ? body.scope : null;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    if (!scope) {
      return NextResponse.json(
        { error: "Choose whether this link is for a product or a feature" },
        { status: 400 }
      );
    }

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("bad protocol");
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const pages = await crawlSite(url, { maxPages: 50, maxDepth: 3 });

    if (pages.length === 0) {
      return NextResponse.json({ error: "No pages found" }, { status: 422 });
    }

    const rules = await loadRules(scope);
    const ia = await reviseIa(pages, rules.text);

    return NextResponse.json({
      startUrl: url,
      scope,
      pageCount: pages.length,
      rulesSource: rules.source,
      appliedRule: rules.applied,
      rules: rules.text,
      ia,
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Failed to analyze website";
    return NextResponse.json({ error: message.slice(0, 300) }, { status: 500 });
  }
}
