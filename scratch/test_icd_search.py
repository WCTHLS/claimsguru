import os
import sys
from dotenv import load_dotenv

# Ensure project root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Configure logging
import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

load_dotenv()

# We need to set CUDA / CPU envs to prevent torch issues
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
os.environ['OMP_NUM_THREADS'] = '1'

try:
    from services.coding.app.icd10_rag import search_icd10_rag, is_rag_available, lookup_icd10_rag
    
    print("Checking RAG availability...")
    if not is_rag_available():
        # Try to preload or build
        from services.coding.app.icd10_rag import build_index
        print("Index not available, building...")
        build_index()
    
    print("RAG Available:", is_rag_available())
    
    queries = ["typhoid fever", "typhoid", "Salmonella typhi"]
    for q in queries:
        print(f"\n--- RAG Search for '{q}' ---")
        hits = search_icd10_rag(q, max_results=5)
        for code, desc, cat, score in hits:
            print(f"Code: {code} | Description: {desc} | Category: {cat} | Score: {score}")

    print("\nDirect lookup of A01.0:")
    info = lookup_icd10_rag("A01.0")
    print(info)
    info_parent = lookup_icd10_rag("A01")
    print(info_parent)

except Exception as e:
    import traceback
    traceback.print_exc()
