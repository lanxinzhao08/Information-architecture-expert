---
name: ia-reorganize
description: Build the recommended documentation information architecture tree from crawled and classified pages, following Rule A1/A2, B and C in Rules.md. Use as stage 3 after ia-classify.
---

# IA stage 3: reorganize

Read `docs/ia-pipeline.md` for the contract and `Rules.md` for the rules. Needs `.ia-work/crawl.json` and `.ia-work/labels.json`.

1. Use the same `scope` as the classify stage (product = Rule A1, feature = Rule A2). If unsure, ask.
2. Call the stage, passing the reviewed labels so classification is not redone:
   ```bash
   python3 -c "import json;c=json.load(open('.ia-work/crawl.json'));l=json.load(open('.ia-work/labels.json'))['labels'];print(json.dumps({'scope':'<SCOPE>','pages':c['pages'],'labels':l}))" > .ia-work/reorg-in.json
   curl -s -X POST localhost:3000/api/ia/reorganize -H 'content-type: application/json' \
     -d @.ia-work/reorg-in.json -o .ia-work/reorg.json
   ```
   This can take many minutes for a large section (batched LLM calls).
3. Present `ia.recommended` as an indented outline of page titles only (mark `moved` and `missing` nodes). Include `movedCount` and `missingCount`.
4. Rules the output must satisfy; check them yourself before presenting:
   - Every crawled page appears exactly once; the root is the start page.
   - Nothing is invented as an existing page. Proposed topics are `missing` nodes with a reason, and they never use placeholder titles like "Feature A".
   - Rule C ordering: workflow order, primary path as the trunk, reference topics under the tasks they support, nice-to-have concepts last.
   - For a feature scope, no product overview, process overview, workflow groups or shared product reference.
5. Never rename a page. If a title looks wrong, report it as a finding; do not change it.

Save the outline for the user if they ask; otherwise keep `.ia-work/reorg.json` for the audit stage.
