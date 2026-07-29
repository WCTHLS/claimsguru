import type { Metadata } from "next";
import Link from "next/link";
import ClaimChatWidget from "@/components/ClaimChatWidget";
import NavBrand from "@/components/NavBrand";

export const metadata: Metadata = {
  title: "ClaimGPT — AI-Powered Healthcare Claims Intelligence by WaferWire",
  description:
    "ClaimGPT helps TPAs and insurers automate claims review, ICD/CPT coding, validation, fraud detection, and IRDAI submission end-to-end. Built by WaferWire Cloud Technologies.",
};

const STYLES = `
  .lp { --ink:#0A0A0A; --ink-2:#111827; --emerald:#0d9488; --emerald-2:#0369a1; --emerald-3:#075985;
        --bg:#F7F8FA; --surface:#FFFFFF; --muted:#6B7280; --border:#E8EBF0;
        height:100vh; overflow-y:auto; overflow-x:hidden; scroll-behavior:smooth;
        --shadow-sm:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.10);
        --shadow:0 10px 30px -12px rgba(16,24,40,.18); --shadow-lg:0 30px 60px -20px rgba(16,24,40,.28);
        background:var(--bg); color:var(--ink);
        font-family:'Segoe UI','Segoe UI Web','Inter',system-ui,-apple-system,Helvetica,Arial,sans-serif;
        -webkit-font-smoothing:antialiased; }
  .lp a { color:inherit; text-decoration:none; }
  .lp-wrap { max-width:1320px; margin:0 auto; padding:0 40px; }

  /* Nav */
  .lp-nav { position:sticky; top:0; z-index:40; background:rgba(255,255,255,.8);
            backdrop-filter:saturate(160%) blur(12px); -webkit-backdrop-filter:saturate(160%) blur(12px);
            border-bottom:1px solid var(--border); }
  .lp-nav-inner { max-width:100%; margin:0; padding:14px 28px; display:flex; align-items:center; gap:24px; }
  .lp-brand { display:flex; align-items:center; gap:10px; font-weight:700; letter-spacing:-.3px; font-size:17px; }
  .lp-brand-mark { width:30px; height:30px; border-radius:8px; background:linear-gradient(135deg,#0f4c81,#0d9488); position:relative; display:inline-block; box-shadow:var(--shadow-sm); }
  .lp-brand-mark::after { content:""; position:absolute; inset:0; margin:auto; width:13px; height:13px; background:#fff; clip-path:polygon(45% 0,55% 0,55% 45%,100% 45%,100% 55%,55% 55%,55% 100%,45% 100%,45% 55%,0 55%,0 45%,45% 45%); }
  .lp-nav-links { display:flex; gap:22px; margin:0 auto; font-size:14px; color:#4B5563; font-weight:500; }
  .lp-nav-links a:hover { color:var(--ink); }
  .lp-nav-actions { display:flex; gap:10px; align-items:center; }
  .lp-nav-ghost { font-size:14px; font-weight:600; color:#374151; padding:8px 6px; }
  .lp-nav-cta { padding:9px 16px; border-radius:6px; background:linear-gradient(135deg,#0f4c81,#0d9488); color:#fff !important; font-size:13.5px; font-weight:600; box-shadow:var(--shadow-sm); }
  .lp-nav-cta:hover { filter:brightness(1.05); }

  /* Hero */
  .lp-hero { position:relative; overflow:hidden; padding:88px 0 72px; color:#fff;
             background:
               radial-gradient(1000px 460px at 82% 0%, rgba(13,148,136,.45), transparent 60%),
               radial-gradient(900px 420px at 5% 10%, rgba(37,99,235,.35), transparent 55%),
               linear-gradient(135deg,#06243f,#0b3a67 55%,#0d9488); }
  .lp-eyebrow { display:inline-flex; align-items:center; gap:8px; font-size:12px; letter-spacing:2px; text-transform:uppercase; font-weight:700;
                color:#cde8ff; padding:6px 12px; border:1px solid rgba(255,255,255,.28); border-radius:999px; background:rgba(255,255,255,.08); }
  .lp-h1 { margin:18px 0 0; font-size:60px; line-height:1.05; letter-spacing:-2.4px; font-weight:800; max-width:1100px; color:#fff; }
  .lp-h1 .em { background:linear-gradient(120deg,#7ee8da,#bfe3ff); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .lp-lede { margin:22px 0 0; font-size:19px; line-height:1.55; color:rgba(255,255,255,.85); max-width:660px; }
  .lp-cta-row { margin-top:30px; display:flex; flex-wrap:wrap; gap:12px; }
  .lp-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:13px 24px; border-radius:6px;
            font-weight:600; font-size:15px; border:1px solid transparent; transition:transform .12s, box-shadow .12s, background .12s; }
  .lp-btn:hover { transform:translateY(-1px); }
  .lp-btn-primary { background:linear-gradient(135deg,#0f4c81,#0d9488); color:#fff !important; box-shadow:var(--shadow); }
  .lp-btn-primary:hover { filter:brightness(1.05); }
  .lp-btn-ghost { background:#fff; color:var(--ink); border-color:var(--border); box-shadow:var(--shadow-sm); }
  .lp-hero .lp-btn-ghost { background:transparent; color:#fff; border-color:rgba(255,255,255,.5); box-shadow:none; }
  .lp-hero .lp-btn-ghost:hover { border-color:#fff; background:rgba(255,255,255,.08); }
  .lp-hero .lp-trust-label { color:rgba(255,255,255,.6); }
  .lp-hero .lp-trust-row span { color:rgba(255,255,255,.85); }
  .lp-badge { display:inline-block; margin:0 0 14px; font-size:12px; font-weight:700; letter-spacing:.3px; color:#06243f; background:#bfe3ff; padding:5px 12px; border-radius:999px; }
  .lp-btn-ghost:hover { border-color:var(--ink); }
  .lp-microcopy { margin-top:14px; font-size:13px; color:var(--muted); }
  .lp-hero-grid { display:grid; grid-template-columns:1.05fr .95fr; gap:48px; align-items:center; }
  .lp-mock { background:linear-gradient(135deg,#0f4c81,#0d9488); border-radius:18px; padding:14px; box-shadow:var(--shadow-lg); position:relative; animation:lpfloat 6s ease-in-out infinite; }
  .lp-mock-head { display:flex; align-items:center; gap:7px; padding:6px 8px 12px; }
  .lp-mock-dot { width:10px; height:10px; border-radius:50%; background:rgba(255,255,255,.45); }
  .lp-mock-title { margin-left:8px; color:#fff; font-size:12.5px; font-weight:600; opacity:.9; }
  .lp-mock-body { background:#fff; border-radius:12px; padding:18px; }
  .lp-mock-row { display:flex; justify-content:space-between; padding:9px 0; border-bottom:1px solid var(--border); font-size:14px; color:var(--muted); }
  .lp-mock-row b { color:var(--ink); }
  .lp-mock-row b.ok { color:#0d9488; }
  .lp-mock-bar { height:8px; background:#eef2f6; border-radius:99px; margin:14px 0 8px; overflow:hidden; }
  .lp-mock-bar i { display:block; height:100%; background:linear-gradient(90deg,#0f4c81,#0d9488); transform-origin:left; animation:lppulse 3s ease-in-out infinite; }
  .lp-mock-foot { font-size:13px; color:#0d9488; font-weight:600; }
  .lp-approve { position:absolute; right:-14px; bottom:-14px; display:flex; align-items:center; gap:8px; background:#fff; border:1px solid var(--border); border-radius:12px; padding:8px 14px 8px 8px; box-shadow:var(--shadow); transform:scale(0); animation:lppop .5s cubic-bezier(.2,1.4,.4,1) 1.3s forwards; }
  .lp-approve span { font-size:13px; font-weight:700; color:#0b3a67; }
  @keyframes lppop { to { transform:scale(1) } }

  /* Trust bar */
  .lp-trust { margin-top:52px; }
  .lp-trust-label { font-size:11.5px; letter-spacing:1.6px; text-transform:uppercase; color:#9CA3AF; font-weight:700; }
  .lp-trust-row { margin-top:14px; display:flex; flex-wrap:wrap; gap:14px 30px; align-items:center; }
  .lp-trust-row span { font-weight:700; font-size:15px; color:#9AA3AF; letter-spacing:-.2px; }

  /* Metrics band */
  .lp-band { background:#fff; color:var(--ink); padding:34px 0; border-bottom:1px solid var(--border); }
  .lp-band-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; text-align:center; }
  .lp-band-num { font-size:38px; font-weight:800; letter-spacing:-1.5px; color:#0b3a67; }
  .lp-band-num small { color:#0d9488; font-size:22px; }
  .lp-band-lbl { margin-top:4px; font-size:13.5px; color:var(--muted); }

  /* Section */
  .lp-section { padding:80px 0; }
  .lp-section.alt { background:#fff; border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
  .lp-eye { display:inline-flex; align-items:center; gap:8px; font-size:12px; letter-spacing:2px; text-transform:uppercase; color:var(--emerald-3); font-weight:700; }
  .lp-eye::before { content:""; width:22px; height:2px; background:var(--emerald); border-radius:2px; }
  .lp-h2 { margin:8px 0 12px; font-size:38px; letter-spacing:-1.2px; line-height:1.12; font-weight:800; max-width:820px; }
  .lp-sub { margin:0 0 32px; color:#374151; font-size:17px; line-height:1.55; max-width:720px; }

  .lp-grid-2 { display:grid; grid-template-columns:repeat(2,1fr); gap:20px; }
  .lp-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
  .lp-grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
  .lp-card { padding:30px 28px; min-height:170px; background:#fff; border:1px solid var(--border); border-radius:16px; box-shadow:var(--shadow-sm); transition:transform .12s, box-shadow .12s; }
  .lp-card:hover { transform:translateY(-3px); box-shadow:var(--shadow); }
  .lp-ic { width:40px; height:40px; border-radius:11px; background:rgba(3,105,161,.12); color:var(--emerald-3); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; margin-bottom:13px; }
  .lp-ico { width:22px; height:22px; }
  .lp-ct { font-size:16px; font-weight:700; letter-spacing:-.2px; }
  .lp-cb { margin-top:6px; font-size:14px; line-height:1.55; color:#4B5563; }

  .lp-pipeline { display:grid; grid-template-columns:repeat(5,1fr); gap:12px; position:relative; }
  .lp-flow { width:100%; height:104px; margin:4px 0 18px; }
  .lp-pipeline::before { content:""; position:absolute; top:50%; left:3%; right:3%; height:2px; border-radius:2px; z-index:0;
    background:linear-gradient(90deg,#0f4c81,#0d9488,#0f4c81); background-size:200% 100%; opacity:.18; animation:lpflow 3.5s linear infinite; }
  .lp-step { position:relative; z-index:1; padding:22px 18px; background:#fff; border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow-sm); }
  .lp-sn { font-size:11px; font-weight:700; letter-spacing:1.5px; color:var(--emerald-3); }
  .lp-si { width:26px; height:26px; margin-top:12px; animation:lpfloat 4s ease-in-out infinite; }
  .lp-step:nth-child(2) .lp-si{animation-delay:.4s} .lp-step:nth-child(3) .lp-si{animation-delay:.8s} .lp-step:nth-child(4) .lp-si{animation-delay:1.2s} .lp-step:nth-child(5) .lp-si{animation-delay:1.6s}
  @keyframes lpflow { to { background-position:200% 0 } }
  @keyframes lpfloat { 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-5px) } }
  @keyframes lppulse { 0%,100%{ transform:scaleX(.82); opacity:.85 } 50%{ transform:scaleX(1); opacity:1 } }
  .lp-st { margin-top:8px; font-size:15px; font-weight:700; }
  .lp-sb { margin-top:6px; font-size:13.5px; line-height:1.5; color:#4B5563; }

  .lp-check { list-style:none; padding:0; margin:8px 0 0; display:grid; grid-template-columns:repeat(2,1fr); gap:12px 28px; }
  .lp-check li { display:flex; gap:10px; align-items:flex-start; font-size:15px; line-height:1.5; color:#1F2937; }
  .lp-ck { flex:0 0 auto; width:20px; height:20px; border-radius:50%; background:rgba(3,105,161,.15); color:var(--emerald-3); display:inline-flex; align-items:center; justify-content:center; font-weight:800; font-size:11px; margin-top:1px; }

  /* Quote */
  .lp-quote { padding:48px 40px; background:#fff; border:1px solid var(--border); border-radius:24px; box-shadow:var(--shadow); }
  .lp-quote p { font-size:24px; line-height:1.4; font-weight:600; letter-spacing:-.4px; max-width:880px; color:var(--ink); }
  .lp-quote .em { color:var(--emerald-2); }
  .lp-quote footer { margin-top:18px; color:var(--muted); font-size:14px; }

  /* CTA */
  .lp-cta { padding:88px 0; text-align:center; }
  .lp-cta h2 { font-size:42px; letter-spacing:-1.4px; max-width:780px; margin:0 auto; line-height:1.15; font-weight:800; }
  .lp-cta p { margin:16px auto 28px; max-width:640px; color:#374151; font-size:17px; }

  /* FAQ */
  .lp-faq { display:grid; gap:10px; max-width:880px; }
  .lp-faq details { background:#fff; border:1px solid var(--border); border-radius:12px; padding:18px 20px; box-shadow:var(--shadow-sm); }
  .lp-faq summary { cursor:pointer; font-weight:600; font-size:15.5px; list-style:none; display:flex; justify-content:space-between; gap:16px; }
  .lp-faq summary::-webkit-details-marker { display:none; }
  .lp-faq summary::after { content:"+"; color:var(--muted); font-size:20px; }
  .lp-faq details[open] summary::after { content:"−"; }
  .lp-fb { margin-top:10px; color:#374151; font-size:14.5px; line-height:1.6; }

  /* Announcement strip */
  .lp-strip { background:#0b3a67; color:#fff; font-size:13.5px; text-align:center; padding:9px 16px; }
  .lp-strip a { color:#bfe3ff; font-weight:600; margin-left:8px; }
  /* Take next step */
  .lp-next { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:8px; }
  .lp-next-card { background:#fff; border:1px solid var(--border); border-radius:10px; padding:26px; box-shadow:var(--shadow-sm); transition:transform .12s, box-shadow .12s; }
  .lp-next-card:hover { transform:translateY(-3px); box-shadow:var(--shadow); }
  .lp-next-card h3 { font-size:18px; font-weight:700; margin:0 0 6px; }
  .lp-next-card p { font-size:14px; color:#4B5563; line-height:1.55; margin:0 0 14px; }

  /* Footer */
  .lp-footer { background:#fff; color:var(--muted); padding:56px 0 28px; border-top:1px solid var(--border); }
  .lp-footer .lp-wrap { max-width:100%; padding:0 28px; }
  .lp-foot-grid { display:grid; grid-template-columns:1.6fr 1fr 1fr; gap:32px; text-align:left; }
  .lp-foot h4 { color:var(--ink); font-size:13px; letter-spacing:.4px; margin:0 0 12px; }
  .lp-foot-desc { margin:12px 0 0; max-width:340px; font-size:14px; line-height:1.6; color:var(--muted); }
  .lp-foot-loc h4 { color:var(--ink); font-size:13px; letter-spacing:.4px; margin:0 0 12px; }
  .lp-foot-loc span { display:block; font-size:14px; padding:3px 0; color:#4B5563; }
  .lp-foot-brand { color:var(--ink); font-weight:700; font-size:18px; display:flex; align-items:center; gap:10px; }
  .lp-foot-bottom { margin-top:40px; padding-top:20px; border-top:1px solid var(--border); display:flex; flex-wrap:wrap; gap:12px; justify-content:space-between; font-size:13px; }

  .lp-btn:focus-visible, .lp-nav-cta:focus-visible, .lp-faq summary:focus-visible { outline:3px solid rgba(13,148,136,.45); outline-offset:2px; border-radius:6px; }
  @media (prefers-reduced-motion:reduce){ .lp-mock,.lp-si,.lp-mock-bar i,.lp-pipeline::before{animation:none} .lp-approve{animation:none;transform:scale(1)} }
  @media (max-width:960px){ .lp-h1{font-size:42px} .lp-hero-grid{grid-template-columns:1fr; gap:32px} .lp-grid-4,.lp-grid-3,.lp-grid-2,.lp-band-grid,.lp-next{grid-template-columns:1fr 1fr} .lp-pipeline{grid-template-columns:repeat(2,1fr)} .lp-check{grid-template-columns:1fr} .lp-foot-grid{grid-template-columns:1fr 1fr} }
  @media (max-width:600px){ .lp-h1{font-size:34px;letter-spacing:-1.2px} .lp-h2{font-size:28px} .lp-section{padding:56px 0} .lp-wrap{padding:0 20px} .lp-nav-inner{padding:14px 20px} .lp-grid-4,.lp-grid-3,.lp-grid-2,.lp-band-grid{grid-template-columns:1fr} .lp-nav-links{display:none} .lp-foot-grid{grid-template-columns:1fr} .lp-cta h2{font-size:30px} }
`;

