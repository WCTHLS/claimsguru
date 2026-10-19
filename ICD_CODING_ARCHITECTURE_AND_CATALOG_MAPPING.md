# ICD-10 Clinical Coding Architecture, Incident Analysis & Catalog Mapping Reference

## 1. Executive Summary & Problem Context
In automated health insurance claim adjudication (especially for Indian TPAs like Medi Assist, Vidal Health, MDIndia, Paramount), diagnostic claims must strictly adhere to the official **IRDAI / WHO ICD-10 Master Catalog**.

This document captures:
1. The catalog files and index structure in the Claimsguru repository.
2. The root cause analysis of three benchmark production claims analyzed against Gemini / Medical Adjudicator standards.
3. The specific architectural bugs in `services/coding` causing diagnosis truncation, missing comorbidities, and incorrect code assignments.
4. A complete step-by-step remediation plan for the upcoming coding overhaul.

---

## 2. 3-Claim Production Benchmark Comparison (Our System vs Gemini / TPA Standards)

| Claim ID | Patient & Clinical Input | What Gemini / TPA Doctors Expect | What Our System Currently Produced in DB | Root Cause & Failure Mode |
| :--- | :--- | :--- | :--- | :--- |
| **`0108033e-c4b7-46ba-9add-9246769a71b3`** | **Amreen Azhar Shaikh**<br>• G3P1L1A1 39W 2D in Labour with Episiotomy<br>• Full-term Normal Vaginal Delivery (FTND)<br>• Single live male baby (wt: 2.8 kg) | • **Primary:** `O80.0` or `O80` (*Single spontaneous delivery*)<br>• **Secondary / Outcome:** `Z37.0` (*Single live birth*)<br>• **Gestation:** `Z3A.39` (*39 weeks gestation*)<br>• **Procedure:** `73.6` / `73.59` / `59400` (*Episiotomy & repair*) | `[ICD10] O80.9: Single spontaneous delivery, unspecified (conf: 0.99, primary: True)` | **Half correct, but truncated:** Primary code `O80.9` matched accurately, but **all secondary outcome & procedure codes (`Z37.0`, `Z3A.39`, `O70 / 73.6`) were discarded by `engine.py`!** |
| **`ea27eaa2-4f12-4d7e-af5d-c6cbb2caf701`** | **Mr. Sonaimuthu**<br>• Lower Oesophageal Hiatus Hernia<br>• Dysphagia (inability to swallow solid food)<br>• Vomiting of undigested food for 3 months<br>• CT: Dilation with subcarinal narrowing | • **Primary:** `K44.9` (*Diaphragmatic hernia without obstruction*) or `K44.0` (*with obstruction*)<br>• **Secondary:** `R13.10` / `R13` (*Dysphagia*)<br>• **Secondary:** `R11.10` / `R11` (*Vomiting*)<br>• **Secondary:** `K22.2` (*Oesophageal obstruction / stricture*) | `[ICD10] K44.0: Diaphragmatic hernia with obstruction, without gangrene (conf: 0.91, primary: True)` | **Primary valid, secondary lost:** `K44.0` is clinically valid due to CT documented subcarinal narrowing, but **symptoms `R13` (Dysphagia) and `R11` (Vomiting) were completely discarded by `engine.py`!** |
| **`3f6691db-7d7f-4fb2-b466-bf20fb012120`** | **Mrs. Kanakam Laxmi**<br>• Admitted via emergency for Bilateral Pneumonitis<br>• Comorbidities: Type 2 Diabetes Mellitus (T2DM)<br>• Systemic Hypertension (HTN) | • **Primary:** `J18.9` (*Pneumonia, unspecified*) or `J18.0` (*Bronchopneumonia*)<br>• **Comorbidity 1:** `E11.9` (*Type 2 diabetes mellitus*)<br>• **Comorbidity 2:** `I10` (*Essential / primary hypertension*) | `[ICD10] J68.0: Bronchitis and pneumonitis due to chemicals, gases, fumes and vapours (conf: 0.95, primary: True)` | **Completely broken:**<br>1. Matched toxic chemical inhalation (`J68.0`) instead of pneumonia (`J18.9`).<br>2. **Completely ignored Diabetes (`E11`) and Hypertension (`I10`)!** |

