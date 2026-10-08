from __future__ import annotations

import json
import logging
import os
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional

import httpx
from PIL import Image

from services.parser.app.config import settings

from .semantic_models import (
    SemanticFieldOutput,
    SemanticRegionOutput,
    SemanticSourceToken,
    SemanticTableOutput,
    SemanticTableRowOutput,
)

logger = logging.getLogger("parser-debug")


def _get_gemini_config() -> dict:
    """Read Gemini API config from environment / settings."""
    api_key = (
        os.getenv("GEMINI_API_KEY", "")
        or getattr(settings, "gemini_api_key", "")
    )
    model = (
        os.getenv("GEMINI_MODEL", "gemini-2.0-flash-lite")
        or getattr(settings, "gemini_model", "gemini-2.0-flash-lite")
    )
    return {"api_key": api_key, "model": model}


def _call_gemini(prompt: str, timeout: int = 60) -> str | None:
    """
    Direct Gemini REST call used as an immediate fallback when OpenRouter fails.
    Returns the response text, or None on any failure.
    """
    cfg = _get_gemini_config()
    if not cfg["api_key"]:
        logger.warning("[GEMINI_FALLBACK] GEMINI_API_KEY not set — cannot use Gemini fallback")
        return None

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{cfg['model']}:generateContent?key={cfg['api_key']}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 4096, "temperature": 0.7},
    }
    try:
        resp = httpx.post(url, json=payload, timeout=timeout)
        if resp.status_code == 429:
            logger.error("[GEMINI_FALLBACK] Gemini rate limited (429)")
            return None
        if resp.status_code != 200:
            logger.error("[GEMINI_FALLBACK] Gemini HTTP %s: %s", resp.status_code, resp.text[:200])
            return None
        data = resp.json()
        candidates = data.get("candidates") or []
        if candidates:
            parts = (candidates[0].get("content") or {}).get("parts") or []
            if parts:
                return parts[0].get("text")
        logger.warning("[GEMINI_FALLBACK] Gemini returned no content: %s", data)
        save_llm_debug_dump("gemini_direct", prompt, data, cfg["model"])
        return None
    except Exception as exc:
        logger.error("[GEMINI_FALLBACK] Gemini call failed: %s", exc)
        save_llm_debug_dump("gemini_direct_error", prompt, str(exc), cfg["model"])
        return None


def save_llm_debug_dump(
    call_type: str,
    prompt: Any,
    response: Any,
    model: str = "",
    parsed_result: Any = None,
) -> None:
    """Save LLM input prompt and raw output to tmp/llm_logs for inspection."""
    try:
        import time
        from pathlib import Path
        
        candidate_paths = [
            Path("/app/tmp/llm_logs"),
            Path("tmp/llm_logs"),
            Path(os.getcwd()) / "tmp" / "llm_logs"
        ]
        target_dir = None
        for cp in candidate_paths:
            try:
                cp.mkdir(parents=True, exist_ok=True)
                target_dir = cp
                break
            except Exception:
                continue
        if not target_dir:
            return

        ts_str = time.strftime("%Y%m%d_%H%M%S")
        millis = int(time.time() * 1000) % 1000
        safe_type = re.sub(r"[^\w\-]", "_", str(call_type))
        safe_model = re.sub(r"[^\w\-]", "_", str(model or "model"))
        filename = f"{ts_str}_{millis:03d}_{safe_type}_{safe_model}.json"
        log_path = target_dir / filename

        dump_data = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "call_type": call_type,
            "model": model,
            "input_prompt": prompt,
            "raw_output": response,
            "parsed_result": parsed_result,
        }
        with open(log_path, "w", encoding="utf-8") as f:
            json.dump(dump_data, f, indent=2, ensure_ascii=False)
        logger.info(f"[LLM_DEBUG_LOG] Stored LLM call dump at {log_path}")
    except Exception as e:
        logger.warning(f"Could not save LLM debug dump: {e}")


def _parse_json_dict(raw_text: str) -> dict[str, Any] | None:
    if not raw_text:
        return None
    cleaned = _strip_json_code_fences(raw_text)
    if not cleaned:
        return None
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end < 0 or end <= start:
        return None
    try:
        data = json.loads(cleaned[start : end + 1])
        return data if isinstance(data, dict) else None
    except Exception:
        return None


