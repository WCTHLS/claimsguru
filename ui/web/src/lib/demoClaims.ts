/**
 * Demo dataset for backend-less deploys (e.g. Vercel).
 *
 * Activated only when NEXT_PUBLIC_AUTH_DEV_MODE === "true" AND the real API is
 * unreachable. apiFetch() and the home dashboard fall back to these 15 mock
 * claims so the deployed app is browsable without a running backend.
 */

export const DEMO_AUTH = process.env.NEXT_PUBLIC_AUTH_DEV_MODE === "true";

interface DemoDoc {
  id: string;
  file_name: string;
  file_type?: string;
}
interface DemoClaim {
  id: string;
  policy_id: string | null;
  patient_id: string | null;
  status: string;
  source: string | null;
  created_at: string;
  updated_at: string;
  documents: DemoDoc[];
}

const SEED: Array<{
  name: string; hospital: string; doctor: string; diagnosis: string;
  age: string; gender: string; billed: number; status: string;
}> = [
  { name: "Rahul Sharma",     hospital: "Apollo Hospitals, Chennai",      doctor: "Dr. Meera Iyer",     diagnosis: "Acute appendicitis",            age: "34", gender: "Male",   billed: 84500,  status: "COMPLETED" },
  { name: "Priya Nair",       hospital: "Fortis, Bengaluru",              doctor: "Dr. Suresh Rao",     diagnosis: "Type 2 diabetes mellitus",      age: "52", gender: "Female", billed: 41200,  status: "COMPLETED" },
  { name: "Amit Verma",       hospital: "Max Super Specialty, Delhi",     doctor: "Dr. Kavita Singh",   diagnosis: "Coronary artery disease",       age: "61", gender: "Male",   billed: 312000, status: "COMPLETED" },
  { name: "Sneha Patil",      hospital: "Manipal, Pune",                  doctor: "Dr. Arjun Desai",    diagnosis: "Normal delivery",               age: "28", gender: "Female", billed: 58900,  status: "PROCESSING" },
  { name: "Vikram Reddy",     hospital: "KIMS, Hyderabad",                doctor: "Dr. Lakshmi Menon",  diagnosis: "Fracture of femur",             age: "45", gender: "Male",   billed: 167500, status: "COMPLETED" },
  { name: "Anjali Gupta",     hospital: "Medanta, Gurugram",              doctor: "Dr. Rohit Malhotra", diagnosis: "Pneumonia",                     age: "39", gender: "Female", billed: 73400,  status: "COMPLETED" },
  { name: "Karthik Subbu",    hospital: "Narayana, Bengaluru",            doctor: "Dr. Meera Iyer",     diagnosis: "Cataract surgery",              age: "67", gender: "Male",   billed: 29800,  status: "UPLOADED" },
  { name: "Deepa Krishnan",   hospital: "AIIMS, Delhi",                   doctor: "Dr. Kavita Singh",   diagnosis: "Cholecystitis",                 age: "48", gender: "Female", billed: 95600,  status: "COMPLETED" },
  { name: "Mohammed Irfan",   hospital: "CMC, Vellore",                   doctor: "Dr. Arjun Desai",    diagnosis: "Dengue fever",                  age: "31", gender: "Male",   billed: 38700,  status: "COMPLETED" },
  { name: "Lakshmi Devi",     hospital: "Yashoda, Hyderabad",            doctor: "Dr. Suresh Rao",     diagnosis: "Hip replacement",               age: "70", gender: "Female", billed: 248000, status: "REVIEW" },
  { name: "Sanjay Joshi",     hospital: "Ruby Hall, Pune",                doctor: "Dr. Rohit Malhotra", diagnosis: "Hernia repair",                 age: "55", gender: "Male",   billed: 64300,  status: "COMPLETED" },
  { name: "Pooja Bansal",     hospital: "Fortis, Mumbai",                 doctor: "Dr. Lakshmi Menon",  diagnosis: "Asthma exacerbation",           age: "26", gender: "Female", billed: 21500,  status: "COMPLETED" },
  { name: "Ravi Teja",        hospital: "Apollo, Hyderabad",              doctor: "Dr. Meera Iyer",     diagnosis: "Renal calculi",                 age: "42", gender: "Male",   billed: 112400, status: "PROCESSING" },
  { name: "Nisha Menon",      hospital: "Aster, Kochi",                   doctor: "Dr. Kavita Singh",   diagnosis: "Thyroidectomy",                 age: "37", gender: "Female", billed: 87900,  status: "COMPLETED" },
  { name: "Arun Pillai",      hospital: "Manipal, Bengaluru",             doctor: "Dr. Suresh Rao",     diagnosis: "Knee arthroscopy",              age: "33", gender: "Male",   billed: 76200,  status: "COMPLETED" },
];

