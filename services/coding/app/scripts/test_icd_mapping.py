"""
Test ICD mapping from parser debug artifacts.

Usage:
    python -m services.coding.app.scripts.test_icd_mapping --file tmp/parser_debug/<file>.json

Passes diagnosis + clinical_diagnosis_summary from parsed fields into the LLM
to refine the diagnosis query, then maps refined queries to ICD-10 using RAG.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any


def ensure_env():
    """Load .env and ensure Azure OpenAI / OpenRouter env vars are ready."""
    try:
        from dotenv import load_dotenv
        load_dotenv()
        # Also check root .env if running from subdirectory
        for env_path in (Path(".env"), Path("claimsguru/.env"), Path("../.env")):
            if env_path.exists():
                load_dotenv(env_path)
    except Exception:
        pass

    try:
        from services.parser.app.config import settings as parser_settings
        if getattr(parser_settings, "openrouter_api_key", None):
            os.environ.setdefault("CHAT_OPENROUTER_API_KEY", str(parser_settings.openrouter_api_key))
        if getattr(parser_settings, "openrouter_url", None):
            os.environ.setdefault("CHAT_OPENROUTER_URL", str(parser_settings.openrouter_url))
        if getattr(parser_settings, "openrouter_model", None):
            os.environ.setdefault("CHAT_OPENROUTER_MODEL", str(parser_settings.openrouter_model))
    except Exception:
        pass


def find_debug_file(provided: str | None) -> Path | None:
    if provided:
        p = Path(provided)
        if p.exists():
            return p
        for alt in (Path("claimsguru") / provided, Path("tmp/parser_debug") / provided, Path("claimsguru/tmp/parser_debug") / provided):
            if alt.exists():
                return alt
        return None

    # Search common directories and prioritize high-value files
    search_dirs = [Path("tmp/parser_debug"), Path("claimsguru/tmp/parser_debug")]
    for d in search_dirs:
        if not d.exists():
            continue
        # Check for normalized_fields.json first
        norm = d / "normalized_fields.json"
        if norm.exists():
            return norm
        canonical = list(d.glob("*canonical_claim.json"))
        if canonical:
            return canonical[0]
        # Check full parser debug dumps
        full_dumps = [f for f in d.glob("*.json") if "_" in f.name and not f.name.startswith(("10_", "11_"))]
        if full_dumps:
            return full_dumps[0]
        files = sorted(d.glob("*.json"))
        if files:
            return files[0]
    return None


def extract_diagnosis_fields(debug_json: Path) -> tuple[str | None, str | None]:
    """Extract (diagnosis, clinical_diagnosis_summary) from debug artifact."""
    data = json.loads(debug_json.read_text(encoding="utf-8"))

    diag_val: str | None = None
    summary_val: str | None = None

    def _check_field(k: str, v: Any):
        nonlocal diag_val, summary_val
        if not isinstance(v, str) or not v.strip():
            return
        clean = v.strip()
        key_lower = k.lower().strip()
        if key_lower in ("clinical_diagnosis_summary", "clinical_summary"):
            if not summary_val and clean.lower() not in ("none", "null", "n/a"):
                summary_val = clean
        elif key_lower in ("diagnosis", "primary_diagnosis", "canonical_diagnosis", "provisional_diagnosis"):
            if not diag_val and clean.lower() not in ("none", "null", "n/a"):
                diag_val = clean

    def _scan_list(items: list[Any]):
        for item in items:
            if not isinstance(item, dict):
                continue
            fname = (item.get("field_name") or item.get("field") or item.get("canonical_field") or "").strip()
            fval = item.get("field_value") or item.get("value")
            if fname and fval:
                _check_field(str(fname), str(fval))

    # Case 1: Root is a list of field dicts (e.g. normalized_fields.json)
    if isinstance(data, list):
        _scan_list(data)
        return diag_val, summary_val

    # Case 2: Root is a dict
    if isinstance(data, dict):
        # 1. Check nested field lists
        for list_key in ("fields", "normalized_fields", "parsed_fields"):
            if isinstance(data.get(list_key), list):
                _scan_list(data[list_key])

        # 2. Check canonical_claim
        cc = data.get("canonical_claim")
        if isinstance(cc, dict):
            diag_block = cc.get("diagnosis")
            if isinstance(diag_block, dict):
                for k in ("primary", "secondary", "diagnosis"):
                    _check_field("diagnosis", diag_block.get(k))
            elif isinstance(diag_block, str):
                _check_field("diagnosis", diag_block)

        # 3. Check direct top-level fields
        for k, v in data.items():
            _check_field(k, v)

    return diag_val, summary_val


def main(argv=None):
    p = argparse.ArgumentParser(description="Test ICD mapping from parsed fields using LLM query refinement")
    p.add_argument("--file", "-f", help="Path to parser debug JSON")
    args = p.parse_args(argv)

    dbg = find_debug_file(args.file)
    if not dbg:
        print("No debug JSON found in tmp/parser_debug/; provide --file path")
        return 2

    print("=" * 70)
    print("Using debug file:", dbg)
    print("=" * 70)

    # Ensure OpenRouter / Azure OpenAI env is set
    ensure_env()

    # Import extractor + rag after env is set
    try:
        from services.coding.app.diagnosis_extractor import (
            extract_diagnosis_keywords,
            needs_extraction,
        )
        from services.coding.app import icd10_rag
    except Exception as e:
        print("Failed to import extractor or rag module:", e)
        return 1

    diag_val, summary_val = extract_diagnosis_fields(dbg)

    print("\n[EXTRACTED PARSED FIELDS]")
    print(f"  Documented Diagnosis:       {diag_val or '(none)'}")
    print(f"  Clinical Summary Context:   {summary_val[:120] + '...' if summary_val and len(summary_val) > 120 else (summary_val or '(none)')}")

    # Build refined query input for LLM
    if diag_val and summary_val:
        input_for_llm = f"Documented Diagnosis: {diag_val}\nClinical Summary Context: {summary_val}"
    elif diag_val:
        input_for_llm = f"Documented Diagnosis: {diag_val}"
    elif summary_val:
        input_for_llm = f"Clinical Summary Context: {summary_val}"
    else:
        print("\nNo diagnosis or clinical summary fields found in debug file.")
        return 1

    print("\n[INPUT TO LLM FOR DIAGNOSIS REFINEMENT]")
    print(input_for_llm)
    print("-" * 70)

    # Refine diagnosis keywords via LLM
    terms = extract_diagnosis_keywords(input_for_llm)
    if not terms and diag_val:
        terms = [diag_val]

    print("\n[REFINED DIAGNOSIS TERMS FROM LLM]")
    for i, t in enumerate(terms, 1):
        print(f"  {i}. {t}")

    print("\n[ICD-10 RAG MAPPING RESULTS]")
    for t in terms:
        hits = icd10_rag.search_icd10_rag(t, max_results=5)
        print(f"\nQuery: '{t}'")
        if not hits:
            print("  (no matches found)")
            continue
        for code, desc, cat, score in hits:
            print(f"  -> {code:<8} {desc} (category: {cat}, score: {score:.3f})")

    print("\n" + "=" * 70)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
