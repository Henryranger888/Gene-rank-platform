import json
from gene_lists import IUIS_2024, IUIS_2022

def check_genes():
    with open('data.json', 'r') as f:
        data = json.load(f)

    found_genes = []
    
    # Filter for top 100 ranked genes
    for gene, info in data.items():
        rank = info.get('rank')
        if rank is not None and isinstance(rank, int) and 1 <= rank <= 100:
            if gene in IUIS_2024:
                is_novel = gene not in IUIS_2022
                found_genes.append({
                    'rank': rank,
                    'gene': gene,
                    'is_novel': is_novel,
                    'labels': info.get('labels', [])
                })

    # Sort by rank
    found_genes.sort(key=lambda x: x['rank'])

    print(f"Found {len(found_genes)} genes in top 100 that are in the 2024 IUIS list:")
    print(f"{'Rank':<5} {'Gene':<10} {'Type'}")
    print("-" * 30)
    for item in found_genes:
        type_str = "Novel 2024" if item['is_novel'] else "2022 & 2024"
        print(f"{item['rank']:<5} {item['gene']:<10} {type_str}")

if __name__ == "__main__":
    check_genes()
