#!/usr/bin/env python3
"""build_data.py - regenerate data.json for IEI Gene Hunter from the served consensus ranking.

v3 (2026-08-16): deploys the consensus ranking (integer keys, symbol tie-break) from the
Figshare deposit file iei_prediction_list.csv. Replaces the v2 build, which served a
single-arm model score over the superseded 414/652 label sets.

Deliberate properties:
  * NO score field is emitted. The served ranking is uniquely ordered; nothing is a
    probability. Output carries ranks only.
  * The catalogue-update badge set is read DIRECTLY from eval_target_56.csv (the deposited
    evaluation target), not recomputed. This makes the deployed badge set byte-identical to
    the Figshare copy. (Shape, for the record: 60 genes are 2024-not-2022 at catalogue
    level; 56 of them have a STRING v11 node; the 4 without a node can never be ranked.)
  * The 49 catalogue IEI genes with NO node in the STRING v11 network (in_universe == 0 in
    any era file) are carried as label-only entries so a clinician querying e.g. B2M gets
    "known IEI gene, no network node" rather than the out-of-scope message reserved for
    genuinely unrecognised symbols.

Usage
-----
python build_data.py \
    --ranking    iei_prediction_list.csv \
    --pos2022    iuis2022_labels.csv \
    --labels2014 iuis2014_labels.csv \
    --labels2024 iuis2024_labels.csv \
    --controls   nonimmune_controls_screened.csv \
    --badge      eval_target_56.csv \
    --out        data.json

Output schema: {GENE: entry}
  ranked entry      {"r": int, "rx": int, "rr": int, "re": int, "labels": [...]}
                    r = consensus rank R_i; rx/rr/re = XGBoost / RBF-SVM / ElasticNet
                    component ranks. Percentile is computed client-side as
                    (N - R_i)/(N - 1), N = 17,252; LARGE IS BEST.
  label-only entry  {"labels": [...], "era": "IUIS-2024"?}   (no rank keys)

Labels used by script.js:
  "New in IUIS 2024"  ranked gene in the deposited 56-gene evaluation target
  "2022 IUIS IEI"     training positive (403; label-only)
  "Non-immune"        screened control (694 kept; label-only)
  "IEI-no-node"       catalogue IEI gene with no STRING v11 node (49; label-only)
"""
import argparse
import csv
import json
from pathlib import Path


def read_labels_csv(path):
    """gene,hgnc_id,in_universe -> list of (gene, in_universe) tuples."""
    with open(path, newline="") as fh:
        return [(row["gene"].strip(), int(row["in_universe"]))
                for row in csv.DictReader(fh)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ranking", required=True)
    ap.add_argument("--pos2022", required=True)
    ap.add_argument("--labels2014", required=True)
    ap.add_argument("--labels2024", required=True)
    ap.add_argument("--controls", required=True)
    ap.add_argument("--badge", required=True)
    ap.add_argument("--out", default="data.json")
    a = ap.parse_args()

    data = {}

    # --- ranked background: all rows of the deposited consensus ranking, no score exists
    with open(a.ranking, newline="") as fh:
        for row in csv.DictReader(fh):
            data[row["gene"].strip()] = {
                "r": int(row["consensus_rank_Ri"]),
                "rx": int(row["rank_XGBoost"]),
                "rr": int(row["rank_RBFSVM"]),
                "re": int(row["rank_ElasticNet"]),
                "labels": [],
            }
    n_ranked = len(data)

    # --- badge: the deposited evaluation target, verbatim
    with open(a.badge, newline="") as fh:
        badge = [row["gene"].strip() for row in csv.DictReader(fh)]
    for g in badge:
        assert g in data, "badge gene %s is not in the ranked background" % g
        data[g]["labels"].append("New in IUIS 2024")

    # --- training labels (label-only; excluded from the background by construction)
    pos2022 = [(g, u) for g, u in read_labels_csv(a.pos2022)]
    n_pos = 0
    for g, in_uni in pos2022:
        if in_uni == 1:
            assert g not in data, \
                "training positive %s appears in the ranked background" % g
            data[g] = {"labels": ["2022 IUIS IEI"]}
            n_pos += 1

    n_ctrl = 0
    with open(a.controls, newline="") as fh:
        for row in csv.DictReader(fh):
            if row["screen_outcome"].strip() == "kept":
                g = row["gene"].strip()
                data[g] = {"labels": ["Non-immune"]}
                n_ctrl += 1

    # --- catalogue IEI genes with no STRING v11 node: label-only, era-annotated
    no_node = {}
    for path, era in ((a.labels2014, "IUIS-2014"), (a.pos2022, "IUIS-2022"),
                      (a.labels2024, "IUIS-2024")):
        for g, in_uni in read_labels_csv(path):
            if in_uni == 0:
                no_node[g] = era  # later era wins
    for g, era in no_node.items():
        assert g not in data or not data[g].get("r"), \
            "no-node gene %s unexpectedly has a rank" % g
        if g in data and "2022 IUIS IEI" in data[g].get("labels", []):
            data[g]["labels"].append("IEI-no-node")
            data[g]["era"] = era
        else:
            data[g] = {"labels": ["IEI-no-node"], "era": era}

    Path(a.out).write_text(json.dumps(data, separators=(",", ":")))

    n_label_only = sum(1 for v in data.values() if "r" not in v)
    print("[data] %d entries -> %s" % (len(data), a.out))
    print("[data] ranked background:        %d" % n_ranked)
    print("[data] training positives 2022:  %d" % n_pos)
    print("[data] screened controls kept:   %d" % n_ctrl)
    print("[data] IEI genes without a node: %d" % len(no_node))
    print("[data] label-only total:         %d" % n_label_only)
    print("[data] badge genes:              %d" % len(badge))
    print("[data] ACTION: RANKED_TOTAL in script.js must equal %d." % n_ranked)


if __name__ == "__main__":
    main()
