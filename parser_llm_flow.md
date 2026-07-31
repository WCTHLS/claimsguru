# Technical Architecture: Parser LLM Semantic Extraction Flow

This document explains the technical working, inputs, prompts, and output formats of the ClaimGPT Parser V2 **LLM-Based Semantic Extraction Layer**.

---

## 1. Role of the LLM in Parsing

While geometry rules are used as a fallback, the **Primary Layer** of the Parser V2 is fully dynamic. It sends reconstructed layout regions to an LLM (such as GPT-4o-mini via OpenRouter, or Gemini Flash) to:
1. **Differentiate tables by context:** e.g., distinguishing an *expense/billing table* from *medication instructions* or *laboratory test values*.
2. **Parse unstructured/irregular text:** e.g., extracting daily charges that do not align to a neat grid.
3. **Normalize categories:** Automatically mapping free-text descriptions into standard medical claim categories (like mapping `"Episiotomy Charges"` to `"Labour / Delivery"`).

---

## 2. What Data is Sent to the LLM?

To protect patient privacy, the system runs a **redaction filter** on the text to strip out PII (Patient-Identifying Information) and PHI (Protected Health Information) before sending it to an external API.

The LLM receives a payload containing three components:
1. **Region Type Hint:** What the layout detector thinks the region is (e.g. `expense_table` or `patient_form`).
2. **Tabular Row Preview (`table_hint`):** Reconstructed grid cell lines formatted as rows separated by pipes:
   ```text
   row 1: DESCRIPTION | AMOUNT
   row 2: DELIVERY CHARGES | 16500
   row 3: LABOUR ROOM CHARGES | 2000
   ```
3. **Truncated Document Text:** The plain OCR characters in that layout region.

---

## 3. The LLM Prompt (The Instructions)

* **Code Reference:** [_build_semantic_prompt in semantic_backends.py:L620](file:///c:/Project/ClaimGPT-feature/services/parser_v2/semantic_backends.py#L620)

The prompt forces the LLM to output a strict JSON structure. Here is a summary of the prompt instructions:
1. **Strict JSON Schema:** Output *only* JSON matching the required fields and tables.
2. **Exact Category Names:** Map every single item row to one of these exact categories:
   * `"Room Rent"`, `"Labour / Delivery"`, `"ICU"`, `"Nursing"`, `"Surgery / OT"`, `"Consultation"`, `"Pharmacy"`, `"Injection"`, `"Tablet"`, `"Laboratory"`, `"Radiology"`, `"Oxygen"`, `"Consumables"`, `"Anaesthesia"`, `"Supplies"`, `"Miscellaneous"`.
3. **No Collapsing:** Extract each row as a separate entry (e.g., Daily charges must be kept separate day-by-day). Do not sum the table up into a single total row.
4. **Exclusions:** Never extract summary rows (like "Grand Total", "Less: Deductions", "Net Payable") as expense lines.

---

## 4. What does the LLM Return? (JSON Output Schema)

The LLM returns a structured JSON payload. Below is the exact shape expected by the parser:

```json
{
  "region_type": "expense_table",
  "table_kind": "expenses",
  "confidence": 0.95,
  "notes": "Extracted delivery billing items successfully.",
  "fields": [
    {
      "canonical_field": "doctor_name",
      "value": "SUNITA AJAY BURANDE",
      "confidence": 0.9
    }
  ],
  "tables": [
    {
      "table_kind": "expenses",
      "headers": ["category", "description", "amount"],
      "rows": [
        {
          "category": "Labour / Delivery",
          "description": "DELIVERY CHARGES",
          "amount": "16500"
        },
        {
          "category": "Room Rent",
          "description": "LABOUR ROOM CHARGES",
          "amount": "2000"
        },
        {
          "category": "Nursing",
          "description": "NURSING CHARGES",
          "amount": "500"
        }
      ],
      "confidence": 0.95
    }
  ]
}
```

---

## 5. Post-Processing & DB Sync

Once the LLM returns this JSON payload:
1. The parser loops through `"tables"` and `"rows"`.
2. It cleans the `"amount"` string, converting it to a float value.
3. It persists the list of expense rows directly into the PostgreSQL `ParsedExpenseRow` table.
4. If the LLM call fails, the system immediately catches the error and executes the local **Heuristic Parser** (as described in `technical_rag_flow.md`), ensuring zero down-time.
