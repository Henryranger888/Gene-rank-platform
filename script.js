
document.addEventListener('DOMContentLoaded', () => {
    const geneInput = document.getElementById('geneInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultContainer = document.getElementById('resultContainer');
    const geneSymbolDisplay = document.getElementById('geneSymbol');
    const resultContent = document.getElementById('resultContent');
    const topGenesStrip = document.getElementById('topGenesStrip');

    let geneData = {};
    let rankToGene = {};
    // Genes actually ranked = the previously unlabelled STRING proteins. The 1,066
    // training-label genes (414 IUIS-2022 positives + 652 non-immune controls) are NOT
    // ranked, so they are not part of this denominator. Regenerate data.json with
    // build_data.py if the ranking changes, and update this constant to match.
    const RANKED_TOTAL = 17283;

    // Top Genes List (Dynamic)
    let topGenes = [];

    // Initialize
    fetchData();

    function fetchData() {
        fetch('data.json')
            .then(response => response.json())
            .then(data => {
                geneData = data;
                // Create reverse mapping and extract top genes
                const allGenes = [];
                for (const [gene, info] of Object.entries(geneData)) {
                    rankToGene[info.rank] = gene;
                    if (info.rank > 0) {
                        allGenes.push({ gene, ...info });
                    }
                }

                // Sort by rank and take top 10
                allGenes.sort((a, b) => a.rank - b.rank);
                topGenes = allGenes.slice(0, 10);

                console.log('Gene data loaded');
                renderTopGenes();
            })
            .catch(error => console.error('Error loading data:', error));
    }

    function renderTopGenes() {
        topGenesStrip.innerHTML = '';
        topGenes.forEach(item => {
            const chip = document.createElement('button');
            chip.className = 'gene-chip';
            chip.textContent = `#${item.rank} ${item.gene}`;
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
        resultContent.innerHTML = ''; // Clear previous content

        if (geneData.hasOwnProperty(query)) {
            const info = geneData[query];
            const rank = info.rank;
            const labels = info.labels || [];

            // Determine State
            if (labels.includes('Non-immune')) {
                renderNonImmuneState();
            } else if (labels.includes('2022 IUIS IEI')) {
                renderKnownIEIState(rank);
            } else if (labels.includes('New in IUIS 2024')) {
                renderNovelIEIState(rank, info);
            } else {
                renderStandardState(rank, info);
            }

        } else {
            renderNotFoundState();
        }
    }

    // --- Render States ---

    function renderKnownIEIState(rank) {
        // Badge
        const badge = document.createElement('span');
        badge.className = 'badge badge-known';
        badge.textContent = 'Known IEI (IUIS 2022)';
        resultContent.appendChild(badge);

        // Training-label gene: never scored or ranked by the model.
        const note = document.createElement('div');
        note.className = 'context-message';
        note.textContent = 'Used as a positive training label, so this gene is not scored or ranked by the model.';
        resultContent.appendChild(note);
        return;

        // Rank Block
        if (rank > 0) {
            const rankBlock = createRankBlock(rank);
            resultContent.appendChild(rankBlock);
        } else {
            // Fallback for "Confirmed" rank 0 genes
            const msg = document.createElement('div');
            msg.className = 'context-message';
            msg.textContent = "Labeled as a known IEI gene in the IUIS classification used for training.";
            resultContent.appendChild(msg);
        }

        // Context if rank exists
        if (rank > 0) {
            const context = document.createElement('div');
            context.className = 'context-message';
            context.textContent = "Labeled as a known IEI gene in the IUIS classification used for training.";
            resultContent.appendChild(context);
        }

        // Probability Display
        const info = rec;
        if (info && info.score !== undefined && info.score !== null) {
            const probDiv = document.createElement('div');
            probDiv.style.marginTop = '0.5rem';
            probDiv.style.fontWeight = 'bold';
            probDiv.innerHTML = `<strong>Model score:</strong> ${fmtScore(info.score)} <span class="method-text" style="display:inline;">(uncalibrated; for ranking only)</span>`;
            resultContent.appendChild(probDiv);
        }


    }

    function renderNovelIEIState(rank, rec) {
        // Badge
        const badge = document.createElement('span');
        badge.className = 'badge badge-novel';
        badge.textContent = 'New in IUIS 2024';
        resultContent.appendChild(badge);

        // Rank Block
        if (rank > 0) {
            const rankBlock = createRankBlock(rank);
            resultContent.appendChild(rankBlock);
        }

        // Context (Only if rank < 500)
        if (rank > 0 && rank < 500) {
            const context = document.createElement('div');
            context.className = 'context-message';
            context.textContent = "Added to the IUIS catalogue in 2024 and held out of training entirely; its rank is a prediction made without knowledge of this gene's IEI status.";
            resultContent.appendChild(context);
        }

        // Probability Display
        const info = rec;
        if (info && info.score !== undefined && info.score !== null) {
            const probDiv = document.createElement('div');
            probDiv.style.marginTop = '0.5rem';
            probDiv.style.fontWeight = 'bold';
            probDiv.innerHTML = `<strong>Model score:</strong> ${fmtScore(info.score)} <span class="method-text" style="display:inline;">(uncalibrated; for ranking only)</span>`;
            resultContent.appendChild(probDiv);
        }
    }

    function renderNonImmuneState() {
        // Banner
        const banner = document.createElement('div');
        banner.className = 'banner-non-immune';
        banner.textContent = 'Non-immune-related gene';
        resultContent.appendChild(banner);

        // Explanation
        const text = document.createElement('p');
        text.className = 'method-text'; // Reuse style
        text.textContent = "Used as a negative training label during model development, so this gene is not scored or ranked by the model.";
        resultContent.appendChild(text);
    }

    function renderStandardState(rank, rec) {
        if (rank > 0) {
            const rankBlock = createRankBlock(rank);
            resultContent.appendChild(rankBlock);

            // Probability Display
            const info = rec;
            if (info && info.score !== undefined && info.score !== null) {
                const probDiv = document.createElement('div');
                probDiv.style.marginTop = '0.5rem';
                probDiv.style.fontWeight = 'bold';
                probDiv.innerHTML = `<strong>Model score:</strong> ${fmtScore(info.score)} <span class="method-text" style="display:inline;">(uncalibrated; for ranking only)</span>`;
                resultContent.appendChild(probDiv);
            }
        }
    }

    function renderNotFoundState() {
        const msg = document.createElement('div');
        msg.innerHTML = `
            <p style="margin-bottom: 0.5rem; font-weight: 600; color: var(--text-secondary);">
                Not included in the STRING v11 network used here.
            </p>
            <p class="method-text">
                IEI Gene Hunter covers the 18,349 genes in this STRING v11 build. Genes outside that set — including many non-coding genes and symbols that did not map — have no prediction available.
            </p>
        `;
        resultContent.appendChild(msg);
    }

    // --- Helpers ---

    // Scores crowd toward 1; 4 d.p. would render 0.9999895 as "1.0000", implying
    // certainty. Show 6 d.p. and strip trailing zeros so the value stays honest.
    function fmtScore(s) {
        return Number(s).toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
    }

    function createRankBlock(rank) {
        const container = document.createElement('div');
        container.className = 'rank-block';

        const percentile = ((rank / RANKED_TOTAL) * 100).toFixed(2);

        container.innerHTML = `
            <span class="rank-value">${rank} / ${RANKED_TOTAL.toLocaleString()}</span>
            <span class="rank-context">Rank among ${RANKED_TOTAL.toLocaleString()} previously unlabelled STRING v11 proteins.</span>
            <div style="margin-top: 0.25rem; font-size: 0.9rem; color: var(--accent);">Higher-scoring than ${(100 - percentile).toFixed(1)}% of ranked genes</div>
        `;
        return container;
    }

    // Event Listeners
    searchBtn.addEventListener('click', () => performSearch());
    geneInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
});