const DAY = 86_400_000;
const CLAIMS: DemoClaim[] = SEED.map((s, i) => {
  const created = new Date(Date.now() - (i + 1) * DAY).toISOString();
  const id = `demo-${String(i + 1).padStart(3, "0")}`;
  return {
    id,
    policy_id: `POL-2026-${1000 + i}`,
    patient_id: `PT-${2000 + i}`,
    status: s.status,
    source: "demo",
    created_at: created,
    updated_at: created,
    documents: [{ id: `${id}-d1`, file_name: "discharge_summary.pdf", file_type: "application/pdf" }],
  };
});

function previewFor(i: number) {
  const s = SEED[i];
  return {
    claim_id: CLAIMS[i].id,
    status: s.status,
    policy_id: CLAIMS[i].policy_id,
    summary: {
      patient_name: s.name, age: s.age, gender: s.gender, hospital: s.hospital,
      doctor: s.doctor, diagnosis: s.diagnosis, policy_number: CLAIMS[i].policy_id,
      admission_date: "2026-05-10", discharge_date: "2026-05-14", total_amount: String(s.billed),
    },
    parsed_fields: { patient_name: s.name, hospital: s.hospital, diagnosis: s.diagnosis, total_amount: String(s.billed), policy_number: CLAIMS[i].policy_id || "" },
    billed_total: s.billed,
    icd_codes: [{ code: "A09", description: s.diagnosis, confidence: 0.93 }],
    cpt_codes: [{ code: "99213", description: "Office visit", confidence: 0.88 }],
    cost_summary: { icd_total: Math.round(s.billed * 0.6), cpt_total: Math.round(s.billed * 0.4), grand_total: s.billed },
    expenses: [{ category: "Room", amount: Math.round(s.billed * 0.4) }, { category: "Pharmacy", amount: Math.round(s.billed * 0.35) }, { category: "Procedure", amount: Math.round(s.billed * 0.25) }],
    expense_total: s.billed,
    predictions: [{ rejection_score: (i % 5) * 0.18, top_reasons: [{ reason: "Documentation complete", weight: 0.2, feature: "docs" }], model_name: "demo" }],
    validations: [{ rule_name: "Policy active", passed: true, message: "Within coverage", severity: "info" }],
    ocr_excerpt: `Patient ${s.name}, ${s.age}/${s.gender}. Dx: ${s.diagnosis}. Billed INR ${s.billed}.`,
    documents: CLAIMS[i].documents,
  };
}

const PREVIEWS: Record<string, ReturnType<typeof previewFor>> = {};
CLAIMS.forEach((c, i) => { PREVIEWS[c.id] = previewFor(i); });

// Claims created via demo upload (in-memory, this session).
const EXTRA: DemoClaim[] = [];

