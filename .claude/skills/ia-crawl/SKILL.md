---
name: ia-crawl
description: Crawl a documentation section URL and all its descendant pages into a page inventory (url, title, headings, content). Use as stage 1 before classifying or reorganizing documentation information architecture.
---

# IA stage 1: crawl

Read `docs/ia-pipeline.md` for the contract. This is the only stage that touches the network, and it makes no judgments.

1. Confirm the URL is the documentation section root (http or https). Ask the user if it is missing.
2. Make sure the app is running (`npm run dev`); if `curl -s localhost:3000` fails, start it in the background.
3. Crawl:
   ```bash
   mkdir -p .ia-work
   curl -s -X POST localhost:3000/api/ia/crawl -H 'content-type: application/json' \
     -d '{"url":"<URL>"}' -o .ia-work/crawl.json
   ```
4. Read only a summary, not the file: `pageCount`, the first five titles, and any `error`. Do not print page content.
5. Report the page count and anything suspicious: very few pages (scope too narrow), exactly 400 (the cap was hit and the section is larger), or duplicate titles.

The crawler stays inside the start URL's path, dedupes by normalized URL, and caps at 400 pages. Never edit `.ia-work/crawl.json` by hand.
