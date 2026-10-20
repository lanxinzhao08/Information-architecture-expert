---
name: ia-classify
description: Label each crawled documentation page by type (overview, task, concepts, config reference, API reference, use case, workflow), feature and related task. Use as stage 2 after ia-crawl, before reorganizing.
---

# IA stage 2: classify

Read `docs/ia-pipeline.md` for the contract. Needs `.ia-work/crawl.json` from `ia-crawl`.

1. Get `scope` from the user: **product** (Rule A1) or **feature** (Rule A2). Ask if they have not said. Never infer it from the URL or content.
2. Build the request and call the stage:
   ```bash
   python3 -c "import json;c=json.load(open('.ia-work/crawl.json'));print(json.dumps({'scope':'<SCOPE>','pages':c['pages']}))" > .ia-work/classify-in.json
   curl -s -X POST localhost:3000/api/ia/classify -H 'content-type: application/json' \
     -d @.ia-work/classify-in.json -o .ia-work/labels.json
   ```
3. Summarize with a count per `type` and the list of distinct `feature` names. Do not dump every label.
4. Surface problems for the user to correct before continuing:
   - many pages typed `other` (batch failed or titles unclear),
   - the same feature spelled two ways ("Invoice settings" vs "Invoicing settings"),
   - for a feature scope, any `product-overview`, `process-overview` or `workflow` label (Rule A2 does not use them).
5. If the user corrects labels, edit `.ia-work/labels.json` (array index = page index, `type` from the allowed list) and keep it one-to-one with `pages`.

Labels are advice for the next stage, so a wrong label is cheap to fix here and expensive later.