function BrandMark() {
  // Concept 37 — folded document + emerald sparkle
  return (
    <svg width="28" height="28" viewBox="0 0 64 68" fill="none" aria-hidden style={{ flex: "0 0 auto" }}>
      <path d="M2 6 a4 4 0 0 1 4 -4 h36 l18 18 v44 a4 4 0 0 1 -4 4 h-50 a4 4 0 0 1 -4 -4 z" fill="#0f4c81" />
      <path d="M42 2 v14 a4 4 0 0 0 4 4 h14" fill="none" stroke="#fff" strokeWidth="2.5" opacity=".9" />
      <rect x="12" y="30" width="34" height="4" rx="2" fill="#fff" opacity=".7" />
      <rect x="12" y="40" width="26" height="4" rx="2" fill="#fff" opacity=".5" />
      <path d="M46 44 l3.5 8 l8 3.5 l-8 3.5 l-3.5 8 l-3.5 -8 l-8 -3.5 l8 -3.5 z" fill="#0d9488" />
    </svg>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  code: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
  eye: <><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>,
  shield: <><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="M9 12l2 2 4-4" /></>,
  scan: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9h16M9 4v16" /></>,
  fields: <><path d="M4 6h16M4 12h10M4 18h7" /></>,
  gauge: <><path d="M12 13l4-3" /><path d="M3 13a9 9 0 0 1 18 0" /><circle cx="12" cy="13" r="1.5" /></>,
  alert: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  send: <><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
  lock: <><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  server: <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" /></>,
  log: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
  azure: <><path d="M12 4l6 14H9l3-7-5 9h-3z" /></>,
};
function Icon({ n }: { n: string }) {
  return <svg className="lp-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONS[n]}</svg>;
}

export default function HomePage() {
  return (
    <main className="lp" id="top">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Announcement strip */}
      <div className="lp-strip">ClaimGPT runs on Microsoft Azure · self-hosted, HIPAA-aligned claims AI for TPAs &amp; insurers<a href="#how">See how it works →</a></div>

      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <NavBrand><BrandMark /><span>ClaimGPT</span></NavBrand>
          <div className="lp-nav-links"></div>
          <div className="lp-nav-actions">
            <Link className="lp-nav-ghost" href="/app">Sign in</Link>
            <Link className="lp-nav-cta" href="/app">Launch ClaimGPT</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="lp-hero">
        <div className="lp-wrap">
          <div className="lp-hero-grid">
            <div>
              <span className="lp-badge">★ Microsoft Partner · Built on Azure</span>
              <span className="lp-eyebrow">AI-Powered Healthcare Claims Intelligence</span>
              <h1 className="lp-h1">The enterprise platform to process claims <span className="em">in minutes, not days.</span></h1>
              <p className="lp-lede">ClaimGPT unifies review, ICD/CPT coding, rejection-risk scoring, fraud triage and IRDAI submission so TPAs and insurers cut turnaround, raise accuracy, and scale operations with confidence.</p>
              <div className="lp-cta-row">
                <Link className="lp-btn lp-btn-primary" href="/app">Launch ClaimGPT</Link>
                <a className="lp-btn lp-btn-ghost" href="#how">Book a walkthrough</a>
              </div>
              <p className="lp-microcopy">Microsoft Partner · deploys on Azure · self-hosted LLM · zero PHI egress · ISO 27001 · HIPAA-aligned</p>
            </div>
            <div className="lp-mock" aria-hidden>
              <div className="lp-mock-head"><span className="lp-mock-dot" /><span className="lp-mock-dot" /><span className="lp-mock-dot" /><span className="lp-mock-title">ClaimGPT · CLM-10428</span></div>
              <div className="lp-mock-body">
                <div className="lp-mock-row"><span>Patient</span><b>Abraham Jacob</b></div>
                <div className="lp-mock-row"><span>Diagnosis</span><b>ICD-10 · J18.9</b></div>
                <div className="lp-mock-row"><span>Billed</span><b>₹5,00,000</b></div>
                <div className="lp-mock-row"><span>Rejection risk</span><b className="ok">Low · 12%</b></div>
                <div className="lp-mock-row"><span>Fraud</span><b className="ok">LOW</b></div>
                <div className="lp-mock-bar"><i style={{ width: "78%" }} /></div>
                <div className="lp-mock-foot">Validated · IRDAI form ready</div>
              </div>
              <div className="lp-approve">
                <svg viewBox="0 0 48 48" width="40" height="40"><circle cx="24" cy="24" r="20" fill="none" stroke="#16c784" strokeWidth="4" strokeDasharray="126" strokeDashoffset="126"><animate attributeName="stroke-dashoffset" from="126" to="0" dur="0.7s" begin="0.3s" fill="freeze"/></circle><path d="M15 24l6 6 13-14" fill="none" stroke="#16c784" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="34" strokeDashoffset="34"><animate attributeName="stroke-dashoffset" from="34" to="0" dur="0.5s" begin="1s" fill="freeze"/></path></svg>
                <span>Claim approved</span>
              </div>
            </div>
          </div>
          <div className="lp-trust">
            <div className="lp-trust-label">Built for India's claims ecosystem</div>
            <div className="lp-trust-row"><span>Microsoft Azure</span><span>TPAs</span><span>Health Insurers</span><span>Hospital Desks</span><span>Fraud &amp; Audit</span></div>
          </div>
        </div>
      </header>

      {/* Metrics band */}
      <section className="lp-band"><div className="lp-wrap"><div className="lp-band-grid">
        <div><div className="lp-band-num">&lt;120<small>ms</small></div><div className="lp-band-lbl">Risk scoring latency</div></div>
        <div><div className="lp-band-num">11</div><div className="lp-band-lbl">Microservices, one gateway</div></div>
        <div><div className="lp-band-num">70<small>+</small></div><div className="lp-band-lbl">IRDAI fields auto-filled</div></div>
        <div><div className="lp-band-num">500<small>+</small></div><div className="lp-band-lbl">ICD / 180+ CPT codes</div></div>
      </div></div></section>

      {/* Problem */}
      <section className="lp-section alt"><div className="lp-wrap">
        <span className="lp-eye">The problem</span>
        <h2 className="lp-h2">Manual claims processing is slow, costly, and leaky.</h2>
        <div className="lp-grid-4">
          <div className="lp-card"><div className="lp-ic"><Icon n="clock" /></div><div className="lp-ct">Manual re-keying</div><p className="lp-cb">Reviewers retype 20+ fields per claim from scanned PDFs — hours of effort.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="code" /></div><div className="lp-ct">Inconsistent coding</div><p className="lp-cb">Wrong ICD/CPT drives rejections, rework and lost revenue.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="alert" /></div><div className="lp-ct">Fraud slips through</div><p className="lp-cb">Over-billing escapes manual checks with no early signal.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="shield" /></div><div className="lp-ct">Compliance risk</div><p className="lp-cb">Hand-filled forms bounce; no audit trail; PHI sent to external AI.</p></div>
        </div>
      </div></section>

      {/* How */}
      <section id="how" className="lp-section"><div className="lp-wrap">
        <span className="lp-eye">How it works</span>
        <h2 className="lp-h2">From upload to submission in four steps.</h2>
        <p className="lp-sub">A single intelligent layer connects fragmented workflows — less manual effort, better accuracy, faster claims across the lifecycle.</p>
        <svg className="lp-flow" viewBox="0 0 1000 120" role="img" aria-label="ClaimGPT pipeline">
          <line x1="60" y1="60" x2="940" y2="60" stroke="#dbe3ec" strokeWidth="4" strokeLinecap="round" />
          <line x1="60" y1="60" x2="940" y2="60" stroke="url(#fg)" strokeWidth="4" strokeLinecap="round" strokeDasharray="14 14"><animate attributeName="stroke-dashoffset" from="28" to="0" dur="0.9s" repeatCount="indefinite" /></line>
          <defs><linearGradient id="fg" x1="0" y1="0" x2="1000" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#0f4c81" /><stop offset="1" stopColor="#0d9488" /></linearGradient></defs>
          {[60,280,500,720,940].map((x,i)=>(<g key={i}><circle cx={x} cy="60" r="16" fill="#fff" stroke="#0d9488" strokeWidth="2.5"/><circle cx={x} cy="60" r="6" fill="#0d9488"><animate attributeName="r" values="6;9;6" dur="2s" begin={`${i*0.3}s`} repeatCount="indefinite"/></circle></g>))}
          <circle r="7" fill="#0f4c81"><animateMotion dur="3.5s" repeatCount="indefinite" path="M60,60 L940,60"/></circle>
        </svg>
        <div className="lp-pipeline">
          <div className="lp-step"><div className="lp-sn">01 · UPLOAD</div><svg className="lp-si" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 9 12 4 17 9"/><line x1="12" y1="4" x2="12" y2="16"/></svg><div className="lp-st">Upload</div><p className="lp-sb">Drop PDFs, scans, Word, Excel. Auto-dedupe and patient matching.</p></div>
          <div className="lp-step"><div className="lp-sn">02 · PROCESS</div><svg className="lp-si" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 12 4.6V4a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 3 1.51 1.65 1.65 0 0 0-.33 1.82l.06.06a2 2 0 0 1 0 2.83z"/></svg><div className="lp-st">Auto-process</div><p className="lp-sb">Extract, code, score and validate — automatically.</p></div>
          <div className="lp-step"><div className="lp-sn">03 · REVIEW</div><svg className="lp-si" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><div className="lp-st">Review &amp; ask</div><p className="lp-sb">Fix fields inline and ask questions in plain language.</p></div>
          <div className="lp-step"><div className="lp-sn">04 · SUBMIT</div><svg className="lp-si" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg><div className="lp-st">Submit</div><p className="lp-sb">Submission-ready IRDAI forms and payer files.</p></div>
          <div className="lp-step"><div className="lp-sn">05 · TRACK</div><svg className="lp-si" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg><div className="lp-st">Track</div><p className="lp-sb">Visibility across queues, stages and adjudication status.</p></div>
        </div>
      </div></section>

      {/* Quote */}
      <section className="lp-section alt"><div className="lp-wrap"><div className="lp-quote">
        <p>“Where claims operations, validation, and decisioning come together — <span className="em">days of manual work compressed into minutes.</span>”</p>
        <footer>Trusted by TPAs, insurers and hospital insurance desks — in India and beyond.</footer>
      </div></div></section>

      {/* Company */}
      <section id="company" className="lp-section"><div className="lp-wrap">
        <span className="lp-eye">Company</span>
        <h2 className="lp-h2">Engineered by WaferWire Cloud Technologies.</h2>
        <p className="lp-sub">WaferWire (WCT) is a global cloud, data and AI engineering company and a Microsoft partner, trusted by enterprises across healthcare, finance and the public sector. With delivery teams in the US and India, we design, build and run secure, large-scale software on Azure — ClaimGPT is our healthcare claims platform, built to self-host so protected data never leaves your environment.</p>
        <div className="lp-grid-3">
          <div className="lp-card"><div className="lp-ic"><Icon n="azure" /></div><div className="lp-ct">Microsoft partner</div><p className="lp-cb">Cloud-native apps and applied AI delivered on Microsoft Azure for regulated enterprises.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="shield" /></div><div className="lp-ct">Compliance-first</div><p className="lp-cb">IRDAI · ISO 27001 · DPDP · HIPAA-aligned with append-only audit trails.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="globe" /></div><div className="lp-ct">US &amp; India delivery</div><p className="lp-cb">Engineering across Redmond and Hyderabad; deployable in any Azure region.</p></div>
        </div>
        <div className="lp-grid-4" style={{ marginTop: 20 }}>
          <div className="lp-card"><div className="lp-band-num" style={{ color: "#0b3a67" }}>12+</div><div className="lp-ct">Years engineering</div><p className="lp-cb">Enterprise cloud, data and AI delivery.</p></div>
          <div className="lp-card"><div className="lp-band-num" style={{ color: "#0b3a67" }}>200+</div><div className="lp-ct">Projects shipped</div><p className="lp-cb">For startups to Fortune 500 enterprises.</p></div>
          <div className="lp-card"><div className="lp-band-num" style={{ color: "#0b3a67" }}>2</div><div className="lp-ct">Global offices</div><p className="lp-cb">Redmond, USA · Hyderabad, India.</p></div>
          <div className="lp-card"><div className="lp-band-num" style={{ color: "#0b3a67" }}>AI</div><div className="lp-ct">Applied ML team</div><p className="lp-cb">Risk models, NER coding, fraud analytics.</p></div>
        </div>
      </div></section>

      {/* Product */}
      <section id="product" className="lp-section alt"><div className="lp-wrap">
        <span className="lp-eye">The product</span>
        <h2 className="lp-h2">What ClaimGPT does for every claim.</h2>
        <p className="lp-sub">Drop in a stack of documents and ClaimGPT turns them into a decision-ready claim — extracted, coded, scored, validated and submission-ready — with a human reviewer always in control.</p>
        <div className="lp-grid-2">
          <div className="lp-card"><div className="lp-ct">Understands the paperwork</div><p className="lp-cb">Reads scanned PDFs, photos and forms, detects document types, de-duplicates pages and links them to the right patient — then pulls 20+ fields like diagnosis, dates, policy and expenses automatically.</p></div>
          <div className="lp-card"><div className="lp-ct">Codes &amp; estimates cost</div><p className="lp-cb">Assigns ICD-10 diagnosis and CPT procedure codes with confidence scores across 500+ ICD / 180+ CPT, with cost estimation — so coding is consistent, not guesswork.</p></div>
          <div className="lp-card"><div className="lp-ct">Scores risk &amp; fraud upfront</div><p className="lp-cb">Predicts rejection risk in under 120ms with the top contributing factors, and flags fraud as LOW / MEDIUM / HIGH before a reviewer ever opens the file.</p></div>
          <div className="lp-card"><div className="lp-ct">Validates &amp; submits</div><p className="lp-cb">Runs 11 deterministic rules, generates fillable IRDAI forms and TPA reports, and sends FHIR / X12 to the payer — with a full audit trail at every step.</p></div>
        </div>
        <ul className="lp-check" style={{ marginTop: 16 }}>
          <li><span className="lp-ck">✓</span> Conversational Q&amp;A on any claim — ask “why is this high risk?”</li>
          <li><span className="lp-ck">✓</span> Inline field correction with before/after diff</li>
          <li><span className="lp-ck">✓</span> Cross-document search to surface precedents</li>
          <li><span className="lp-ck">✓</span> Reimbursement &amp; cashless flows, INR-ready</li>
        </ul>
      </div></section>

      {/* Product deep-dive */}
      <section className="lp-section"><div className="lp-wrap">
        <span className="lp-eye">Inside the product</span>
        <h2 className="lp-h2">A capability for every stage of the claim.</h2>
        <p className="lp-sub">Eleven specialized services work together behind one workspace — so reviewers get a complete, decision-ready picture without switching tools.</p>
        <div className="lp-grid-3">
          <div className="lp-card"><div className="lp-ic"><Icon n="scan" /></div><div className="lp-ct">Document AI &amp; OCR</div><p className="lp-cb">Tesseract + OpenCV read every page; medical scans (MRI, CT, X-Ray, PET) auto-detected and classified.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="fields" /></div><div className="lp-ct">Field extraction</div><p className="lp-cb">LayoutLMv3 + 40 patterns pull 20+ fields — patient, policy, diagnosis, admission dates, expenses.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="code" /></div><div className="lp-ct">Medical coding</div><p className="lp-cb">scispaCy NER maps 500+ ICD-10 and 180+ CPT codes with confidence and cost estimates.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="gauge" /></div><div className="lp-ct">Rejection risk</div><p className="lp-cb">XGBoost + LightGBM score risk in &lt;120ms with the top-5 contributing factors explained.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="alert" /></div><div className="lp-ct">Fraud triage</div><p className="lp-cb">10 deterministic rules + ML anomaly + optional LLM flag LOW / MEDIUM / HIGH risk.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="send" /></div><div className="lp-ct">Forms &amp; submission</div><p className="lp-cb">Fillable IRDAI claim forms (70+ fields), TPA reports, FHIR R4 and X12 837P to payers.</p></div>
        </div>
      </div></section>

      {/* Security */}
      <section id="security" className="lp-section"><div className="lp-wrap">
        <span className="lp-eye">Security &amp; privacy</span>
        <h2 className="lp-h2">Protecting sensitive patient information by design.</h2>
        <p className="lp-sub">Healthcare claims carry the most sensitive data there is. ClaimGPT keeps it protected end-to-end — patient information stays inside your environment, scrubbed before any AI ever sees it, with every action logged.</p>
        <div className="lp-grid-3">
          <div className="lp-card"><div className="lp-ic"><Icon n="shield" /></div><div className="lp-ct">PHI auto-scrubbing</div><p className="lp-cb">SSN, phone, email, MRN, DOB and policy numbers are stripped before any model call.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="server" /></div><div className="lp-ct">Self-hosted LLM</div><p className="lp-cb">Run on-prem or in your cloud — zero PHI egress to external APIs.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="users" /></div><div className="lp-ct">Role-based access</div><p className="lp-cb">Granular RBAC so reviewers, coders and approvers see only what they should.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="log" /></div><div className="lp-ct">Append-only audit log</div><p className="lp-cb">Every view, edit and decision is recorded for HIPAA-grade traceability.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="lock" /></div><div className="lp-ct">Compliance-aligned</div><p className="lp-cb">IRDAI · ISO 27001 · DPDP · HIPAA-aligned workflows.</p></div>
          <div className="lp-card"><div className="lp-ic"><Icon n="globe" /></div><div className="lp-ct">Data stays in-region</div><p className="lp-cb">Deployable in your own region with isolated, encrypted storage.</p></div>
        </div>
      </div></section>

      {/* FAQ */}
      <section id="faq" className="lp-section alt"><div className="lp-wrap">
        <span className="lp-eye">FAQ</span>
        <h2 className="lp-h2">Frequently asked questions.</h2>
        <div className="lp-faq">
          <details><summary>What is AI-powered claims processing?</summary><p className="lp-fb">It uses AI, OCR, ML and automation to extract, validate, review and process medical claims faster and more accurately than manual workflows.</p></details>
          <details><summary>How does ClaimGPT help TPAs?</summary><p className="lp-fb">It automates review, ICD coding, validation, fraud checks and risk scoring to cut turnaround and workload.</p></details>
          <details><summary>Can it integrate with existing systems?</summary><p className="lp-fb">Yes — integrates via FHIR R4 and X12 837P without full platform replacement.</p></details>
          <details><summary>Does it support IRDAI compliance?</summary><p className="lp-fb">Yes — configurable validation, audit-ready processing, and fillable IRDAI Standard Reimbursement Claim Forms.</p></details>
          <details><summary>Is patient data sent to external AI?</summary><p className="lp-fb">No. A self-hosted LLM with PHI scrubbing keeps protected data in your environment.</p></details>
        </div>
      </div></section>

      {/* Impact */}
      <section className="lp-section"><div className="lp-wrap">
        <span className="lp-eye">Impact</span>
        <h2 className="lp-h2">Outcomes claims teams see with ClaimGPT.</h2>
        <div className="lp-grid-3">
          <div className="lp-card"><div className="lp-band-num" style={{ color: "#0b3a67" }}>30–50<small>%</small></div><div className="lp-ct">Less manual review</div><p className="lp-cb">Auto-extraction and coding remove hours of re-keying per claim.</p></div>
          <div className="lp-card"><div className="lp-band-num" style={{ color: "#0b3a67" }}>40<small>%+</small></div><div className="lp-ct">Faster validation</div><p className="lp-cb">11 rules and risk scoring clear clean claims in seconds.</p></div>
          <div className="lp-card"><div className="lp-band-num" style={{ color: "#0b3a67" }}>100<small>%</small></div><div className="lp-ct">Auditable decisions</div><p className="lp-cb">Every action logged for HIPAA-grade traceability.</p></div>
        </div>
      </div></section>

      {/* Take the next step */}
      <section className="lp-section"><div className="lp-wrap">
        <span className="lp-eye">Take the next step</span>
        <h2 className="lp-h2">Get started with ClaimGPT.</h2>
        <div className="lp-next">
          <div className="lp-next-card"><h3>Launch the workspace</h3><p>Open ClaimGPT and process your first claim end-to-end in minutes.</p><Link className="lp-btn lp-btn-primary" href="/app">Launch ClaimGPT</Link></div>
          <div className="lp-next-card"><h3>Talk to our team</h3><p>Walk through a deployment for your TPA or insurer with our specialists.</p><a className="lp-btn lp-btn-ghost" href="mailto:claimgpt@waferwire.com">Contact sales</a></div>
          <div className="lp-next-card"><h3>Deploy on Azure</h3><p>Self-host on Microsoft Azure with zero PHI egress and full audit.</p><a className="lp-btn lp-btn-ghost" href="#security">See security</a></div>
        </div>
      </div></section>

      {/* CTA */}
      <section className="lp-cta"><div className="lp-wrap">
        <h2>Ready to modernize your claims operations?</h2>
        <p>Reduce bottlenecks, improve accuracy, and accelerate decisions with AI-assisted claims workflows.</p>
        <Link className="lp-btn lp-btn-primary" href="/app">Launch ClaimGPT</Link>
      </div></section>

      {/* Footer */}
      <footer className="lp-footer"><div className="lp-wrap">
        <div className="lp-foot-grid">
          <div className="lp-foot-co">
            <div className="lp-foot-brand"><BrandMark /> ClaimGPT</div>
            <p className="lp-foot-desc">AI-powered healthcare claims intelligence for TPAs and insurers. Built by WaferWire Cloud Technologies.</p>
          </div>
          <div className="lp-foot-loc"><h4>US Office (HQ)</h4><span>4034 148th Ave NE</span><span>Redmond, WA — 98052</span><span>+1 425-484-3430</span></div>
          <div className="lp-foot-loc"><h4>India Office</h4><span>4th Floor, Western Aqua, Plot 1-4</span><span>Whitefields, Kondapur</span><span>Hyderabad, Telangana — 500084</span></div>
        </div>
        <div className="lp-foot-bottom"><div>© 2026 WaferWire Cloud Technologies · ClaimGPT</div><div>Redmond, USA · Hyderabad, India</div></div>
      </div></footer>

      <ClaimChatWidget />
    </main>
  );
}
