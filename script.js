
document.addEventListener('DOMContentLoaded', () => {
    const geneInput = document.getElementById('geneInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultContainer = document.getElementById('resultContainer');
    const geneSymbolDisplay = document.getElementById('geneSymbol');
    const resultContent = document.getElementById('resultContent');
    const topGenesStrip = document.getElementById('topGenesStrip');

    let geneData = {};
    let rankToGene = {};
    const TOTAL_PROTEINS = 18349; // Fixed total based on method description

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
            } else if (labels.includes('Novel 2024 IUIS')) {
                renderNovelIEIState(rank);
            } else {
                renderStandardState(rank);
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
        const info = geneData[geneInput.value.trim().toUpperCase()];
        if (info && info.probability !== undefined && info.probability !== 'N/A') {
            const probDiv = document.createElement('div');
            probDiv.style.marginTop = '0.5rem';
            probDiv.style.fontWeight = 'bold';
            probDiv.textContent = `Probability: ${parseFloat(info.probability).toFixed(4)}`;
            resultContent.appendChild(probDiv);
        }


    }

    function renderNovelIEIState(rank) {
        // Badge
        const badge = document.createElement('span');
        badge.className = 'badge badge-novel';
        badge.textContent = 'Novel IEI (IUIS 2024)';
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
            context.textContent = "Recently added IEI gene in IUIS 2024; high model rank among all proteins.";
            resultContent.appendChild(context);
        }

        // Probability Display
        const info = geneData[geneInput.value.trim().toUpperCase()];
        if (info && info.probability !== undefined && info.probability !== 'N/A') {
            const probDiv = document.createElement('div');
            probDiv.style.marginTop = '0.5rem';
            probDiv.style.fontWeight = 'bold';
            probDiv.textContent = `Probability: ${parseFloat(info.probability).toFixed(4)}`;
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
        text.textContent = "This gene was included as a non-immune control during model training. It is not prioritized as an IEI candidate by this tool.";
        resultContent.appendChild(text);
    }

    function renderStandardState(rank) {
        if (rank > 0) {
            const rankBlock = createRankBlock(rank);
            resultContent.appendChild(rankBlock);

            // Probability Display
            const info = geneData[geneInput.value.trim().toUpperCase()];
            if (info && info.probability !== undefined && info.probability !== 'N/A') {
                const probDiv = document.createElement('div');
                probDiv.style.marginTop = '0.5rem';
                probDiv.style.fontWeight = 'bold';
                probDiv.textContent = `Probability: ${parseFloat(info.probability).toFixed(4)}`;
                resultContent.appendChild(probDiv);
            }
        }
    }

    function renderNotFoundState() {
        const msg = document.createElement('div');
        msg.innerHTML = `
            <p style="margin-bottom: 0.5rem; font-weight: 600; color: var(--text-secondary);">
                Non-protein-coding gene or not included in STRING v11.
            </p>
            <p class="method-text">
                IEI Gene Hunter currently supports only protein-coding genes with a STRING v11 protein ID. This gene is outside the supported set, so no prediction is available.
            </p>
        `;
        resultContent.appendChild(msg);
    }

    // --- Helpers ---

    function createRankBlock(rank) {
        const container = document.createElement('div');
        container.className = 'rank-block';

        const percentile = ((rank / TOTAL_PROTEINS) * 100).toFixed(2);

        container.innerHTML = `
            <span class="rank-value">${rank} / ${TOTAL_PROTEINS}</span>
            <span class="rank-context">Rank among ${TOTAL_PROTEINS.toLocaleString()} STRING v11 proteins.</span>
            <div style="margin-top: 0.25rem; font-size: 0.9rem; color: var(--accent);">Top ${percentile}%</div>
        `;
        return container;
    }

    // Event Listeners
    searchBtn.addEventListener('click', () => performSearch());
    geneInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
});
