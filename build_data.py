#!/usr/bin/env python3
"""build_data.py - regenerate data.json for IEI Gene Hunter from the final ranking.

Replaces process_genes.py + scripts/convert_csv.py, which had two defects:
  * rank was inferred from CSV row order, which is arbitrary for tied scores;
  * the "Novel 2024" badge set was derived as IUIS_2024 - IUIS_2022 (112 genes)
    instead of the authoritative 51 in added_up_genes.gmt.

Usage
-----
python build_data.py \
    --ranking   pred_unlabeled_ranked_leakagefree.csv \
    --pos2022   IEI_2022_filter.txt \
    --negatives nonimmune_confirm_filter_v2.txt \
    --gmt       added_up_genes.gmt \
    --out       data.json

Output schema:  {GENE: {"rank": int, "score": float|None, "labels": [str, ...]}}

Semantics
---------
rank  Competition rank over the model score: genes with identical scores share the
      same (best) rank. Training-label genes are never ranked (rank 0) - they were
      not scored by the model and must not be displayed as predictions.
score Raw classifier output. Uncalibrated; for ranking only.
"""
import argparse
import csv
import json
from pathlib import Path


def read_list(path):
    """One bare gene symbol per line. Strips Unicode whitespace (incl. U+00A0)."""
    return {ln.strip() for ln in Path(path).read_text().splitlines() if ln.strip()}


def read_gmt_first_set(path):
    """GMT line: NAME <tab> DESCRIPTION <tab> GENE1 <tab> GENE2 ..."""
    fields = Path(path).read_text().rstrip("\n").split("\t")
    return {g.strip() for g in fields[2:] if g.strip()}


def competition_ranks(scores):
    """Rank 1 = highest score; equal scores share the lowest (best) rank."""
    order = sorted(range(len(scores)), key=lambda i: -scores[i])
    ranks = [0] * len(scores)
    prev_score, prev_rank = None, 0
    for pos, i in enumerate(order, start=1):
        if prev_score is not None and scores[i] == prev_score:
            ranks[i] = prev_rank
        else:
            ranks[i] = pos
            prev_rank, prev_score = pos, scores[i]
    return ranks


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ranking", required=True)
    ap.add_argument("--pos2022", required=True)
    ap.add_argument("--negatives", required=True)
    ap.add_argument("--gmt", required=True)
    ap.add_argument("--out", default="data.json")
    a = ap.parse_args()

    genes, scores = [], []
    with open(a.ranking, newline="") as fh:
        for row in csv.DictReader(fh):
            genes.append(row["gene"].strip())
            scores.append(float(row["probability"]))

    ranks = competition_ranks(scores)
    data = {g: {"rank": r, "score": s, "labels": ["Model-ranked"]}
            for g, s, r in zip(genes, scores, ranks)}
    n_ranked = len(data)

    for path, label in ((a.pos2022, "2022 IUIS IEI"),
                        (a.negatives, "Non-immune"),
                        (a.gmt, "New in IUIS 2024")):
        members = (read_gmt_first_set(path) if label == "New in IUIS 2024"
                   else read_list(path))
        for g in members:
            entry = data.setdefault(g, {"rank": 0, "score": None, "labels": []})
            if label not in entry["labels"]:
                entry["labels"].append(label)

    Path(a.out).write_text(json.dumps(data, separators=(",", ":")))

    n_zero = sum(1 for v in data.values() if v["rank"] == 0)
    print("[data] %d genes -> %s" % (len(data), a.out))
    print("[data] ranked (unlabelled pool): %d" % n_ranked)
    print("[data] label-only (not ranked):  %d" % n_zero)
    print("[data] ACTION: RANKED_TOTAL in script.js must equal %d - "
          "update it if this number changes." % n_ranked)


if __name__ == "__main__":
    main()
