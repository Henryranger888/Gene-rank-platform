
document.addEventListener('DOMContentLoaded', () => {
    const geneInput = document.getElementById('geneInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultContainer = document.getElementById('resultContainer');
    const geneSymbolDisplay = document.getElementById('geneSymbol');
    const resultContent = document.getElementById('resultContent');
    const topGenesStrip = document.getElementById('topGenesStrip');

    let geneData = {};
    // Ranked background = the 17,252 STRING v11.0 genes outside the training labels.
    // The 1,097 training-label genes (403 IUIS-2022 positives + 694 screened non-immune
    // controls) are excluded from the ranking by construction and shown with their label.
    // Regenerate data.json with build_data.py if the ranking changes; it prints the
    // value this constant must equal.
    const RANKED_TOTAL = 17252;

    let topGenes = [];

    fetchData();

    function fetchData() {
        fetch('data.json')
            .then(response => response.json())
            .then(data => {
                geneData = data;
                const ranked = [];
                for (const [gene, info] of Object.entries(geneData)) {
                    if (info.r) ranked.push({ gene, ...info });
                }
                ranked.sort((a, b) => a.r - b.r);
                topGenes = ranked.slice(0, 10);
                renderTopGenes();
            })
            .catch(error => console.error('Error loading data:', error));
    }

    function renderTopGenes() {
        topGenesStrip.innerHTML = '';
        topGenes.forEach(item => {
            const chip = document.createElement('button');
            chip.className = 'gene-chip';
            chip.textContent = `#${item.r} ${item.gene}`;
            chip.onclick = () => {
                geneInput.value = item.gene;
                performSearch(item.gene);
            };
            topGenesStrip.appendChild(chip);
        });
    }

    function performSearch(queryOverride) {
        const query = (queryOverride || geneInput.value).trim().toUpperCase();
        if (!query) return;

        resultContainer.classList.remove('hidden');
        geneSymbolDisplay.textContent = query;
        resultContent.innerHTML = '';

        if (geneData.hasOwnProperty(query)) {
            const info = geneData[query];
            const labels = info.labels || [];

            if (labels.includes('Non-immune')) {
                renderNonImmuneState();
            } else if (labels.includes('2022 IUIS IEI')) {
                renderKnownIEIState();
            } else if (labels.includes('IEI-no-node')) {
                renderNoNodeState(info);
            } else {
                renderRankedState(info, labels.includes('New in IUIS 2024'));
            }
        } else {
            renderOutOfScopeState();
        }
    }

    // --- Render states ---

    // Ranked background gene: consensus rank, percentile (large is best), and the
    // three component ranks. No score exists for the served ranking; nothing shown
    // here is a probability.
    function renderRankedState(info, isNovel) {
        if (isNovel) {
            const badge = document.createElement('span');
            badge.className = 'badge badge-novel';
            badge.textContent = 'New in IUIS 2024';
            resultContent.appendChild(badge);
        }

        resultContent.appendChild(createRankBlock(info));

        if (isNovel && info.r < 500) {
            const context = document.createElement('div');
            context.className = 'context-message';
            context.textContent = "Added to the IUIS catalogue in 2024 and held out of training entirely; its rank is a prediction made without knowledge of this gene's IEI status.";
            resultContent.appendChild(context);
        }
    }

    function renderKnownIEIState() {
        const badge = document.createElement('span');
        badge.className = 'badge badge-known';
        badge.textContent = 'Known IEI (IUIS 2022)';
        resultContent.appendChild(badge);

        const note = document.createElement('div');
        note.className = 'context-message';
        note.textContent = 'Used as a positive training label, so this gene is excluded from the ranked background by construction.';
        resultContent.appendChild(note);
    }

    function renderNonImmuneState() {
        const banner = document.createElement('div');
        banner.className = 'banner-non-immune';
        banner.textContent = 'Non-immune control gene';
        resultContent.appendChild(banner);

        const text = document.createElement('p');
        text.className = 'method-text';
        text.textContent = 'Used as a negative training label (passed the all-era catalogue screen), so this gene is excluded from the ranked background by construction.';
        resultContent.appendChild(text);
    }

    // Catalogue IEI gene with no node in the STRING v11.0 network: known gene,
    // deliberately distinct from the out-of-scope message for unrecognised symbols.
    function renderNoNodeState(info) {
        const badge = document.createElement('span');
        badge.className = 'badge badge-known';
        badge.textContent = 'Known IEI gene (' + (info.era || 'IUIS catalogue') + ')';
        resultContent.appendChild(badge);

        const note = document.createElement('div');
        note.className = 'context-message';
        note.textContent = 'This catalogued IEI gene has no node in the STRING v11.0 network build used here, so it is not ranked.';
        resultContent.appendChild(note);
    }

    function renderOutOfScopeState() {
        const msg = document.createElement('div');
        msg.innerHTML = `
            <p style="margin-bottom: 0.5rem; font-weight: 600; color: var(--text-secondary);">
                Out of scope: symbol not recognised.
            </p>
            <p class="method-text">
                IEI Gene Hunter covers the 18,349 genes of this STRING v11.0 build plus the
                catalogued IEI genes without a network node. This symbol matches none of them —
                check the spelling or the current HGNC symbol.
            </p>
        `;
        resultContent.appendChild(msg);
    }

    // --- Helpers ---

    function createRankBlock(info) {
        const container = document.createElement('div');
        container.className = 'rank-block';

        // Percentile of the served ranking: (N - R_i) / (N - 1); LARGE IS BEST.
        // Rank 1 -> 1.000000; rank N -> 0.000000. Displayed as "top X%" where
        // X = (1 - percentile) * 100 keeps the colloquial reading consistent:
        // rank 1 is "top 0.00%" (best), matching percentile 1.000000.
        const pct = (RANKED_TOTAL - info.r) / (RANKED_TOTAL - 1);

        container.innerHTML = `
            <span class="rank-value">Consensus rank ${info.r.toLocaleString()} / ${RANKED_TOTAL.toLocaleString()}</span>
            <span class="rank-context">Uniquely ordered consensus over three component models.</span>
            <div style="margin-top: 0.25rem; font-size: 0.9rem; color: var(--accent);">Percentile ${pct.toFixed(6)}</div>
            <div style="margin-top: 0.5rem; font-size: 0.9rem;">
                <strong>Component ranks</strong> —
                XGBoost: ${info.rx.toLocaleString()} ·
                SVM: ${info.rr.toLocaleString()} ·
                ElasticNet: ${info.re.toLocaleString()}
            </div>
        `;
        return container;
    }

    // Event listeners
    searchBtn.addEventListener('click', () => performSearch());
    geneInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
});
