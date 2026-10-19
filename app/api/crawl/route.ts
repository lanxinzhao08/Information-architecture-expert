import { NextRequest, NextResponse } from "next/server";
import { crawlSite } from "../../../crawler/crawler";
import { reviseIa } from "../../../ia/ia";
import { loadRules } from "../../../ia/rules";

export const maxDuration = 600;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body.url;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
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

    const rules = await loadRules();
    const ia = await reviseIa(pages, rules.text);

    return NextResponse.json({
      startUrl: url,
      pageCount: pages.length,
      rulesSource: rules.source,
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
