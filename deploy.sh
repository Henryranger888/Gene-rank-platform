#!/usr/bin/env bash
# deploy.sh — publish IEI Gene Hunter v2.0 to Henryranger888/Gene-rank-platform
#
#   bash deploy.sh                     # clone fresh into a temp dir, commit, push
#   bash deploy.sh /path/to/checkout   # use an existing local clone instead
#
# Requires: git, and push rights on the repo (GitHub will prompt for your
# credentials, or use an existing SSH key / gh auth login).
#
# The script shows a full diff summary and asks for confirmation before pushing.
set -euo pipefail

REPO_SSH="git@github.com:Henryranger888/Gene-rank-platform.git"
REPO_HTTPS="https://github.com/Henryranger888/Gene-rank-platform.git"
BUNDLE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Bundle: $BUNDLE"
for f in index.html script.js data.json build_data.py style.css DEPLOY_README.md \
         pred_unlabeled_ranked_leakagefree.csv; do
  [[ -f "$BUNDLE/$f" ]] || { echo "MISSING from bundle: $f"; exit 1; }
done

if [[ $# -ge 1 ]]; then
  WORK="$1"
  echo "==> Using existing checkout: $WORK"
  git -C "$WORK" pull --ff-only
else
  WORK="$(mktemp -d)/Gene-rank-platform"
  echo "==> Cloning into $WORK"
  git clone "$REPO_SSH" "$WORK" 2>/dev/null || git clone "$REPO_HTTPS" "$WORK"
fi

cd "$WORK"

echo "==> Replacing application files"
cp "$BUNDLE/index.html"   ./index.html
cp "$BUNDLE/script.js"    ./script.js
cp "$BUNDLE/data.json"    ./data.json
cp "$BUNDLE/style.css"    ./style.css
cp "$BUNDLE/build_data.py" ./build_data.py
cp "$BUNDLE/DEPLOY_README.md" ./DEPLOY_README.md
cp "$BUNDLE/pred_unlabeled_ranked_leakagefree.csv" ./pred_unlabeled_ranked_leakagefree.csv
cp "$BUNDLE/IEI_2022_filter.txt" ./IEI_2022_filter.txt
cp "$BUNDLE/nonimmune_confirm_filter_v2.txt" ./nonimmune_confirm_filter_v2.txt
cp "$BUNDLE/added_up_genes.gmt" ./added_up_genes.gmt

echo "==> Removing superseded files"
git rm -q --ignore-unmatch pred_unlabeled_ranked.csv process_genes.py \
                           scripts/convert_csv.py gene_lists.py check_2024_genes.py
rmdir scripts 2>/dev/null || true

echo
echo "==> Change summary"
git add -A
git status --short
echo
echo "    data.json  : $(python3 -c "import json;d=json.load(open('data.json'));print(sum(1 for v in d.values() if v.get('rank',0)>0),'ranked /',len(d),'total')")"
echo "    badges     : $(python3 -c "import json;d=json.load(open('data.json'));print(sum(1 for v in d.values() if 'New in IUIS 2024' in v.get('labels',[])),'genes flagged New in IUIS 2024')")"
echo

read -r -p "Push these changes to main? [y/N] " ans
[[ "${ans,,}" == "y" ]] || { echo "Aborted. Nothing pushed."; exit 0; }

git commit -q -m "Update to leakage-free ranking (v2.0)

- data.json rebuilt from pred_unlabeled_ranked_leakagefree.csv (17,283 ranked genes)
- rank denominator corrected 18,349 -> 17,283 (training-label genes are not ranked)
- 'Probability' relabelled 'Model score' (uncalibrated; for ranking only)
- 2024 badge set corrected from 112 derived genes to the authoritative 51
- training-label genes now show their label instead of a rank
- tied scores share a rank (competition ranking)
- build_data.py replaces process_genes.py + scripts/convert_csv.py"

git push origin main
echo
echo "==> Pushed. GitHub Pages usually rebuilds within a minute or two:"
echo "    https://henryranger888.github.io/Gene-rank-platform/"
