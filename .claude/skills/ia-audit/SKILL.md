---
name: ia-audit
description: Audit a recommended documentation IA tree against Rules A, B and C and report gaps (thin or mis-titled overviews, reference topics outside their task, missing required pages). Use as stage 4 after ia-reorganize.
---

# IA stage 4: audit

Read `docs/ia-pipeline.md` for the contract and `Rules.md` for the rules. Needs `crawl.json`, `labels.json` and `reorg.json` in `.ia-work/`.

1. Same `scope` as earlier stages.
2. Run the deterministic checks:
   ```bash
   python3 -c "import json;c=json.load(open('.ia-work/crawl.json'));l=json.load(open('.ia-work/labels.json'))['labels'];t=json.load(open('.ia-work/reorg.json'))['ia']['recommended'];print(json.dumps({'scope':'<SCOPE>','pages':c['pages'],'labels':l,'tree':t}))" > .ia-work/audit-in.json
   curl -s -X POST localhost:3000/api/ia/audit -H 'content-type: application/json' \
     -d @.ia-work/audit-in.json -o .ia-work/audit.json
   ```
3. Report `findings` grouped by rule, errors first. The checks cover:
   - **Rule B:** overview title is not "[X] overview"; fewer than three sentences; an "Overview" heading inside the page.
   - **Rule C:** every page exactly once; reference topics under the task they support.
   - **Rule A:** product scope needs a product overview and a process overview; every feature needs an overview; product-level pages are flagged in a feature scope.
4. Add judgment the code cannot make, labelled clearly as your own opinion: whether a flagged thin overview should be expanded or merged, and whether a feature or task grouping reads naturally to a user. Do not change the tree.
5. End with a short list of the highest-value fixes for the content team. `error` findings first.

If there are no findings, say so; do not invent issues.
