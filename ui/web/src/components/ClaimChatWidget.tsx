"use client";
import { useState, useRef, useEffect } from "react";

type QA = { q: string; a: string; keys: string[] };
const QA_LIST: QA[] = [
  { q: "What is ClaimGPT?", a: "ClaimGPT is an AI platform that processes healthcare claims end-to-end — OCR, coding, rejection-risk, fraud triage and IRDAI submission — in minutes.", keys: ["what", "claimgpt", "about", "do"] },
  { q: "How does it help TPAs?", a: "It auto-extracts 20+ fields, assigns ICD-10/CPT codes, scores rejection risk in <120ms and flags fraud, cutting review from days to minutes.", keys: ["tpa", "help", "insurer", "review", "fast", "time"] },
  { q: "Is patient data safe?", a: "Yes. PHI is scrubbed before any AI call, the LLM is self-hosted with zero PHI egress, and every action is logged for HIPAA-grade audit.", keys: ["safe", "secur", "phi", "privacy", "data", "hipaa", "compliance"] },
  { q: "Does it support IRDAI forms?", a: "Yes — it generates fillable IRDAI Standard Reimbursement Claim Forms (70+ fields) plus TPA reports, and sends FHIR R4 / X12 837P to payers.", keys: ["irdai", "form", "submit", "fhir", "x12", "payer", "report"] },
  { q: "How does coding work?", a: "scispaCy NER assigns ICD-10 and CPT codes with confidence scores across 500+ ICD / 180+ CPT, with cost estimation.", keys: ["cod", "icd", "cpt", "diagnos"] },
  { q: "Who built it?", a: "WaferWire Cloud Technologies (WCT), a Microsoft partner with teams in Redmond, USA and Hyderabad, India.", keys: ["who", "built", "company", "waferwire", "wct", "contact"] },
];
const FALLBACK = "I cover ClaimGPT's features, security, coding, IRDAI submission and WaferWire. Try one of the suggestions, or ask about claims processing.";

type Msg = { from: "bot" | "user"; text: string };

function answer(q: string): string {
  const t = q.toLowerCase();
  let best = { a: FALLBACK, score: 0 };
  for (const qa of QA_LIST) {
    const score = qa.keys.reduce((s, k) => (t.includes(k) ? s + 1 : s), 0);
    if (score > best.score) best = { a: qa.a, score };
  }
  return best.a;
}

export default function ClaimChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: "Hi! I'm the ClaimGPT assistant. Ask me anything, or pick a question below." }]);
  const [val, setVal] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  const send = (q: string) => {
    const text = q.trim();
    if (!text) return;
    setMsgs((m) => [...m, { from: "user", text }, { from: "bot", text: answer(text) }]);
    setVal("");
  };

  return (
    <div className="cw">
      <style dangerouslySetInnerHTML={{ __html: CW_CSS }} />
      {open && (
        <div className="cw-panel" role="dialog" aria-label="ClaimGPT assistant">
          <div className="cw-head"><span className="cw-dot" />Ask ClaimGPT<button className="cw-x" onClick={() => setOpen(false)} aria-label="Close">×</button></div>
          <div className="cw-body">
            {msgs.map((m, i) => <div key={i} className={m.from === "bot" ? "cw-bot" : "cw-user"}>{m.text}</div>)}
            <div className="cw-qs">
              {QA_LIST.slice(0, 4).map((qa) => <button key={qa.q} className="cw-q" onClick={() => send(qa.q)}>{qa.q}</button>)}
            </div>
            <div ref={endRef} />
          </div>
          <form className="cw-input" onSubmit={(e) => { e.preventDefault(); send(val); }}>
            <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Type your question…" aria-label="Type your question" />
            <button type="submit" aria-label="Send">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </form>
        </div>
      )}
      <button className="cw-fab" onClick={() => setOpen((o) => !o)} aria-label="Chat with ClaimGPT">
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg width="30" height="30" viewBox="0 0 64 68" fill="none" aria-hidden><path d="M2 6 a4 4 0 0 1 4 -4 h36 l18 18 v44 a4 4 0 0 1 -4 4 h-50 a4 4 0 0 1 -4 -4 z" fill="#fff" /><path d="M42 2 v14 a4 4 0 0 0 4 4 h14" fill="none" stroke="#0d9488" strokeWidth="2.5" /><rect x="12" y="30" width="34" height="4" rx="2" fill="#0d9488" opacity=".55" /><rect x="12" y="40" width="26" height="4" rx="2" fill="#0d9488" opacity=".4" /><path d="M46 44 l3.5 8 l8 3.5 l-8 3.5 l-3.5 8 l-3.5 -8 l-8 -3.5 l8 -3.5 z" fill="#0d9488" /></svg>
        )}
      </button>
    </div>
  );
}

