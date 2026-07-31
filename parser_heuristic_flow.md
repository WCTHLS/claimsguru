# Technical Architecture: Heuristic Parser Flow (Without LLM)

This document explains the technical working, algorithms, and geometric rules used by the ClaimGPT Parser V2 **Heuristic Layer** to detect expense tables, parse rows, and identify the boundaries (start and end) of a table without using an LLM.

---

## 1. How Expense Tables are Detected

When no LLM is configured, the system uses geometric coordinates and keyword density filters to locate and classify expense tables.

### Step A: Finding the Table Area (Geometry)
* **Code Reference:** [detect_tables_by_grid in layout_analyzer.py:L71](file:///c:/Project/ClaimGPT-feature/services/parser/app/layout_analyzer.py#L71)
1. **Row Clustering:** The system groups text tokens vertically using a vertical center tolerance (default: 6.0px).
2. **Column Clustering:** It clusters the horizontal centers (`x0, x1`) of cells. If the vertical rows contain at least 2 or more horizontal clusters, the system marks the area as a tabular grid region.

### Step B: Classifying as an Expense Table
* **Code Reference:** [normalize_tables in schema_normalizer.py:L255-395](file:///c:/Project/ClaimGPT-feature/services/parser_v2/schema_normalizer.py#L255-L395)
1. **Medical Exclusions:** It automatically ignores tables containing keywords related to drug doses (`medications`), vital signs (`vitals`), or lab metrics (`lab_results`).
2. **Keyword Density Filter:** If the table contains at least one row matching billing keywords (such as `room charges`, `nursing`, `surgery`, `medicine`, `total`, `payable`) AND contains a numeric amount in the same row, it is classified as an **Expense Table**.

---

## 2. How the Start of the Table is Detected

* **Code Reference:** [schema_normalizer.py:L283-330](file:///c:/Project/ClaimGPT-feature/services/parser_v2/schema_normalizer.py#L283-L330)

1. **Header Scanning:** The parser scans the first 20 rows of the table to find a row containing at least 2 billing header terms (e.g., `description`, `qty`, `rate`, `total`, `amount`).
2. **Column Mapping:** Once found, the parser maps the exact column positions:
   * Description Column (e.g. Column index `0`)
   * Quantity Column (e.g. Column index `2`)
   * Net Payable Column (e.g. Column index `4`)
3. **Data Start:** The parser starts parsing actual data rows **immediately after this header row** (`rows_list[1:]`).

---

## 3. How Rows are Detected and Parsed

* **Code Reference:** [schema_normalizer.py:L472-520](file:///c:/Project/ClaimGPT-feature/services/parser_v2/schema_normalizer.py#L472-L520)

For each row starting from the data line:

1. **Numeric Column Priority:** The parser reads the columns from right-to-left to locate the cost. It checks columns matching `payable`, `gross`, or `rate` first. If no headers are present, it falls back to the absolute right-most numeric cell.
2. **Continuation Row Detection (Multi-line descriptions):**
   * Sometimes, a description spans multiple rows (e.g. Row 1: `"DELIVERY CHARGES"`, Row 2: `"INCLUDING EPISIOTOMY"`).
   * **The Rule:** If a row contains **no numbers**, is not a serial number, and is not a summary footer, the parser treats it as a continuation row. It appends its text directly to the description of the previous item instead of creating a new row.
   * *Code Reference:* [schema_normalizer.py:L482-484](file:///c:/Project/ClaimGPT-feature/services/parser_v2/schema_normalizer.py#L482-L484)
3. **Heuristic Category Assignment:** Once description and amount are extracted, it matches the description text against a keyword array to set the category (e.g., `"nursing"` $\rightarrow$ `"Nursing"`, `"consultation"` $\rightarrow$ `"Consultation"`). If no keywords match, it assigns the default category **`"Miscellaneous"`**.

---

## 4. How the End of the Table is Detected

The parser identifies that it has reached the end of the line-item table using two rules:

1. **Blacklist Total/Summary Filter:**
   * In medical bills, the bottom of the table contains calculations like sub-totals, discounts, tax, and net payable.
   * **The Rule:** The parser matches the text against a summary blacklist:
     `"total bill"`, `"total claimed"`, `"grand total"`, `"less:"`, `"discount"`, `"advance"`, `"amount payable"`
   * If a row matches these terms, it is marked as a footer/summary and **skipped**. This indicates that the itemized section of the table has ended.
   * *Code Reference:* [schema_normalizer.py:L480 & L553](file:///c:/Project/ClaimGPT-feature/services/parser_v2/schema_normalizer.py#L480)
2. **Physical Coordinates:** When the list of rows inside the layout box bounds is exhausted, the loop terminates.
