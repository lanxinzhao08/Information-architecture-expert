# Information Architecture Reviser

Enter the URL of a documentation section. The app crawls the pages under that
URL (up to 50 pages, 3 levels deep) and returns a **recommended information
architecture tree** for the whole section. Each node is a page title.

## How it works

1. `crawler/crawler.ts` crawls the section with Playwright.
2. `ia/rules.ts` loads the rules from [`Rules.md`](./Rules.md) (falls back to
   built-in defaults if the file is empty).
3. `ia/ia.ts` asks the LLM to rearrange the existing pages into a tree that
   follows the rules. Output is validated: every page appears exactly once, no
   pages are invented or renamed, and depth is capped.
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