---

## 3. Deep-Dive: The 4 Core Architectural Bugs in the Coding Engine

### Bug 1: Multi-Diagnosis Truncation in `services/coding/app/engine.py`
In `services/coding/app/engine.py` (lines 869–905):
When the doctor writes a compound diagnosis line like:
`"BILATERAL PNEUMONITIS / TYPE 2 DM / HTN"`
The LLM extractor (`diagnosis_extractor.py`) **correctly parsed all three diagnoses**:
`['bilateral pneumonitis', 'type 2 diabetes mellitus', 'essential hypertension']`

And RAG search ran against the catalog for each term.
**The Fatal Flaw:**
```python
elif matches:
    top_tuple = matches[0]   # <--- HARDCODED TO ONLY TAKE THE 1ST TERM!
    code = top_tuple[0]      # Takes Pneumonitis
    codes.append(Code(...))  # Appends ONLY 1 code!
    
    # It takes matches[1] and matches[2] (Diabetes & Hypertension)
    # and treats them as ALTERNATIVE OPTIONS (other_matches) for Pneumonitis!
    for alt_rank, alt_tuple in enumerate(matches[1:3], start=1):
        raw_alts.append(...)
```
**Impact:**
- `engine.py` was hardcoded to only assign **one single code per field**.
- When multiple conditions exist, it appends the first term and shoves all comorbidities (Diabetes, Hypertension, Episiotomy) into `other_matches` (the UI dropdown of alternatives) instead of creating separate secondary `Code` objects.

---

### Bug 2: 3-Digit Category Codes (`I10`, `O80`, `R13`, `R11`) Missing from `icd10_meta.json`
- In WHO ICD-10, root master codes such as **`I10`** (*Essential hypertension*), **`O80`** (*Single spontaneous delivery*), **`R13`** (*Dysphagia*), and **`R11`** (*Vomiting*) have no 4th-character decimal subdivisions in standard WHO tables.
- When `icd10_to_csv.py` generated `icd10_meta.json`, it only indexed 4-character subclass codes and skipped 3-character root categories.
- **Impact:**
  - `I10` is missing from `icd10_meta.json`.
  - When the system searched for *"essential hypertension"*, the *only* code in the vector index with those words was **`O10.0`** (*Pre-existing essential hypertension complicating pregnancy, childbirth and the puerperium*).
  - Normal delivery `O80` was absent from the vector index, leaving only `O80.0` - `O80.9`.

---

### Bug 3: Medical Vocabulary Gap: "Pneumonitis" vs "Pneumonia"
- In clinical practice in India, doctors frequently write *"Bilateral pneumonitis"* on discharge summaries to describe acute infective interstitial or patchy lung infiltration.
- In ICD-10 WHO nomenclature:
  - Acute infective lung inflammation is categorized under **Pneumonia (`J18.9` / `J18.0`)**.
  - The literal word `"Pneumonitis"` in WHO ICD-10 only appears in:
    - **`J68.0`**: *Bronchitis and pneumonitis due to chemicals, gases, fumes and vapours*
    - **`J69.0`**: *Pneumonitis due to food and vomit (Aspiration pneumonitis)*
    - **`J67.9`**: *Hypersensitivity pneumonitis*
- **Impact:**
  - Because the LLM literally extracted `"bilateral pneumonitis"`, the RAG model looked for the word `"pneumonitis"` and matched **`J68.0`** (toxic chemical exposure) instead of **`J18.9`** (Pneumonia, unspecified).

---

### Bug 4: Secondary Outcome & Coding Guidelines Not Enforced
Under IRDAI / WHO coding rules for obstetrics:
- An admission for delivery requires:
  1. The delivery event code: `O80` / `O80.0`
  2. The outcome of delivery code: `Z37.0` (*Single live birth*)
  3. The completed weeks of gestation code: `Z3A.xx` (*e.g. Z3A.39*)
- The current system only searches for a primary disease code and does not invoke coding guidelines to attach mandatory paired outcome codes (`Z37.0`).

---

## 4. Repository Catalog & Index Inventory

