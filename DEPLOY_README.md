# IEI Gene Hunter v2.0 — deployment bundle

Drop-in replacement for `Henryranger888/Gene-rank-platform`. Built and tested
2026-08-04 against the final leakage-free ranking.

## What to commit

| File | Action |
|---|---|
| `data.json` | **replace** (1.23 MB, was 2.52 MB) |
| `index.html` | **replace** |
| `script.js` | **replace** |
| `build_data.py` | **add** |
| `pred_unlabeled_ranked_leakagefree.csv` | **add** (the ranking this build came from) |
| `pred_unlabeled_ranked.csv` | **delete** — superseded 17,281-gene ranking |
| `process_genes.py`, `scripts/convert_csv.py` | **delete** — superseded by `build_data.py` |
| `gene_lists.py` | keep or delete; no longer used by the build |
| `style.css` | unchanged |

Committing only `data.json` is **not** sufficient — see "Why" below.

## Why a data-only swap is not enough

Three of the four defects live in the code, not in the ranking file:

1. **Denominator.** `index.html` said "Ranks 18,349 STRING v11 proteins" and
   `script.js` hard-coded `TOTAL_PROTEINS = 18349`. Only 17,283 genes are
   ranked; the other 1,066 are training labels. Both now read **17,283**.
2. **"Probability" → "Model score."** No calibration analysis exists, so the
   raw classifier output must not be presented as a probability. All three
   render paths now say "Model score (uncalibrated; for ranking only)".
3. **The 2024 badge set.** `process_genes.py` derived it as
   `IUIS_2024 - IUIS_2022` = **112** genes. The authoritative set is the **51**
   in `added_up_genes.gmt`: 74 genes were wrongly badged and 13 genuine ones
   (DUT, ERN1, IKBKE, IL27, NBEAL2, NFATC2, NUDCD3, PRIM1, RAD50, RECQL4,
   RNASEL, SLC19A1, SMAD3) were missing.

Plus two behavioural fixes: training-label genes now report their label instead
of a rank (they were never scored, so displaying a rank implied a prediction
that does not exist), and tied scores now share a rank rather than being ordered
by CSV row position.

## Regenerating data.json

```bash
python build_data.py \
  --ranking   pred_unlabeled_ranked_leakagefree.csv \
  --pos2022   IEI_2022_filter.txt \
  --negatives nonimmune_confirm_filter_v2.txt \
  --gmt       added_up_genes.gmt \
  --out       data.json
```

The script prints the ranked-gene count. **If it is not 17,283, update
`RANKED_TOTAL` in `script.js` to match** — that constant is the rank
denominator and there is no way to derive it from `data.json` alone.

## Verified before release

Headless test of the real `script.js` against the real `data.json`:

- top chips `#1 TRAF6 · #2 CD4 · #3 IRF1 · #3 VAV1 · #5 TLR9` — note IRF1/VAV1
  correctly share rank 3 (identical scores)
- TNFSF13B → 76 (was 5 in the deployed version), SKIC2 → 2,041
- IRF1, SMAD3 → "New in IUIS 2024" badge + rank + score
- STAT3, CD3E → label only, no rank
- ACTB, NOTAGENE → not-found message
- counts: 17,283 ranked + 1,066 label-only = 18,349 total; exactly 51 badged
- `build_data.py` output is byte-identical to the shipped `data.json`

## Not changed

`style.css` is untouched, so `badge-novel` still styles the 2024 badge and no
CSS work is needed.