DOCUMENT_ENTITY_PROMPT_TEMPLATE = """You are a professional medical insurance document understanding AI.
Analyze the following medical claim document text and extract structured clinical, patient, and insurance policy entities.

Return STRICT JSON only adhering exactly to this schema:
{
  "patient_name": "Full name of the patient (e.g. 'SONAIMUTHU', 'Keerthi Ajay Kumar', 'KANAKAM LAXMI'). Exclude prefixes like Mr/Mrs/Ms/Dr if present.",
  "patient_age": "Patient age as string (e.g. '71 Years', '34 Years', '58 Years')",
  "patient_gender": "'Male' or 'Female'",
  "hospital_name": "Full official hospital name (e.g. 'SANGEETHA HOSPITAL', 'APOLLO HOSPITALS', 'Balaji Hospital')",
  "doctor_name": "Treating / primary consultant doctor name (e.g. 'Dr. Anand', 'Dr. Niraj Patil', 'Dr. K. Venkateshwar Rao')",
  "admission_date": "Date of admission in DD/MM/YYYY or DD-MM-YYYY format",
  "discharge_date": "Date of discharge in DD/MM/YYYY or DD-MM-YYYY format",
  "diagnosis": "Primary clinical diagnosis / condition (e.g. 'LOWER OESOPHAGEAL HIATUS HERNIA', 'BILATERAL PNEUMONITIS / TYPE 2 DM / HTN')",
  "clinical_diagnosis_summary": "Comprehensive clinical narrative containing the patient's presenting complaint, history of present illness, relevant past medical history and comorbidities, confirmed/provisional diagnoses, significant investigation findings, procedures/interventions, treatment provided, and condition at discharge. Preserve the exact clinical diagnoses, anatomical site, laterality, acuity, severity, complications, and other details relevant for ICD coding. Return null if not present.",
  "insurance_company": "Full official name of the insurance company / payer if explicitly mentioned (e.g. 'Star Health and Allied Insurance', 'Care Health Insurance', 'HDFC ERGO', 'United India Insurance'). Return null if not explicitly mentioned in the text.",
  "tpa_name": "Full official name of the Third Party Administrator (TPA) if explicitly mentioned (e.g. 'Family Health Plan (TPA) Ltd.', 'Medi Assist Insurance TPA', 'Vidal Health TPA', 'MDIndia Health Insurance TPA'). Return null if no TPA is mentioned.",
  "policy_number": "Insurance policy number if explicitly present (do NOT use UHID, MRNO, or IPNO). Return null if not present.",
  "member_id": "Member ID / Health Card ID / Beneficiary ID if explicitly present (e.g. 'MEM-19943140'). Return null if not present.",
  "sum_insured": "Total sum insured or policy coverage limit amount as numeric string (e.g. '500000', '1000000'). Return null if not present.",
  "policy_start_date": "Policy inception / start date in DD/MM/YYYY or DD-MM-YYYY format if explicitly present. Return null if not present.",
  "policy_end_date": "Policy expiry / end date in DD/MM/YYYY or DD-MM-YYYY format if explicitly present. Return null if not present.",
  "claimed_total": "Final billed total amount as number or string if an invoice/bill is present (null if this is only a discharge summary with no bills)"
}

STRICT RULES (Zero Hallucination):
1. ZERO HALLUCINATION: If a field is not explicitly present in the document text, you MUST return null for that field. Never guess, infer, or invent placeholder values like 'N/A', 'None', 'Unknown', or random company names.
2. For insurance_company vs tpa_name: Do not confuse insurer and TPA. If text explicitly states 'TPA: Family Health Plan (TPA) Ltd.', extract that into tpa_name. If an insurer is explicitly named, extract it into insurance_company.
3. For discharge summaries with NO bills, claimed_total MUST be null.
4. For patient_name: extract the genuine patient name, even if listed next to UHID/MRNO or printed as a single name.

Document Text:
"""

SEMANTIC_REGION_TYPES = {
    "patient_info",
    "hospitalization_info",
    "insurance_info",
    "diagnosis",
    "expense_table",
    "bill_table",
    "table",
    "generic_table",
    "medication_table",
    "lab_table",
    "vitals_table",
    "prescription",
    "text",
    "title",
    "paragraph",
}

SEMANTIC_TABLE_KINDS = {
    "expenses",
    "medications",
    "lab_results",
    "vitals",
    "diagnoses",
    "generic_table",
}


@dataclass
class SemanticRequest:
    region_id: str
    region_type: str
    page: int | None
    document_id: str | None
    claim_id: str | None
    text: str
    tokens: list[dict[str, Any]]
    table_cells: list[list[dict[str, Any]]] | None = None
    image: Image.Image | None = None
    bbox: list[float] | None = None