const CW_CSS = `
  .cw-fab { position:fixed; right:24px; bottom:24px; z-index:60; width:56px; height:56px; border:none; border-radius:50%;
    background:linear-gradient(135deg,#0f4c81,#0d9488); box-shadow:0 12px 30px -8px rgba(13,148,136,.6); cursor:pointer;
    display:flex; align-items:center; justify-content:center; transition:transform .15s; }
  .cw-fab:hover { transform:scale(1.06); }
  .cw-panel { position:fixed; right:24px; bottom:92px; z-index:60; width:340px; max-width:calc(100vw - 36px);
    background:#fff; border:1px solid #E8EBF0; border-radius:16px; box-shadow:0 30px 60px -20px rgba(16,24,40,.4); overflow:hidden;
    font-family:'Segoe UI',system-ui,sans-serif; animation:cwup .2s ease; display:flex; flex-direction:column; }
  @keyframes cwup { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  .cw-head { background:linear-gradient(135deg,#0f4c81,#0d9488); color:#fff; padding:14px 16px; font-weight:700; font-size:15px; display:flex; align-items:center; gap:8px; }
  .cw-dot { width:8px; height:8px; border-radius:50%; background:#7ee8da; animation:cwpulse 1.6s infinite; }
  @keyframes cwpulse { 0%{box-shadow:0 0 0 0 rgba(126,232,218,.6)} 70%{box-shadow:0 0 0 7px rgba(126,232,218,0)} }
  .cw-x { margin-left:auto; background:none; border:none; color:#fff; font-size:20px; cursor:pointer; line-height:1; }
  .cw-body { padding:14px; max-height:340px; overflow-y:auto; display:flex; flex-direction:column; gap:8px; }
  .cw-bot { background:#F1F5F9; color:#1f2937; padding:10px 12px; border-radius:10px 10px 10px 2px; font-size:13.5px; line-height:1.5; max-width:88%; align-self:flex-start; }
  .cw-user { background:linear-gradient(135deg,#0f4c81,#0d9488); color:#fff; padding:10px 12px; border-radius:10px 10px 2px 10px; font-size:13.5px; line-height:1.5; max-width:88%; align-self:flex-end; }
  .cw-qs { display:flex; flex-direction:column; gap:7px; margin-top:4px; }
  .cw-q { text-align:left; background:#fff; border:1px solid #d8e0ea; color:#0b3a67; padding:8px 11px; border-radius:9px; font-size:13px; font-weight:600; cursor:pointer; }
  .cw-q:hover { border-color:#0d9488; background:rgba(13,148,136,.06); }
  .cw-input { display:flex; gap:8px; padding:10px; border-top:1px solid #E8EBF0; }
  .cw-input input { flex:1; border:1px solid #d8e0ea; border-radius:9px; padding:10px 12px; font-size:13.5px; outline:none; }
  .cw-input input:focus { border-color:#0d9488; }
  .cw-input button { border:none; background:linear-gradient(135deg,#0f4c81,#0d9488); border-radius:9px; width:40px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
`;
