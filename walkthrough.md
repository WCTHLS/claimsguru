# Walkthrough: Immediate Document Validation & Remediation

This walkthrough details the changes made to implement strict document classification priorities and the immediate functional coverage checks in the pipeline.

---

## 1. Summary of Changes

### A. Document Classifier Priority & Pre-Authorizations
* **File**: [`services/parser/app/document_classifier.py`](file:///c:/Project/ClaimGPT-feature/services/parser/app/document_classifier.py#L11-L40)
* **Logic**: Checked clinical records, hospital bills, and insurance claim forms before running Identity card checks. This stops bills/summaries listing masked Aadhaar/PAN details from being greedy-matched as Aadhaar/PAN cards.
* **Display Titles**: Maps pre-authorization documents to `Pre-Authorization - [Patient Name]` instead of generic names.

### B. Functional Information Coverage Checker
* **File**: [`services/workflow/app/pipeline.py`](file:///c:/Project/ClaimGPT-feature/services/workflow/app/pipeline.py#L188-L271)
* **Logic**: Implemented `_check_mandatory_document_coverage`. It queries the database after the `parse` task finishes, checking if the files satisfy **three functional groups** (Clinical Data, Financial Data, and Identity/KYC Proof). 
* **Pause Hook**: If any coverage group is missing, the orchestrator returns `PAUSED_FOR_DOCUMENTS`, stopping downstream processing.

### C. Orchestrator Pause State Handler
* **File**: [`services/workflow/app/main.py`](file:///c:/Project/ClaimGPT-feature/services/workflow/app/main.py#L102-L107)
* **Logic**: Intercepts `PAUSED_FOR_DOCUMENTS` and sets `claim.status = "DOCUMENTS_REQUESTED"`. This prevents the claim from marking as `WORKFLOW_FAILED` or `COMPLETED`.

### D. Inline Pipeline Coverage Check
* **File**: [`services/shared_tasks.py`](file:///c:/Project/ClaimGPT-feature/services/shared_tasks.py#L837-L855)
* **Logic**: Integrated `_check_inline_mandatory_document_coverage` inside the inline execution path `run_pipeline_inline`. If any functional metadata group is missing, the inline thread immediately halts downstream tasks and sets `claim.status = "DOCUMENTS_REQUESTED"`.

### E. Frontend Status Polling & Action Alerts
* **Files**: [`use-auditor-state.ts`](file:///C:/Users/Admin/Downloads/project-bolt-sb1-wfexvjdh%20(2)/project/components/claimgpt/use-auditor-state.ts), [`dashboard-clinical.tsx`](file:///C:/Users/Admin/Downloads/project-bolt-sb1-wfexvjdh%20(2)/project/components/claimgpt/dashboard-clinical.tsx), [`dashboard-aurora.tsx`](file:///C:/Users/Admin/Downloads/project-bolt-sb1-wfexvjdh%20(2)/project/components/claimgpt/dashboard-aurora.tsx), [`dashboard-ledger.tsx`](file:///C:/Users/Admin/Downloads/project-bolt-sb1-wfexvjdh%20(2)/project/components/claimgpt/dashboard-ledger.tsx), [`page.tsx`](file:///c:/Project/ClaimGPT-feature/ui/web/src/app/app/page.tsx)
* **Logic**: 
  * Main UI and Design dashboards now retrieve `doc_type` directly from the serialized ingress claim payload.
  * Instead of a generic `"TPA requested more documents"` banner, the main UI evaluates which categories are missing dynamically from the uploaded document set.
  * Shows specific warnings: `"⚠️ Identity Proof missing. Please upload identity proof to proceed further."` or `"⚠️ Hospital Documents missing. Please upload hospital documents to proceed further."` (or both, depending on the files present).

---

## 2. Verification

1. **Stricter Classifier Checks**: Re-run parsing correctly identifies hospital bills, pre-authorizations, and discharge summaries without defaulting them to "Aadhaar Card".
2. **Pipeline Pausing**: Verified database records successfully transition to `DOCUMENTS_REQUESTED` when mandatory categories are missing, which automatically renders the warning banner in the frontend UI.
3. **Inline Execution Compatibility**: Verified claims processed via inline thread (no celery control ping fallback) correctly halt and report `DOCUMENTS_REQUESTED`.
4. **Dynamic Warning Alerts**: Verified the main React App at `localhost:3000` successfully shows `Identity Proof missing` warning banner for files uploaded without KYC.
5. **Celery Retry Fix**: Added specific `except (NonRetryableTaskError, Ignore)` block inside Celery `parser_task` to prevent the task from being retried and abort the Celery chain cleanly.
6. **Patient Name Mismatch Handling**:
   * **Digital Texts (Synchronous Gate)**: Updated [`main.py`](file:///c:/Project/ClaimGPT-feature/services/ingress/app/main.py#L1506-L1513) to transition both the claim and `workflow_state` to `MANUAL_REVIEW_REQUIRED` if the Identity Gate rejects the uploaded document due to a name mismatch (e.g. Swagath Reddy ID uploaded to Binod Kumar's claim). Non-KYC documents (like hospital bills, lab reports, etc.) bypass the gate cleanly so they are not rejected or deleted.
   * **Scanned Texts (Asynchronous Gate)**: Added `_check_asynchronous_identity_gate(claim_id)` inside the Celery `parser_task` ([`shared_tasks.py`](file:///c:/Project/ClaimGPT-feature/services/shared_tasks.py#L309-L327)) and `run_pipeline_inline`. After OCR completes in the background, it extracts the name on the ID card and compares it to the anchor patient name. If a mismatch is detected, it halts the Celery chain cleanly and sets the status to `MANUAL_REVIEW_REQUIRED`. If the anchor patient name is not yet extracted (e.g., if only Aadhaar is uploaded first), or contains empty/`N/A` values, name validation is bypassed to avoid false positives.
   * **UI Warning Banners**: Updated the main React UI [`page.tsx`](file:///c:/Project/ClaimGPT-feature/ui/web/src/app/app/page.tsx#L3194-L3206) to catch `MANUAL_REVIEW_REQUIRED` status and render a high-visibility warning banner: `"⚠️ Patient Name Mismatch: The name on the uploaded Identity Proof does not match the patient name (Binod Kumar). Please upload the correct ID proof."` along with the action upload button.
7. **Idempotency OCR Cloning Fix**:
   * Fixed a bug in the OCR worker [`main.py`](file:///c:/Project/ClaimGPT-feature/services/ocr/app/main.py#L503-L520) where reusing existing OCR results based on content hash was skipping creation of new database records. It now correctly clones `OcrResult` rows (copying pages, texts, and tokens) for the new document ID. This ensures the parser worker can read the text of duplicate files.
8. **API Gateway Dependency & Ingress Route Resolution**:
   * **Root Cause**: The API gateway's FastApi app dynamically mounts all 11 microservice routers on startup. However, new dependencies added by teammates inside service folders (such as `email-validator` for `ingress` and `langgraph`/`langfuse`/`psycopg-pool` for `chat`) were missing in the root `requirements.txt` used to build the `gateway` container. This caused router imports to fail, leading the gateway to gracefully skip `/ingress` and `/chat` paths and return `404 Not Found`. This caused Next.js requests to fail, forcing the client-side UI to fall back to the mock password bypass (`1`/`1`).
   * **Fix & Verification**: 
     1. Wrote a script `merge_requirements.py` to merge all service requirements into the root `requirements.txt`.
     2. Rebuilt the `gateway` image and tagged it to replace the old dangling image.
     3. Force-recreated all gateway container replicas (`gateway-1`, `gateway-2`, `gateway-3`) and the Nginx load balancer to run the new image ID (`d6b9f298...`).
     4. Verified that the `/ingress/health` check successfully returns `{"status":"ok","database":"up"}` across all gateway load-balanced replicas, and the root gateway returns all 11 active microservice router paths.
     5. Confirmed that the `users` table successfully exists in the database schema. The real authentication mechanism is now fully active.
9. **API Client Merge Conflicts & Real JWT Authentication**:
   * **Conflict Resolution**: Merged all four conflict markers in [`lib/api-client.ts`](file:///c:/Users/Admin/Downloads/project-bolt-sb1-wfexvjdh%20(2)/project/lib/api-client.ts). Combined the resilient timeout/network wrapper of `safeFetch` with the teammate's authorization header injection: `headers: getAuthHeaders()`. Removed the duplicate extraneous code segments that were dumped inside the `safeFetch` utility wrapper function.
10. **Supporting Document Uploads to Same Claim in Port 3001 (Design UI)**:
    * **Fix**: Added optional `claimId` parameter to `uploadClaimDocument` in [`lib/api-client.ts`](file:///c:/Users/Admin/Downloads/project-bolt-sb1-wfexvjdh%20(2)/project/lib/api-client.ts#L95), which routes the upload request dynamically to `${INGRESS_API}/claims/${claimId}/documents` if present.
    * **State Binding**: Updated `handleUploadFile` and `startClaimAnalysis` in [`use-auditor-state.ts`](file:///c:/Users/Admin/Downloads/project-bolt-sb1-wfexvjdh%20(2)/project/components/claimgpt/use-auditor-state.ts#L295-L325) to accept and propagate the `appendToActive` flag.
    * **UI Bindings**: Configured the warning banner file input elements in all three dashboards ([`dashboard-clinical.tsx`](file:///c:/Project/ClaimGPT-feature/ui/web/src/app/app/dashboard-clinical.tsx#L514), [`dashboard-aurora.tsx`](file:///c:/Project/ClaimGPT-feature/ui/web/src/app/app/dashboard-aurora.tsx#L432), and [`dashboard-ledger.tsx`](file:///c:/Project/ClaimGPT-feature/ui/web/src/app/app/dashboard-ledger.tsx#L430)) to pass `true` for `appendToActive`, appending uploads directly to the paused claim.
11. **Stateless Cloud-Ready Document Upload Architecture**:
    * **Ingress API (main.py)**: Refactored `create_claim` and `add_documents_to_claim` in [`ingress/app/main.py`](file:///c:/Project/ClaimGPT-feature/services/ingress/app/main.py#L1400) to upload file bytes directly to MinIO and store `s3://...` URIs in the database. Eliminated local container disk writes and temp file I/O operations, making the API layer stateless.
    * **Celery Ingest Task (shared_tasks.py)**: Refactored `process_intake` task in [`shared_tasks.py`](file:///c:/Project/ClaimGPT-feature/services/shared_tasks.py#L700) to detect S3 URIs, download temp objects to local worker temp spaces using `MinioStorage.download_to_temp`, run validations, and copy/relocate finalize objects inside MinIO using `copy_file` API, followed by temporary object cleanup.
    * **MinioStorage Client (storage.py)**: Added `delete_file` and `copy_file` classmethods in [`libs/shared/storage.py`](file:///c:/Project/ClaimGPT-feature/libs/shared/storage.py#L139) to support deletion and object-to-object copying.
    * **Submission and Chat Fallbacks (main.py)**: Updated local PDF fallbacks inside [`chat/app/main.py`](file:///c:/Project/ClaimGPT-feature/services/chat/app/main.py#L262) and [`submission/app/main.py`](file:///c:/Project/ClaimGPT-feature/services/submission/app/main.py#L469) to support `s3://` paths by downloading objects first, avoiding file read crashes.
    * **Verification**: Ran API validation scripts triggering claim creation and document appending. Verified database records show `s3://claimgpt/...` URIs and verified the local filesystem storage `/app/services/ingress/storage/raw` remains completely empty (zero local file writes).
12. **Redis-Backed Ingress API Rate Limiting & Spammer Protection**:
    * **RateLimiter Dependency (rate_limiter.py)**: Created [`services/ingress/app/rate_limiter.py`](file:///c:/Project/ClaimGPT-feature/services/ingress/app/rate_limiter.py) implementing a Redis-backed Sliding Window Log rate limiting algorithm via Lua scripting to ensure atomic execution. Resolves client IPs securely, supporting reverse proxy headers like `X-Forwarded-For`.
    * **API Decorators (main.py)**: Applied the dependency decorator to all sensitive POST routes in [`ingress/app/main.py`](file:///c:/Project/ClaimGPT-feature/services/ingress/app/main.py#L1399):
      * `/claims` (limit: 10 req/min)
      * `/claims/{id}/documents` (limit: 15 req/min)
      * `/auth/login` (limit: 5 req/min)
      * `/auth/register` (limit: 3 req/min)
      * `/organizations/registration` (limit: 3 req/min)
      * `/tpa-adjusters/registration` (limit: 3 req/min)
    * **Lifecycle Management**: Integrated shutdown handlers inside [`main.py`](file:///c:/Project/ClaimGPT-feature/services/ingress/app/main.py#L110) to cleanly terminate the connection pool on application exit.
    * **Verification**: Triggered rapid successive uploads to `/ingress/claims`. Verified requests 1-10 successfully return HTTP 202 with headers `x-ratelimit-limit: 10` and `x-ratelimit-remaining` decreasing to `0`, and Request 11 is successfully blocked with `HTTP 429 Too Many Requests` and header `retry-after`.
13. **Celery Task Timeout Configuration & Fail-Safe Database Recovery**:
    * **Global Task Timeouts**: Updated [`libs/shared/celery_app.py`](file:///c:/Project/ClaimGPT-feature/libs/shared/celery_app.py#L149) with global fallback execution boundaries: `task_soft_time_limit=180` (3 minutes soft limit) and `task_time_limit=240` (4 minutes hard kill limit) to prevent threads from locking up indefinitely on stalled PDF or OCR jobs.
    * **Fail-Safe Task Recovery Handlers**: Refactored background tasks in [`services/shared_tasks.py`](file:///c:/Project/ClaimGPT-feature/services/shared_tasks.py#L380):
      * Added `except SoftTimeLimitExceeded` blocks to `coding_task`, `risk_task`, `validator_task`, `intake_task`, and `finalize_claim_task`.
      * Ensures that if any step in the pipeline times out, the task rolls back active database transactions cleanly and transitions the claim's workflow state database row to `FAILED`. This avoids processing locks and alerts users of failures on the frontend.
    * **Web UI Typecheck Fix**: Resolved a Next.js TypeScript compiler warning in the patient workspace [`src/app/app/page.tsx`](file:///c:/Project/ClaimGPT-feature/ui/web/src/app/app/page.tsx#L3205) by binding the patient name to the logged-in session user (`user?.name`).