class SemanticBackend(ABC):
    name: str = "semantic-backend"

    @abstractmethod
    def available(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def analyze(self, request: SemanticRequest) -> dict[str, Any] | None:
        raise NotImplementedError

    def extract_document_entities(self, text: str) -> dict[str, Any] | None:
        return None

    @staticmethod
    def _source_tokens(request: SemanticRequest) -> list[SemanticSourceToken]:
        return [SemanticSourceToken(**token) for token in request.tokens if isinstance(token, dict)]


class _TransformersSemanticBackend(SemanticBackend):
    model_name: str
    processor_name: str | None
    model_class_candidates: tuple[str, ...] = ()
    processor_class_candidates: tuple[str, ...] = ()

    def __init__(self, model_name: str | None = None, processor_name: str | None = None):
        self.model_name = model_name or getattr(self, "model_name", None)
        self.processor_name = processor_name or getattr(self, "processor_name", None) or self.model_name
        self._model = None
        self._processor = None
        self._device = "cpu"

    def available(self) -> bool:
        if not self.model_name:
            return False
        try:
            self._ensure_loaded()
            return self._model is not None and self._processor is not None
        except Exception as exc:
            logger.debug("%s unavailable: %s", self.name, exc)
            return False

    def _ensure_loaded(self) -> None:
        if self._model is not None and self._processor is not None:
            return

        if not self.model_name:
            raise RuntimeError("No model configured")

        try:
            import torch
            from transformers import AutoProcessor

            self._device = "cuda" if torch.cuda.is_available() else "cpu"
            self._processor = AutoProcessor.from_pretrained(self.processor_name)

            last_exc: Exception | None = None
            for class_name in self.model_class_candidates:
                try:
                    import transformers

                    model_cls = getattr(transformers, class_name, None)
                    if model_cls is None:
                        continue
                    self._model = model_cls.from_pretrained(self.model_name)
                    self._model.eval()
                    if self._device == "cuda":
                        self._model.to("cuda")
                    return
                except Exception as exc:  # pragma: no cover - backend availability is runtime specific
                    last_exc = exc
                    self._model = None
                    continue

            if last_exc:
                raise last_exc
            raise RuntimeError(f"No supported transformers model class found for {self.name}")
        except Exception as exc:
            raise RuntimeError(f"Unable to load {self.name}: {exc}") from exc

    def _build_prompt(self, request: SemanticRequest) -> str:
        return _build_semantic_prompt(request)

    def _decode_output(self, output: Any) -> str:
        if isinstance(output, str):
            return output
        if hasattr(output, "tolist"):
            return str(output.tolist())
        return str(output)

    def analyze(self, request: SemanticRequest) -> dict[str, Any] | None:
        self._ensure_loaded()
        prompt = self._build_prompt(request)

        try:
            import torch

            inputs_kwargs: dict[str, Any] = {"return_tensors": "pt"}
            if request.image is not None:
                inputs = self._processor(images=request.image, text=prompt, **inputs_kwargs)
            else:
                inputs = self._processor(text=prompt, **inputs_kwargs)

            if hasattr(inputs, "to"):
                inputs = inputs.to(self._device)
            elif isinstance(inputs, dict):
                inputs = {k: (v.to(self._device) if hasattr(v, "to") else v) for k, v in inputs.items()}

            with torch.inference_mode():
                generated = self._model.generate(**inputs, max_new_tokens=512)

            decoded = self._processor.batch_decode(generated, skip_special_tokens=True)[0]
            return _parse_semantic_response(decoded, request, self.name)
        except Exception as exc:
            logger.debug("%s analysis failed: %s", self.name, exc)
            return None


class Qwen2VLBackend(_TransformersSemanticBackend):
    name = "qwen2-vl"
    model_class_candidates = ("Qwen2VLForConditionalGeneration", "AutoModelForImageTextToText")
    processor_class_candidates = ("AutoProcessor",)


class Florence2Backend(_TransformersSemanticBackend):
    name = "florence-2"
    model_class_candidates = ("Florence2ForConditionalGeneration", "AutoModelForCausalLM")
    processor_class_candidates = ("AutoProcessor",)


class DonutBackend(_TransformersSemanticBackend):
    name = "donut"
    model_class_candidates = ("VisionEncoderDecoderModel",)
    processor_class_candidates = ("AutoProcessor",)


class LayoutLMv3Backend(SemanticBackend):
    name = "layoutlmv3"

    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or settings.layoutlm_model
        self._available = bool(
            self.model_name
            and (
                os.path.exists(self.model_name)
                or os.getenv("PARSER_ENABLE_LAYOUTLM", "").lower() in {"1", "true", "yes"}
                or os.path.exists(os.path.join(os.getcwd(), self.model_name))
            )
        )

    def available(self) -> bool:
        return self._available

    def analyze(self, request: SemanticRequest) -> dict[str, Any] | None:
        # LayoutLMv3 is a strong token classifier when fine-tuned. In this repo we
        # use it as a region-level semantic signal, not as a regex substitute.
        # If a fine-tuned checkpoint is configured, we can let a local semantic LLM
        # interpret the region using LayoutLMv3-derived layout cues.
        if not self.available():
            return None
        return _layoutlm_region_summary(request, self.name)


class OllamaSemanticBackend(SemanticBackend):
    name = "ollama-semantic"

    def __init__(self, url: str | None = None, model: str | None = None, timeout_seconds: int | None = None):
        self.url = _resolve_ollama_url(url or settings.semantic_llm_url or settings.llm_url)
        self.model = model or settings.semantic_llm_model or _discover_ollama_model(self.url) or settings.llm_model or "qwen2.5:1.5b"
        self.timeout_seconds = timeout_seconds or settings.semantic_llm_timeout_seconds or settings.llm_timeout_seconds

    def available(self) -> bool:
        return bool(self.url and self.model)

    def analyze(self, request: SemanticRequest) -> dict[str, Any] | None:
        if not self.available():
            return None

        prompt = _build_semantic_prompt(request)
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
        }
        try:
            response = httpx.post(self.url, json=payload, timeout=self.timeout_seconds)
            response.raise_for_status()
            data = response.json()
            raw = data.get("response") if isinstance(data, dict) else None
            if not raw:
                return None
            return _parse_semantic_response(str(raw), request, self.name)
        except Exception as exc:
            logger.debug("Ollama semantic backend failed: %s", exc)
            return None

    def extract_document_entities(self, text: str) -> dict[str, Any] | None:
        if not self.available() or not text:
            return None
        prompt = DOCUMENT_ENTITY_PROMPT_TEMPLATE + "\n" + text[:12000]
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {"temperature": 0.0},
        }
        try:
            response = httpx.post(self.url, json=payload, timeout=self.timeout_seconds)
            response.raise_for_status()
            data = response.json()
            raw = data.get("response") if isinstance(data, dict) else None
            if not raw:
                return None
            parsed = _parse_json_dict(str(raw))
            save_llm_debug_dump(
                call_type="ollama_document_entities",
                prompt=prompt,
                response=raw,
                model=self.model,
                parsed_result=parsed
            )
            return parsed
        except Exception as exc:
            logger.debug("Ollama document entity extraction failed: %s", exc)
            return None


