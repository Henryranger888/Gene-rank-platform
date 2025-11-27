document.addEventListener('DOMContentLoaded', () => {
    const geneInput = document.getElementById('geneInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultContainer = document.getElementById('resultContainer');
    const geneNameDisplay = document.getElementById('geneNameDisplay');
    const rankDisplay = document.querySelector('.rank-display');
    const rankValue = document.getElementById('rankValue');
    const notFoundMessage = document.getElementById('notFoundMessage');
    const neighborsContainer = document.getElementById('neighborsContainer');

    let geneData = {};
    let rankToGene = {};

    // Fetch the JSON data
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            geneData = data;
            // Create reverse mapping
            for (const [gene, rank] of Object.entries(geneData)) {
                rankToGene[rank] = gene;
            }
            console.log('Gene data loaded:', Object.keys(geneData).length, 'entries');
        })
        .catch(error => {
            console.error('Error loading gene data:', error);
            alert('Failed to load gene data. Please ensure data.json is present.');
        });

    function performSearch() {
        const query = geneInput.value.trim().toUpperCase();

        if (!query) return;

        resultContainer.classList.remove('hidden');

        // Reset previous state (re-trigger animation hack)
        const card = document.querySelector('.result-card');
        card.style.animation = 'none';
        card.offsetHeight; /* trigger reflow */
        card.style.animation = null;

        if (geneData.hasOwnProperty(query)) {
            // Found
            geneNameDisplay.textContent = query;
            const currentRank = geneData[query];
            const totalGenes = Object.keys(geneData).length;

            rankValue.textContent = `${currentRank} / ${totalGenes}`;
            rankDisplay.classList.remove('hidden');
            notFoundMessage.classList.add('hidden');

            // Neighbors Logic
            renderNeighbors(currentRank, totalGenes, query);
            neighborsContainer.classList.remove('hidden');

        } else {
            // Not found
            geneNameDisplay.textContent = query;
            rankDisplay.classList.add('hidden');
            neighborsContainer.classList.add('hidden');
            notFoundMessage.classList.remove('hidden');
        }
    }

    function renderNeighbors(currentRank, totalGenes, currentGene) {
        neighborsContainer.innerHTML = '';

        // Range: -2 to +2
        for (let i = -2; i <= 2; i++) {
            const targetRank = currentRank + i;

            if (targetRank > 0 && targetRank <= totalGenes) {
                const gene = rankToGene[targetRank];
                const el = document.createElement('div');
                el.className = 'neighbor-item';
                if (i === 0) el.classList.add('current');

                el.innerHTML = `
                    <span class="neighbor-rank">#${targetRank}</span>
                    <span class="neighbor-gene">${gene}</span>
                `;
                neighborsContainer.appendChild(el);
            }
        }
    }

    searchBtn.addEventListener('click', performSearch);

    geneInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
});