| File Path | Type | Records / Size | Role & Purpose |
| :--- | :--- | :--- | :--- |
| `services/coding/app/rag_data/input/icd10.csv` | Full WHO Catalog CSV | 6.68 MB | Official WHO ICD-10 CSV containing all codes, parent categories, includes, and excludes. Extracted from `icd102019en.xml`. |
| `services/coding/app/rag_data/icd10_meta.json` | Active Index Metadata | 10,385 entries (3.65 MB) | The active metadata loaded into the RAG vector & lexical search. |
| `services/coding/app/rag_data/icd10_index.faiss` | Vector Index | 31.9 MB | Dense clinical embeddings generated using `pritamdeka/S-PubMedBert-MS-MARCO`. |
| `services/coding/app/rag_data/icd10_bm25.pkl` | Lexical Index | 2.50 MB | BM25 index for token and exact string matching. |
| `services/coding/app/icd10_codes.py` | Local Dictionary & Synonyms | 1,209 lines | Curated clinical mapping and cross-reference table. |
| `c:\Users\Admin\Downloads\icd10_output2.csv` | Master Spreadsheet | 6.13 MB | Comprehensive master export of the ICD-10 index table. |

---

## 5. How Indian TPAs (Medi Assist, Vidal Health) Operate

In real-world Indian health insurance operations:
1. **No Freeform Hallucinated Codes Allowed**:
   TPAs do not allow arbitrary or invented codes. Systems and adjudicators are bound to a dropdown / master database loaded with the IRDAI master list.
2. **Auto-NLP Suggestion + Medical Doctor Verification**:
   The TPA's system uses NLP to recommend the top 3 ICD-10 codes. An in-house Medical Adjudicator (MBBS/BAMS doctor) reviews the discharge summary on the left, inspects the auto-suggested code on the right, and approves or overrides it.
3. **Maternity Benefit Triggers**:
   Maternity benefit tracking and waiting period calculations are triggered strictly by `O80–O84`. Accurate coding is mandatory for correct financial settlement.

---

## 6. Architecture & Implementation Plan (To Be Executed in Dedicated Sprint)

### Step 1: Fix Multi-Diagnosis Loop in `services/coding/app/engine.py`
Modify `_extract_from_parsed_fields` so that when `narrative_terms` returns $N$ diagnoses:
- It iterates through **all extracted terms** ($1 \dots N$).
- It assigns Term 1 as `is_primary = True`.
- It assigns Terms $2 \dots N$ as `is_primary = False` (Secondary Diagnoses / Comorbidities).
- Each term gets its own `Code` object in `output.codes` and its own record in `MedicalCode`.

### Step 2: Enrich `icd10_meta.json` with 3-Digit Category Codes & Common Signs
Re-index `icd10_meta.json` to include 3-character root categories:
- `I10` — *Essential (primary) hypertension*
- `O80` — *Single spontaneous delivery*
- `R13` — *Dysphagia*
- `R11` — *Vomiting / Nausea*
- `Z37.0` — *Single live birth*
- `Z3A.xx` — *Weeks of gestation*

### Step 3: Enhance LLM System Prompt with Clinical Equivalency Standards
In `diagnosis_extractor.py`, add standard WHO terminology mappings:
- *"Bilateral pneumonitis"* (in absence of chemical exposure) $ightarrow$ `"pneumonia, unspecified"` (`J18.9`) or `"bronchopneumonia"` (`J18.0`).
- *"FTND with Episiotomy"* $ightarrow$ `"single spontaneous delivery"` (`O80.0`) and `"perineal laceration during delivery / episiotomy"` (`O70.0`).
- Ensure distinct entities on separate lines for compound diagnoses (e.g. `PNEUMONITIS / T2DM / HTN`).

### Step 4: Two-Pass RAG Verification (Reranker)
Implement the Retrieve-and-Rerank pattern:
1. Pass 1: LLM extracts normalized diagnostic concepts.
2. Pass 2: FAISS/BM25 retrieves top candidates from `icd10_meta.json`.
3. Pass 3: Candidate codes are sent back to the LLM to disambiguate and select the primary vs secondary codes strictly from the catalog list.