class OpenRouterBackend(SemanticBackend):
    """Backend that calls an OpenRouter-hosted model using a bearer API key.

    This is a lightweight adapter that expects `settings.openrouter_api_key` to
    contain a test key (user said they would place it directly in code for testing).
    """
    name = "openrouter"

    def __init__(self, url: str | None = None, model: str | None = None, timeout_seconds: int | None = None):
        self.url = url or settings.openrouter_url
        self.model = model or settings.openrouter_model
        self.api_key = getattr(settings, "openrouter_api_key", "") or os.getenv("OPENROUTER_API_KEY", "")
        self.timeout_seconds = timeout_seconds or getattr(settings, "semantic_llm_timeout_seconds", 120)

    def available(self) -> bool:
        has_url = bool(self.url)
        has_model = bool(self.model)
        has_key = bool(self.api_key)
        if not has_url or not has_model or not has_key:
            logger.warning(
                f"[OPENROUTER] Backend not fully configured: url_configured={has_url}, model_configured={has_model}, api_key_configured={has_key}"
            )
            return False
        return True

    def analyze(self, request: SemanticRequest) -> dict[str, Any] | None:
        if not self.available():
            return None

        # Parse multiple keys separated by commas or pipes
        keys = [k.strip() for k in self.api_key.replace("|", ",").split(",") if k.strip()]
        if not keys:
            logger.warning("No OpenRouter API keys parsed — skipping semantic extraction")
            return None

        prompt = _build_semantic_prompt(request)

        # Use chat/completions format (compatible with openrouter.ai/api/v1/chat/completions)
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 4096,
            "temperature": 0.7,
        }

        # Setup debug log file before calling the API so it always exists even if rate limited or network fails
        from datetime import datetime
        ts = datetime.utcnow().isoformat() + "Z"
        path = None
        try:
            from services.parser.app.utils import ensure_dir
            from pathlib import Path
            base = Path(os.getcwd()) / "tmp" / "parser_debug" / "llm_calls"
            base = ensure_dir(base)
            model_safe = (self.model or "model").replace("/", "_").replace("\\", "_").replace(":", "_")
            fname = f"{ts.replace(':', '-')}_openrouter_semantic_{model_safe}.json"
            path = str(base / fname)
        except Exception as e:
            logger.warning("Failed to setup semantic debug log directory: %s", e)
        
        # Initial pending state
        body = {
            "timestamp": ts,
            "provider": "openrouter",
            "model": self.model,
            "region_id": request.region_id,
            "region_type": request.region_type,
            "page": request.page,
            "claim_id": request.claim_id,
            "prompt": prompt,
            "response": "PENDING / CALL IN PROGRESS",
            "response_parsed": None,
        }
        
        def _write_debug(data_dict: dict):
            if not path:
                return
            try:
                tmp_path = path + ".tmp"
                with open(tmp_path, "w", encoding="utf-8") as f:
                    json.dump(data_dict, f, ensure_ascii=False, indent=2)
                os.replace(tmp_path, path)
            except Exception as e:
                logger.debug("Failed to write semantic debug file: %s", e)

        # Write initial call state containing the input prompt
        _write_debug(body)

        import time  # noqa: F401 — kept for any future use
        response = None
        last_exc = None

        # Try keys sequentially — ONE attempt per key, no sleep on 429.
        # If all keys fail, fall through to Gemini immediately.
        for idx, key in enumerate(keys):
            masked_key = key[:8] + "..." + key[-8:] if len(key) > 16 else "***"
            logger.info(f"Attempting semantic extraction using API key {idx+1}/{len(keys)} ({masked_key})")
            headers = {
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            }
            try:
                response = httpx.post(self.url, json=payload, headers=headers, timeout=self.timeout_seconds)
                if response.status_code == 429:
                    logger.warning(f"API key {idx+1}/{len(keys)} rate limited (429). Trying next key...")
                    continue
                if response.status_code == 401:
                    logger.warning(f"API key {idx+1}/{len(keys)} unauthorized (401). Trying next key...")
                    continue

                if response.status_code != 200:
                    err_msg = f"HTTP {response.status_code}: {response.text}"
                    body["response"] = err_msg
                    _write_debug(body)
                    response.raise_for_status()

                # Succeeded!
                break
            except Exception as exc:
                last_exc = exc
                logger.warning(f"API call with key {idx+1}/{len(keys)} failed: {exc}. Trying next key...")
                continue
        else:
            # All OpenRouter keys exhausted — immediately try Gemini
            logger.warning("All OpenRouter keys failed. Attempting immediate fallback to Gemini...")
            logger.info("Calling Gemini for semantic extraction fallback...")
            gemini_text = _call_gemini(prompt, timeout=self.timeout_seconds)
            if gemini_text:
                # Persist debug artifact
                try:
                    from datetime import datetime as _dt
                    from pathlib import Path as _Path
                    from services.parser.app.utils import ensure_dir as _ensure_dir
                    _base = _ensure_dir(_Path(os.getcwd()) / "tmp" / "parser_debug" / "llm_calls")
                    _cfg = _get_gemini_config()
                    _model_safe = (_cfg["model"] or "gemini").replace("/", "_").replace(":", "_")
                    _ts = _dt.utcnow().isoformat() + "Z"
                    _fname = f"{_ts.replace(':', '-')}_openrouter_semantic_{self.model.replace('/', '_').replace(':', '_')}_gemini_fallback.json"
                    _path = str(_base / _fname)
                    import json as _json
                    with open(_path, "w", encoding="utf-8") as _f:
                        _json.dump({**body, "provider": "gemini-fallback", "model": _cfg["model"], "response": gemini_text}, _f, ensure_ascii=False, indent=2)
                    logger.info("Persisted Gemini semantic fallback call to %s", _path)
                except Exception as _pe:
                    logger.debug("Failed to persist Gemini fallback debug file: %s", _pe)
                return _parse_semantic_response(gemini_text, request, "gemini-fallback")
            err_str = str(last_exc or "All keys failed")
            logger.error("OpenRouter semantic extraction failed across all configured API keys; Gemini fallback also failed.")
            body["response"] = f"ERROR: All keys + Gemini fallback failed. Last error: {err_str}"
            _write_debug(body)
            return None

        try:
            data = response.json()


            # Chat/completions response format: {"choices": [{"message": {"content": "..."}}]}
            raw = None
            if isinstance(data, dict) and "choices" in data and isinstance(data["choices"], list) and data["choices"]:
                choice = data["choices"][0]
                message = choice.get("message")
                if isinstance(message, dict):
                    raw = message.get("content")
                else:
                    raw = message
            else:
                raw = data

            if not raw:
                logger.debug(f"OpenRouter response had no content: {data}")
                body["response"] = f"ERROR: Response had no content. Data: {json.dumps(data)}"
                _write_debug(body)
                return None

            raw_text = str(raw) if raw else ""
            body["response"] = raw_text

            # Attempt to parse response text into a clean JSON object for readability
            parsed_json = None
            try:
                cleaned_text = _strip_json_code_fences(raw_text)
                start = cleaned_text.find("{")
                end = cleaned_text.rfind("}")
                if start >= 0 and end >= 0 and end > start:
                    parsed_json = json.loads(cleaned_text[start : end + 1])
            except Exception:
                pass

            body["response_parsed"] = parsed_json
            _write_debug(body)
            logger.info("Persisted OpenRouter semantic call to %s", path)

            return _parse_semantic_response(raw_text, request, self.name)
        except Exception as exc:
            logger.debug("OpenRouter backend failed: %s", exc)
            body["response"] = f"ERROR: {str(exc)}"
            _write_debug(body)
            return None

    def extract_document_entities(self, text: str) -> dict[str, Any] | None:
        if not text:
            return None
        prompt = DOCUMENT_ENTITY_PROMPT_TEMPLATE + "\n" + text[:12000]
        raw_text = None
        if self.available():
            headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are a professional medical insurance billing and clinical extraction AI. Extract structured JSON adhering strictly to the schema with zero markdown noise."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": 2500,
                "temperature": 0.0,
                "response_format": {"type": "json_object"}
            }
            try:
                resp = httpx.post(self.url, json=payload, headers=headers, timeout=self.timeout_seconds)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, dict) and "choices" in data and data["choices"]:
                        msg = data["choices"][0].get("message", {})
                        raw_text = msg.get("content") if isinstance(msg, dict) else msg
            except Exception:
                pass

        if not raw_text:
            raw_text = _call_gemini(prompt, timeout=self.timeout_seconds)

        if raw_text:
            parsed = _parse_json_dict(str(raw_text))
            save_llm_debug_dump(
                call_type="openrouter_document_entities",
                prompt=prompt,
                response=raw_text,
                model=self.model,
                parsed_result=parsed
            )
            return parsed
        return None


