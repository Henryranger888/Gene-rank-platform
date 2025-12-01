import json
import os
import csv
from gene_lists import IUIS_2022, NON_IMMUNE, IUIS_2024

DATA_FILE = 'data.json'
PREDICTED_IEI_CSV = 'pred_unlabeled_ranked.csv'

def load_data():
    if not os.path.exists(DATA_FILE):
        print(f"Error: {DATA_FILE} not found.")
        return None
    with open(DATA_FILE, 'r') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)
    print(f"Updated data saved to {DATA_FILE}")

def process_genes():
    data = load_data()
    if data is None:
        return

    # Calculate Novel 2024 genes
    # "please only preserve those arent in 2022 list, as the Novel gene from 2024 IUIS"
    NOVEL_2024 = IUIS_2024 - IUIS_2022
    
    print(f"IUIS 2022 count: {len(IUIS_2022)}")
    print(f"Non-immune count: {len(NON_IMMUNE)}")
    print(f"IUIS 2024 count (total): {len(IUIS_2024)}")
    print(f"Novel 2024 count: {len(NOVEL_2024)}")

    # The current data format is {"GENE": rank_int}
    # We want to change it to {"GENE": {"rank": rank_int, "labels": [...]}}
    
    updated_data = {}

    # First, convert existing data
    for gene, value in data.items():
        # Handle case where script might be run multiple times (idempotency)
        if isinstance(value, dict) and "rank" in value:
            rank = value["rank"]
            probability = value.get("probability", 'N/A') # Preserve existing probability if any
        else:
            rank = value
            probability = 'N/A' # Default probability for existing data

        updated_data[gene] = {
            "rank": rank,
            "probability": probability, # Add probability field
            "labels": []
        }

    # Read 'probability' column from CSV and store it in the gene data
    # This section assumes the CSV contains genes that might already be in updated_data
    # or new genes to be added.
    if os.path.exists(PREDICTED_IEI_CSV):
        print(f"Loading predicted IEI data from {PREDICTED_IEI_CSV}...")
        with open(PREDICTED_IEI_CSV, 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            for i, row in enumerate(reader, start=1):
                gene = row['gene']
                
                # Infer rank from CSV order (1-based index)
                rank = i
                
                # Get probability from CSV, default to 'N/A' if missing or invalid
                probability = row.get('probability', 'N/A')
                try:
                    probability = float(probability)
                except ValueError:
                    pass # Keep as 'N/A' or original string if conversion fails

                # Update or add gene to updated_data
                if gene not in updated_data:
                    updated_data[gene] = {
                        "rank": rank,
                        "probability": probability,
                        "labels": []
                    }
                else:
                    # If gene already exists, update its rank and probability
                    updated_data[gene]["rank"] = rank
                    updated_data[gene]["probability"] = probability
                
                # Add "Predicted IEI" label if not already present
                if "Predicted IEI" not in updated_data[gene]["labels"]:
                    updated_data[gene]["labels"].append("Predicted IEI")
    else:
        print(f"Warning: {PREDICTED_IEI_CSV} not found. Skipping predicted IEI data loading.")


    # Helper function to add/update genes
    def add_label(gene_list, label, default_rank=0):
        for gene in gene_list:
            if gene not in updated_data:
                updated_data[gene] = {
                    "rank": default_rank,
                    "probability": 'N/A', # Default probability for newly added genes
                    "labels": []
                }
            
            if label not in updated_data[gene]["labels"]:
                updated_data[gene]["labels"].append(label)

    # Apply labels and add missing genes
    add_label(IUIS_2022, "2022 IUIS IEI")
    add_label(NON_IMMUNE, "Non-immune")
    add_label(NOVEL_2024, "Novel 2024 IUIS")

    save_data(updated_data)

if __name__ == "__main__":
    process_genes()
