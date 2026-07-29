# Technical Architecture: ClaimGPT Hybrid RAG & Medical Coding

This document explains the technical working, algorithms, and design choices of the ClaimGPT Medical Coding (ICD-10/CPT) RAG pipeline.

---

## 1. What does "Converts to vector via ST" mean?

**ST** stands for **SentenceTransformers**, a widely used Python framework for state-of-the-art text and image embeddings. 

When the user queries `"pregnancy in labour"`, the system must convert this free-text into a format that a mathematical vector index (like FAISS) can understand:
1. **Model Loading:** The system loads the clinical embedding model `pritamdeka/S-PubMedBert-MS-MARCO` (fine-tuned specifically for biomedical and clinical semantic mapping).
   * *Code Reference:* [icd10_rag.py:L463-480](file:///c:/Project/ClaimGPT-feature/services/coding/app/icd10_rag.py#L463-L480) (`_load_model()`).
2. **Encoding (Vector Conversion):** The SentenceTransformer takes the input string `"pregnancy in labour"` and processes it through its BERT layers to output a **768-dimensional floating-point vector** (a list of 768 decimal numbers, e.g. `[0.1245, -0.0987, ..., 0.8123]`).
   * *Code Reference:* [icd10_rag.py:L1005](file:///c:/Project/ClaimGPT-feature/services/coding/app/icd10_rag.py#L1005) (`model.encode([query])`).
3. **Semantic Space:** This 768-dimensional vector represents the *conceptual meaning* of the phrase. Phrases with similar clinical meanings (such as `"childbirth"`, `"delivery"`, or `"active labor"`) will map to vectors that are physically close to each other in this high-dimensional mathematical space, even if they share zero matching words.

---

## 2. Step-by-Step Query Execution Flow

When a clean diagnosis term like `"pregnancy in labour"` is processed, it runs through the following pipeline:

### Step 1: Dense Retrieval (Vector Search)
* **What happens:** The query vector is searched against the pre-computed embeddings of all 12,475+ ICD-10 chapters using a **FAISS** index.
* **Code Reference:** [icd10_rag.py:L1000-1012](file:///c:/Project/ClaimGPT-feature/services/coding/app/icd10_rag.py#L1000-L1012) (`_dense_rank()`)
* **Key Operation:**
  ```python
  scores, indices = faiss_index.search(query_vec, min(top_k, faiss_index.ntotal))
  ```

### Step 2: Sparse Retrieval (Lexical Keyword Match)
* **What happens:** Simultaneously, the query is tokenized, and a **BM25** (Best Matching 25) search is run to find exact matching words in the ICD-10 description catalog.
* **Code Reference:** [icd10_rag.py:L1015-1029](file:///c:/Project/ClaimGPT-feature/services/coding/app/icd10_rag.py#L1015-L1029) (`_bm25_rank()`)
* **Key Operation:**
  ```python
  tokens = _tokenize(query)
  scores = bm25.get_scores(tokens)
  ```

### Step 3: Reciprocal Rank Fusion (RRF)
* **What happens:** The absolute scores from FAISS (cosine similarity: `0` to `1`) and BM25 (frequency scoring: `0` to `30+`) cannot be directly compared. The system uses RRF to combine their ranks (positions in the results lists) using a standard constant $k=60$:
  $$\text{RRF Score}(doc) = \sum_{m \in \{BM25, FAISS\}} \frac{1}{k + Rank_m(doc)}$$
* **Code Reference:** [icd10_rag.py:L1032-1048](file:///c:/Project/ClaimGPT-feature/services/coding/app/icd10_rag.py#L1032-L1048) (`_rrf_fuse()`)
* **Key Operation:**
  ```python
  for ranking in rankings:
      for rank, (idx, _) in enumerate(ranking):
          fused[idx] = fused.get(idx, 0.0) + 1.0 / (k + rank + 1)
  ```

### Step 4: Cross-Encoder Reranking (Pairwise Comparison)
* **What happens:** RRF yields the top 15 candidates. Because the bi-encoder (PubMedBERT) encodes the query and candidates independently, it misses fine-grained word interactions. The system pairs the query with each candidate description and scores them using a **Cross-Encoder Comparator** (`MiniLM-L-6-v2`) which evaluates query and description together with full attention.
* **Code Reference:** [icd10_rag.py:L1421-1480](file:///c:/Project/ClaimGPT-feature/services/coding/app/icd10_rag.py#L1421-L1480) (`_try_crossencoder_rerank()`)
* **Key Operation:**
  ```python
  scores = _crossencoder_model.predict(pairs, show_progress_bar=False)
  ```

### Step 5: Output Mapping & Persistence
* **What happens:** The codes are re-sorted based on Cross-Encoder relevance. The highest scoring code is marked as `is_primary=True` and saved to the database.
* **Code Reference:** [main.py:L283-301](file:///c:/Project/ClaimGPT-feature/services/coding/app/main.py#L283-L301) (`run_coding()`).

---

## 3. Why are we using this approach?

1. **Semantic Generalization:** Normal SQL or Elasticsearch queries fail when the doctor writes a description slightly differently (e.g. `"active labor"` vs `"childbirth"`). Vector search generalizes across clinical terminology.
2. **Lexical Safeguard:** Vector search can sometimes hallucinate semantically similar but incorrect codes. BM25 guarantees that if a specific term (like an exact drug abbreviation or code number) appears, it is retrieved.
3. **RRF Rank Fusion:** RRF is parameter-free and extremely robust; it merges semantic and keyword rankings perfectly without needing complex score calibration.
4. **Cross-Encoder Precision:** By comparing query and description pairwise, it eliminates false positives and ensures the primary diagnostic code is clinically accurate.