class AzureOpenAISemanticBackend(SemanticBackend):
    name = "azure-openai"

    def __init__(self) -> None:
        self.endpoint = (
            os.getenv("AZURE_OPENAI_ENDPOINT", "")
            or os.getenv("AZURE_OPENAI_BASE_URL", "")
            or os.getenv("AZURE_OPENAI_URL", "")
        ).strip()
        self.api_key = (
            os.getenv("AZURE_OPENAI_API_KEY", "")
            or os.getenv("AZURE_OPENAI_KEY", "")
        ).strip()
        self.deployment = (
            os.getenv("AZURE_OPENAI_DEPLOYMENT", "")
            or os.getenv("AZURE_OPENAI_MODEL", "gpt-4o")
        ).strip()
        self.api_version = (
            os.getenv("AZURE_OPENAI_API_VERSION", "2024-11-20")
        ).strip()
        self.timeout_seconds = int(os.getenv("PARSER_LLM_TIMEOUT_SECONDS", "30"))

    def available(self) -> bool:
        return bool(self.endpoint and self.api_key)

    def analyze(self, request: SemanticRequest) -> dict[str, Any] | None:
        if not self.available():
            return None

        # Build completions URL
        if "/chat/completions" in self.endpoint:
            url = self.endpoint
            if "api-version" not in url and "/openai/v1" not in self.endpoint:
                sep = "&" if "?" in url else "?"
                url = f"{url}{sep}api-version={self.api_version}"
        elif self.endpoint.rstrip("/").endswith("/openai/v1") or "/v1" in self.endpoint:
            url = f"{self.endpoint.rstrip('/')}/chat/completions"
        else:
            url = f"{self.endpoint.rstrip('/')}/openai/deployments/{self.deployment}/chat/completions?api-version={self.api_version}"

        prompt = _build_semantic_prompt(request)
        payload = {
            "model": self.deployment,
            "messages": [
                {"role": "system", "content": "You are a professional medical insurance billing and clinical extraction AI. Extract structured JSON adhering strictly to the schema with zero markdown noise."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 1500,
            "temperature": 0.0,
            "response_format": {"type": "json_object"}
        }
        headers = {
            "api-key": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        raw = None
        for attempt in range(1, 4):
            try:
                logger.info("Calling Azure OpenAI (%s) for semantic extraction of region %s (attempt %d/3)...", self.deployment, request.region_id, attempt)
                resp = httpx.post(url, json=payload, headers=headers, timeout=self.timeout_seconds)
                if resp.status_code == 429:
                    retry_after = float(resp.headers.get("retry-after", 2 * attempt))
                    logger.warning("Azure OpenAI rate limited (429). Retrying in %.1fs (attempt %d/3)...", retry_after, attempt)
                    time.sleep(retry_after)
                    continue
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, dict) and "choices" in data and data["choices"]:
                    msg = data["choices"][0].get("message", {})
                    raw = msg.get("content") if isinstance(msg, dict) else msg
                break
            except Exception as exc:
                if attempt == 3:
                    logger.warning("Azure OpenAI semantic extraction failed after 3 attempts: %s", exc)
                    save_llm_debug_dump(
                        call_type="azure_openai_region_semantic_error",
                        prompt=prompt,
                        response=str(exc),
                        model=self.deployment
                    )
                    return None
                time.sleep(1.5 * attempt)

        parsed = _parse_semantic_response(str(raw), request, self.name) if raw else None
        save_llm_debug_dump(
            call_type="azure_openai_region_semantic",
            prompt=prompt,
            response=raw,
            model=self.deployment,
            parsed_result=parsed
        )
        if not raw:
            return None
        return parsed

    def extract_document_entities(self, text: str) -> dict[str, Any] | None:
        if not self.available() or not text:
            return None

        if "/chat/completions" in self.endpoint:
            url = self.endpoint
            if "api-version" not in url and "/openai/v1" not in self.endpoint:
                sep = "&" if "?" in url else "?"
                url = f"{url}{sep}api-version={self.api_version}"
        elif self.endpoint.rstrip("/").endswith("/openai/v1") or "/v1" in self.endpoint:
            url = f"{self.endpoint.rstrip('/')}/chat/completions"
        else:
            url = f"{self.endpoint.rstrip('/')}/openai/deployments/{self.deployment}/chat/completions?api-version={self.api_version}"

        prompt = DOCUMENT_ENTITY_PROMPT_TEMPLATE + "\n" + text[:12000]
        payload = {
            "model": self.deployment,
            "messages": [
                {"role": "system", "content": "You are a professional medical insurance billing and clinical extraction AI. Extract structured JSON adhering strictly to the schema with zero markdown noise."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 2500,
            "temperature": 0.0,
            "response_format": {"type": "json_object"}
        }
        headers = {
            "api-key": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        raw = None
        for attempt in range(1, 4):
            try:
                logger.info("Calling Azure OpenAI (%s) for document clinical entity extraction (attempt %d/3)...", self.deployment, attempt)
                resp = httpx.post(url, json=payload, headers=headers, timeout=self.timeout_seconds)
                if resp.status_code == 429:
                    retry_after = float(resp.headers.get("retry-after", 2 * attempt))
                    logger.warning("Azure OpenAI rate limited (429). Retrying in %.1fs (attempt %d/3)...", retry_after, attempt)
                    time.sleep(retry_after)
                    continue
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, dict) and "choices" in data and data["choices"]:
                    msg = data["choices"][0].get("message", {})
                    raw = msg.get("content") if isinstance(msg, dict) else msg
                break
            except Exception as exc:
                if attempt == 3:
                    logger.warning("Azure OpenAI document entity extraction failed after 3 attempts: %s", exc)
                    save_llm_debug_dump(
                        call_type="azure_openai_document_entities_error",
                        prompt=prompt,
                        response=str(exc),
                        model=self.deployment
                    )
                    return None
                time.sleep(1.5 * attempt)

        parsed = _parse_json_dict(str(raw)) if raw else None
        save_llm_debug_dump(
            call_type="azure_openai_document_entities",
            prompt=prompt,
            response=raw,
            model=self.deployment,
            parsed_result=parsed
        )
        if not raw:
            return None
        return parsed


class SemanticBackendRegistry:
    def __init__(self) -> None:
        backend_order = [part.strip().lower() for part in (settings.semantic_backend_order or "").split(",") if part.strip()]
        if os.getenv("AZURE_OPENAI_ENDPOINT") and os.getenv("AZURE_OPENAI_API_KEY"):
            if "azure-openai" not in backend_order:
                backend_order.insert(0, "azure-openai")
        if not backend_order:
            backend_order = ["azure-openai", "openrouter", "qwen2-vl", "layoutlmv3", "florence-2", "donut"]

        self.backends: list[SemanticBackend] = []
        for backend_name in backend_order:
            backend = self._create_backend(backend_name)
            if backend is not None:
                self.backends.append(backend)

    def _create_backend(self, backend_name: str) -> SemanticBackend | None:
        if backend_name in {"azure-openai", "azure_openai", "azure", "azure-openai-backend"}:
            return AzureOpenAISemanticBackend()
        if backend_name == "qwen2-vl":
            model_name = settings.qwen2_vl_model or os.getenv("PARSER_QWEN2_VL_MODEL", "")
            return Qwen2VLBackend(model_name=model_name) if model_name else Qwen2VLBackend(model_name="")
        if backend_name == "layoutlmv3":
            return LayoutLMv3Backend(model_name=settings.layoutlm_model)
        if backend_name == "florence-2":
            model_name = settings.florence2_model or os.getenv("PARSER_FLORENCE2_MODEL", "")
            return Florence2Backend(model_name=model_name) if model_name else Florence2Backend(model_name="")
        if backend_name == "donut":
            model_name = settings.donut_model or os.getenv("PARSER_DONUT_MODEL", "")
            return DonutBackend(model_name=model_name) if model_name else DonutBackend(model_name="")
        if backend_name in {"ollama", "local-llm", "semantic-llm"}:
            return OllamaSemanticBackend()
        if backend_name in {"openrouter", "open-router"}:
            return OpenRouterBackend()
        return None

    def choose(self) -> SemanticBackend | None:
        for backend in self.backends:
            try:
                if backend.available():
                    logger.info("Semantic backend selected: %s", getattr(backend, "name", backend.__class__.__name__))
                    return backend
            except Exception:
                continue

        backend_names = [getattr(backend, "name", backend.__class__.__name__) for backend in self.backends]
        logger.warning(
            "No semantic backend available; tried=%s. Semantic table extraction will fall back to geometry and heuristics.",
            backend_names,
        )
        return None


def _redact_sensitive_info(text: str) -> str:
    if not text:
        return text
    
    # 1. Apply scrub_phi if available
    try:
        from libs.utils.phi import scrub_phi
        text = scrub_phi(text)
    except Exception:
        pass
            
    # 2. Redact Aadhaar Numbers (unmasked and masked formats)
    text = re.sub(
        r"\b(?:\d{4}[-\s]?\d{4}[-\s]?\d{4}|[XxX]{4}[-\s]?[XxX]{4}[-\s]?\d{4})\b",
        "[AADHAAR_REDACTED]",
        text
    )
    
    # 3. Redact PAN numbers
    text = re.sub(
        r"\b[A-Z]{5}\d{4}[A-Z]\b",
        "[PAN_REDACTED]",
        text,
        flags=re.IGNORECASE
    )
    
    # 4. Redact IFSC codes
    text = re.sub(
        r"\b[A-Z]{4}0[A-Z0-9]{6}\b",
        "[IFSC_REDACTED]",
        text,
        flags=re.IGNORECASE
    )
    
    # 5. Redact Cheque/PIN Numbers (sequences of 6 digits)
    text = re.sub(
        r"\b\d{6}\b",
        "[CHEQUE_OR_PIN_REDACTED]",
        text
    )
    
    # 6. Redact Bank Account Numbers (sequences of 9 to 18 digits)
    text = re.sub(
        r"\b\d{9,18}\b",
        "[ACCOUNT_REDACTED]",
        text
    )
    
    return text


def _text_only_request(request: SemanticRequest) -> str:
    return request.text[: max(1000, settings.semantic_prompt_max_chars)]


def _build_semantic_prompt(request: SemanticRequest) -> str:
    region_type = request.region_type.lower()
    table_rows = []
    max_rows = 150
    for row_index, row in enumerate((request.table_cells or [])[:max_rows]):
        cells = [_redact_sensitive_info((cell.get("text") or "").strip()) for cell in row if (cell.get("text") or "").strip()]
        if cells:
            table_rows.append(f"row {row_index + 1}: " + " | ".join(cells))
    table_hint = "\n".join(table_rows)

    if table_hint:
        content_payload = f"Table rows:\n{table_hint}"
    else:
        text = _text_only_request(request)
        text = _redact_sensitive_info(text)
        content_payload = f"Document text:\n{text}"

    return f"""You are a medical document billing analyzer. Extract itemized expense rows from this table region into strict JSON.

JSON Schema:
{{
  "region_type": "expense_table",
  "table_kind": "expenses",
  "confidence": 0.95,
  "tables": [
    {{
      "table_kind": "expenses",
      "headers": ["category", "description", "amount"],
      "rows": [
        {{"category": "CategoryName", "description": "Item Description", "amount": "NumericAmount"}}
      ],
      "confidence": 0.95
    }}
  ]
}}

Allowed Categories (choose best fit):
Room Rent, Labour / Delivery, ICU, Nursing, Surgery / OT, Consultation, Pharmacy, Injection, Tablet, Laboratory, Radiology, Oxygen, Consumables, Anaesthesia, Supplies, Miscellaneous.

Rules:
1. Extract every individual billed item row separately. Preserve exact amounts (numeric string).
2. COLUMN PRIORITY: If Net Payable / Payable / Amount Payable exists, ALWAYS extract that value for 'amount'. Otherwise extract Gross / Total / Amount. Never extract Gross if Net Payable is present. If Net is 0.00, extract 0.00.
3. For pre-summarised multi-day charges (e.g. "ICU - 5 Days @ Rs. 15,000/day"), calculate total (75000). For date-keyed tables, extract each date's row separately with the date in description.
4. DO NOT EXTRACT summary/grand totals (e.g. "Grand Total", "Total Amount", "Gross Bill", "Total Billed", "Net Amount Payable", "Total Paid", "Total Amount Received").
5. DO NOT EXTRACT deduction/subtraction rows ("Less: ...", "Deductible", "Non-Payable Deductions", "Co-Pay", "Discount", "Balance Amount", "Patient Share").
6. DO NOT EXTRACT metadata lines ("Ward: ...", "Admission Date: ...", "LOS: ...").
7. If this table is NOT a billing/expense table (e.g. diagnostic lab report, insurance summary, clinical narrative), return "table_kind": "generic_table" with empty rows.

Region hint: {region_type}
{content_payload}""".strip()


def _layoutlm_region_summary(request: SemanticRequest, model_name: str) -> dict[str, Any]:
    # Region summarization when a dedicated LayoutLMv3 checkpoint exists. We don't
    # assume a fine-tuned label set here; instead we expose a semantic request that
    # downstream code can use for provenance and debug output.
    text = request.text[: max(1000, settings.semantic_prompt_max_chars)]
    return {
        "region_type": request.region_type,
        "table_kind": "generic_table" if request.table_cells else "other",
        "confidence": 0.45,
        "notes": f"LayoutLMv3 backend placeholder for region summarization: {text[:120]}",
        "fields": [],
        "tables": [],
        "model_name": model_name,
    }


def _resolve_ollama_url(candidate: str | None) -> str:
    urls = [candidate, "http://localhost:11434/api/generate", "http://127.0.0.1:11434/api/generate"]
    for url in urls:
        if not url:
            continue
        try:
            tags_url = url.replace("/api/generate", "/api/tags")
            response = httpx.get(tags_url, timeout=3)
            if response.status_code == 200:
                return url
        except Exception:
            continue
    return candidate or "http://localhost:11434/api/generate"


def _discover_ollama_model(url: str | None) -> str | None:
    if not url:
        return None
    try:
        tags_url = url.replace("/api/generate", "/api/tags")
        response = httpx.get(tags_url, timeout=5)
        response.raise_for_status()
        payload = response.json()
        models = payload.get("models", []) if isinstance(payload, dict) else []
        if not models:
            return None
        preferred_names = ["qwen2.5:1.5b", "qwen2.5", "llama3.2", "llama3", "mistral", "phi3"]
        available_names = [str(m.get("name") or m.get("model") or "") for m in models if isinstance(m, dict)]
        for preferred in preferred_names:
            for name in available_names:
                if preferred in name:
                    return name
        return available_names[0] if available_names else None
    except Exception:
        return None


def _strip_json_code_fences(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.I).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()
    return cleaned


def _parse_semantic_response(raw_text: str, request: SemanticRequest, model_name: str) -> dict[str, Any] | None:
    cleaned = _strip_json_code_fences(raw_text)
    if not cleaned:
        return None

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end < 0 or end <= start:
        return None

    cleaned = cleaned[start : end + 1]
    try:
        data = json.loads(cleaned)
    except Exception:
        return None

    fields: list[SemanticFieldOutput] = []
    for field_item in data.get("fields", []) or []:
        if not isinstance(field_item, dict):
            continue
        canonical_field = str(field_item.get("canonical_field") or "").strip()
        value = str(field_item.get("value") or "").strip()
        if not canonical_field or not value:
            continue
        fields.append(SemanticFieldOutput(
            canonical_field=canonical_field,
            value=value,
            confidence=float(field_item.get("confidence") or data.get("confidence") or 0.0),
            source_region_id=request.region_id,
            source_region_type=request.region_type,
            source_tokens=SemanticBackend._source_tokens(request),
            model_name=model_name,
            extractor_name=model_name,
            metadata={"raw": field_item},
        ))

    tables: list[SemanticTableOutput] = []
    for table_item in data.get("tables", []) or []:
        if not isinstance(table_item, dict):
            continue
        table_kind = str(table_item.get("table_kind") or data.get("table_kind") or "generic_table").strip()
        rows: list[SemanticTableRowOutput] = []
        for row_index, row_item in enumerate(table_item.get("rows", []) or []):
            if isinstance(row_item, dict):
                rows.append(SemanticTableRowOutput(
                    row_index=row_index,
                    row_type=str(row_item.get("row_type") or "").strip() or None,
                    cells={k: v for k, v in row_item.items() if k not in {"row_type"}},
                    confidence=float(row_item.get("confidence") or table_item.get("confidence") or data.get("confidence") or 0.0),
                ))
            else:
                rows.append(SemanticTableRowOutput(row_index=row_index, cells={"value": row_item}))

        tables.append(SemanticTableOutput(
            table_kind=table_kind,
            confidence=float(table_item.get("confidence") or data.get("confidence") or 0.0),
            source_region_id=request.region_id,
            source_region_type=request.region_type,
            source_tokens=SemanticBackend._source_tokens(request),
            headers=[str(h) for h in table_item.get("headers", []) if str(h).strip()],
            rows=rows,
            model_name=model_name,
            metadata={"raw": table_item},
        ))

    return {
        "region_id": request.region_id,
        "region_type": str(data.get("region_type") or request.region_type).strip(),
        "semantic_type": str(data.get("region_type") or request.region_type).strip(),
        "confidence": float(data.get("confidence") or 0.0),
        "source_page": request.page,
        "document_id": request.document_id,
        "claim_id": request.claim_id,
        "source_tokens": [token.model_dump() for token in SemanticBackend._source_tokens(request)],
        "fields": [field.model_dump() for field in fields],
        "tables": [table.model_dump() for table in tables],
        "model_name": model_name,
        "notes": data.get("notes"),
        "metadata": data,
    }
