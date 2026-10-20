# Information Architecture Reviser

Enter the URL of a documentation section. The app crawls the pages under that
URL (up to 400 pages, including every descendant under that URL) and returns a **recommended information
architecture tree** for the whole section. Each node is a page title.

## How it works

1. `crawler/crawler.ts` crawls the section with Playwright.
2. `ia/rules.ts` loads the rules from [`Rules.md`](./Rules.md) (falls back to
   built-in defaults if the file is empty). A product link uses Rule A1; a
   feature link uses Rule A2. Rules B and C always apply.
3. `ia/ia.ts` asks the LLM to rearrange the existing pages into a tree that
   follows the rules. Every crawled page appears exactly once. Topics the
   rules require but the section does not have are added as highlighted
   missing topics. Depth is capped.
4. `app/page.tsx` shows the recommended tree. Moved pages are highlighted, and
   the rules and the current structure are available for comparison.

## Setup

```bash
npm install
npx playwright install chromium
```

Put credentials in `.env.local` (gitignored), then restart `npm run dev`.

Cursor (the key from [Cursor Dashboard → API Keys](https://cursor.com/dashboard)):

```bash
LLM_API_ENDPOINT=https://api.cursor.com
LLM_API_KEY=crsr_...
LLM_MODEL=auto
```

`api.cursor.com` is not a chat endpoint. The app calls the Cursor SDK with that
key and asks for text only, with no tools and an empty working directory.

Or an Anthropic Messages-compatible endpoint:

```bash
LLM_API_ENDPOINT=https://api.anthropic.com/v1/messages
LLM_API_KEY=sk-ant-...
LLM_MODEL=claude-sonnet-5-5
```

Edit `Rules.md` to change the rules; it is read on every request, so no restart
is needed.

## Pipeline stages and Claude Code skills

The revise flow runs four stages: **crawl → classify → reorganize → audit**.
The UI runs them together through `/api/crawl`. Each stage is also available on
its own at `/api/ia/<stage>` and as a Claude Code skill in `.claude/skills/`
(`ia-crawl`, `ia-classify`, `ia-reorganize`, `ia-audit`). See
[`docs/ia-pipeline.md`](./docs/ia-pipeline.md) for the shared contract. The
skills write intermediate files to `.ia-work/`, which should not be committed.