function genericPreview(id: string) {
  return {
    claim_id: id, status: "COMPLETED", policy_id: null,
    summary: { patient_name: "Demo Patient", age: "40", gender: "Male", hospital: "Demo Hospital", doctor: "Dr. Demo", diagnosis: "General checkup", policy_number: null, admission_date: "2026-06-01", discharge_date: "2026-06-03", total_amount: "50000" },
    parsed_fields: { patient_name: "Demo Patient", hospital: "Demo Hospital", diagnosis: "General checkup", total_amount: "50000", policy_number: "" },
    billed_total: 50000,
    icd_codes: [{ code: "Z00", description: "General exam", confidence: 0.9 }],
    cpt_codes: [{ code: "99213", description: "Office visit", confidence: 0.85 }],
    cost_summary: { icd_total: 30000, cpt_total: 20000, grand_total: 50000 },
    expenses: [{ category: "Room", amount: 20000 }, { category: "Pharmacy", amount: 18000 }, { category: "Procedure", amount: 12000 }],
    expense_total: 50000,
    predictions: [{ rejection_score: 0.1, top_reasons: [{ reason: "Documentation complete", weight: 0.1, feature: "docs" }], model_name: "demo" }],
    validations: [{ rule_name: "Policy active", passed: true, message: "Within coverage", severity: "info" }],
    ocr_excerpt: "Demo Patient, 40/Male. Dx: General checkup. Billed INR 50000.",
    documents: [],
  };
}

/** Return mock JSON for a known read endpoint, or null if unmatched. */
export function getDemoResponse(url: string): unknown | null {
  const path = url.split("?")[0];
  if (/\/claims$/.test(path)) return { claims: [...EXTRA, ...CLAIMS] };
  const preview = path.match(/\/claims\/([^/]+)\/preview$/);
  if (preview) return PREVIEWS[preview[1]] ?? genericPreview(preview[1]);
  if (/\/claims\/[^/]+\/progress$/.test(path)) return { is_complete: true, percentage: 100, status: "COMPLETED" };
  if (/\/claims\/[^/]+\/audit$/.test(path)) return { entries: [] };
  return null;
}

/** Full demo responder used by the global fetch shim (reads, writes, chat). */
export function demoResponse(url: string, method: string, body?: string): unknown | null {
  const path = url.split("?")[0];
  const m = method.toUpperCase();
  const read = getDemoResponse(url);
  if (read != null) return read;
  if (/\/claims\/[^/]+\/documents$/.test(path)) return { documents: [] };
  if (/\/claims\/[^/]+\/expenses$/.test(path)) return { expenses: [], expense_total: 0 };
  if (/\/providers$/.test(path)) return { current: "demo", providers: ["demo"] };
  if (/\/search/.test(path)) return { results: CLAIMS.slice(0, 5) };
  if (/\/chat$/.test(path) && m === "POST") {
    let q = "your claim"; try { q = (JSON.parse(body || "{}").message || q).slice(0, 80); } catch {}
    return { reply: `(demo) Based on the mock records, "${q}" is covered. ICD A09, billed within policy limits; no rejection flags.`, suggestions: ["Show diagnosis", "List documents", "Rejection risk?"] };
  }
  if (/\/claims$/.test(path) && m === "POST") {
    const id = `demo-new-${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();
    EXTRA.unshift({ id, policy_id: `POL-NEW-${id.slice(-4)}`, patient_id: null, status: "COMPLETED", source: "demo", created_at: now, updated_at: now, documents: [] });
    return { id, status: "COMPLETED", created_at: now, documents: [] };
  }
  if (m !== "GET") return { ok: true }; // demo: writes succeed as no-ops
  return null;
}

/** Wrap window.fetch: try the real backend first, fall back to mock data. */
export function installDemoFetch(): void {
  if (typeof window === "undefined" || !DEMO_AUTH) return;
  const w = window as unknown as { __demoFetch?: boolean };
  if (w.__demoFetch) return;
  w.__demoFetch = true;
  const real = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    const method = init?.method || (typeof input !== "string" && !(input instanceof URL) ? (input as Request).method : "GET");
    try {
      const res = await real(input, init);
      if (res.ok) return res;
      const d = demoResponse(url, method, typeof init?.body === "string" ? init.body : undefined);
      if (d != null) return new Response(JSON.stringify(d), { status: 200, headers: { "Content-Type": "application/json" } });
      return res;
    } catch (e) {
      const d = demoResponse(url, method, typeof init?.body === "string" ? init.body : undefined);
      if (d != null) return new Response(JSON.stringify(d), { status: 200, headers: { "Content-Type": "application/json" } });
      throw e;
    }
  };
}

installDemoFetch();
