import csv
import json
import os

CSV_PATH = 'pred_unlabeled_ranked.csv'
JSON_PATH = 'data.json'

def convert_csv_to_json():
    gene_ranks = {}
    
    if not os.path.exists(CSV_PATH):
        print(f"Error: {CSV_PATH} not found.")
        return

    try:
        with open(CSV_PATH, mode='r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            # The rank is the row index (1-based). 
            # We assume the CSV is already sorted by rank as implied by the filename 'ranked'.
            for index, row in enumerate(reader, start=1):
                gene = row.get('gene')
                if gene:
                    gene_ranks[gene.strip()] = index
        
        with open(JSON_PATH, 'w', encoding='utf-8') as jsonfile:
            json.dump(gene_ranks, jsonfile)
        
        print(f"Successfully converted {len(gene_ranks)} genes to {JSON_PATH}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    convert_csv_to_json()
