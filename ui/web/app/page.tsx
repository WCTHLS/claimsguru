import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ClaimChatWidget from "@/components/claimgpt/claim-chat-widget";
import NavBrand from "@/components/claimgpt/nav-brand";

export const metadata: Metadata = {
  title: "ClaimsGuru by WCT: Healthcare Claims Intake and Adjudication Platform",
  description:
    "ClaimsGuru by WaferWire Cloud Technologies (WCT) is the intelligent health insurance claims intake and review platform for India. Submit and track reimbursement dossiers on mobile, review and adjudicate on web. IRDAI Part A and B aligned.",
};

const STYLES = `
  .lp { --ink:#0A0A0A; --ink-2:#111827; --teal:#0d9488; --teal-dark:#0f766e; --teal-light:#ccfbf1;
        --navy:#06243f; --navy-2:#0b3a67; --navy-light:#bfe3ff;
        --bg:#F8FAFC; --surface:#FFFFFF; --muted:#64748B; --border:#E2E8F0;
        height:100vh; overflow-y:auto; overflow-x:hidden; scroll-behavior:smooth;
        --shadow-xs:0 1px 2px rgba(15,23,42,.05);
        --shadow-sm:0 1px 3px rgba(15,23,42,.08),0 1px 2px rgba(15,23,42,.04);
        --shadow:0 10px 25px -5px rgba(15,23,42,.10),0 8px 10px -6px rgba(15,23,42,.05);
        --shadow-lg:0 25px 50px -12px rgba(15,23,42,.22);
        background:var(--bg); color:var(--ink);
        font-family:'Segoe UI','Segoe UI Web','Inter',system-ui,-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;
        -webkit-font-smoothing:antialiased; }
  .lp a { color:inherit; text-decoration:none; }
  .lp-wrap { max-width:1300px; margin:0 auto; padding:0 36px; }

  /* Announcement strip */
  .lp-strip { background:#06243f; color:#e2e8f0; font-size:13px; text-align:center; padding:10px 20px; border-bottom:1px solid rgba(255,255,255,.08); }
  .lp-strip span.pill { background:#0d9488; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px; padding:3px 8px; border-radius:4px; margin-right:10px; }
  .lp-strip a { color:#7ee8da; font-weight:600; margin-left:8px; text-decoration:underline; }

  /* Nav */
  .lp-nav { position:sticky; top:0; z-index:50; background:rgba(255,255,255,.92);
            backdrop-filter:saturate(180%) blur(16px); -webkit-backdrop-filter:saturate(180%) blur(16px);
            border-bottom:1px solid var(--border); }
  .lp-nav-inner { max-width:1300px; margin:0 auto; padding:14px 36px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
  .lp-brand-box { display:flex; align-items:center; gap:10px; flex-shrink:0; }
  .lp-by-badge { font-size:11px; font-weight:700; color:#0f766e; background:#ccfbf1; border:1px solid #99f6e4; padding:3px 8px; border-radius:6px; white-space:nowrap; }
  .lp-nav-links { display:flex; gap:26px; font-size:14px; color:#475569; font-weight:600; }
  .lp-nav-links a { transition:color .15s; }
  .lp-nav-links a:hover { color:#0f766e; }
  .lp-nav-actions { display:flex; gap:10px; align-items:center; flex-shrink:0; }
  .lp-nav-ghost { font-size:14px; font-weight:600; color:#1e293b; padding:8px 12px; transition:color .15s; white-space:nowrap; }
  .lp-nav-ghost:hover { color:#0d9488; }
  .lp-nav-cta { padding:10px 20px; min-height:44px; display:inline-flex; align-items:center; justify-content:center; border-radius:8px; background:linear-gradient(135deg,#0b3a67,#0d9488); color:#fff !important; font-size:13.5px; font-weight:600; box-shadow:var(--shadow-sm); transition:transform .12s, box-shadow .12s, filter .12s; white-space:nowrap; text-align:center; touch-action:manipulation; }
  .lp-nav-cta:hover { transform:translateY(-1px); filter:brightness(1.06); box-shadow:var(--shadow); }
  .lp-strip-mobile { display:none; }
  .lp-strip-desktop { display:inline; }
  .lp-cta-text-mobile { display:none; }
  .lp-cta-text-desktop { display:inline; }

  /* Hero */
  .lp-hero { position:relative; overflow:hidden; padding:76px 0 72px; color:#fff;
             background:
               radial-gradient(1100px 520px at 85% 0%, rgba(13,148,136,.42), transparent 60%),
               radial-gradient(900px 480px at 8% 15%, rgba(11,58,103,.50), transparent 55%),
               linear-gradient(135deg,#041a2e,#06243f 50%,#0b3a67 85%,#0d9488); }
  .lp-hero-grid { display:grid; grid-template-columns:1.12fr .88fr; gap:44px; align-items:center; }
  .lp-badge { display:inline-flex; align-items:center; gap:8px; margin:0 0 16px; font-size:12px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:#ccfbf1; background:rgba(13,148,136,.22); border:1px solid rgba(13,148,136,.45); padding:6px 14px; border-radius:999px; }
  .lp-h1 { margin:10px 0 0; font-size:52px; line-height:1.1; letter-spacing:-2px; font-weight:800; color:#fff; }
  .lp-h1 .em { background:linear-gradient(120deg,#7ee8da 10%,#bfe3ff 90%); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .lp-lede { margin:22px 0 0; font-size:18px; line-height:1.6; color:rgba(255,255,255,.88); max-width:680px; }
  .lp-cta-row { margin-top:32px; display:flex; flex-wrap:wrap; gap:14px; align-items:center; }
  .lp-btn { display:inline-flex; align-items:center; justify-content:center; gap:9px; padding:13px 26px; min-height:48px; border-radius:10px; font-weight:600; font-size:14.5px; border:1px solid transparent; transition:transform .12s, box-shadow .12s, filter .12s; touch-action:manipulation; -webkit-tap-highlight-color:transparent; }
  .lp-btn:hover { transform:translateY(-1px); }
  .lp-btn-primary { background:linear-gradient(135deg,#0d9488,#0b3a67); color:#fff !important; box-shadow:var(--shadow); }
  .lp-btn-primary:hover { filter:brightness(1.08); }
  .lp-btn-outline { background:rgba(255,255,255,.08); color:#fff; border-color:rgba(255,255,255,.32); }
  .lp-btn-outline:hover { background:rgba(255,255,255,.16); border-color:#fff; }
  .lp-microcopy { margin-top:18px; font-size:13px; color:rgba(255,255,255,.8); display:flex; flex-wrap:wrap; gap:14px; align-items:center; }
  .lp-microcopy span { display:inline-flex; align-items:center; gap:6px; }

  /* Hero right card: Dual access preview */
  .lp-hero-card { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.2); border-radius:20px; padding:24px; backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); box-shadow:var(--shadow-lg); }
  .lp-hcard-header { display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,.15); padding-bottom:16px; margin-bottom:18px; }
  .lp-hcard-title { font-size:14px; font-weight:700; color:#fff; display:flex; align-items:center; gap:8px; }
  .lp-status-live { display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700; color:#34d399; background:rgba(52,211,153,.15); border:1px solid rgba(52,211,153,.3); padding:3px 10px; border-radius:999px; }
  .lp-status-live::before { content:""; width:6px; height:6px; border-radius:50%; background:#34d399; box-shadow:0 0 8px #34d399; }
  
  .lp-pipeline-preview { background:#fff; border-radius:14px; padding:18px; color:var(--ink); box-shadow:var(--shadow-sm); }
  .lp-pp-head { display:flex; justify-content:space-between; font-size:13px; margin-bottom:12px; }
  .lp-pp-head b { color:#0f766e; }
  .lp-pp-bar { height:7px; background:#e2e8f0; border-radius:99px; overflow:hidden; margin-bottom:14px; }
  .lp-pp-bar-fill { height:100%; width:65%; background:linear-gradient(90deg,#0d9488,#0369a1); border-radius:99px; }
  .lp-pp-steps { display:grid; grid-template-columns:repeat(5,1fr); gap:6px; font-size:11px; text-align:center; font-weight:600; color:#64748b; }
  .lp-pp-step.done { color:#0f766e; }
  .lp-pp-step.active { color:#0369a1; font-weight:700; }
  .lp-pp-step .dot { width:18px; height:18px; border-radius:50%; margin:0 auto 4px; display:flex; align-items:center; justify-content:center; font-size:10px; }
  .lp-pp-step.done .dot { background:#ccfbf1; color:#0f766e; }
  .lp-pp-step.active .dot { background:#e0f2fe; color:#0369a1; border:2px solid #0284c7; }
  .lp-pp-step.pending .dot { background:#f1f5f9; color:#94a3b8; }

  .lp-card-checklist-box { margin-top:16px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.15); border-radius:12px; padding:14px; font-size:12.5px; }
  .lp-card-checklist-box h4 { margin:0 0 8px; font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#93c5fd; }
  .lp-check-tags { display:flex; flex-wrap:wrap; gap:6px; }
  .lp-tag { background:rgba(255,255,255,.12); color:#fff; padding:3px 9px; border-radius:6px; font-size:11.5px; }

  /* Section general */
  .lp-section { padding:84px 0; }
  .lp-section.alt { background:#fff; border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
  .lp-section.slate { background:#0f172a; color:#fff; }
  .lp-eye { display:inline-flex; align-items:center; gap:8px; font-size:11.5px; letter-spacing:2px; text-transform:uppercase; color:#0f766e; font-weight:700; margin-bottom:8px; }
  .lp-eye::before { content:""; width:20px; height:2px; background:#0d9488; border-radius:2px; }
  .lp-h2 { margin:6px 0 14px; font-size:38px; letter-spacing:-1.2px; line-height:1.15; font-weight:800; max-width:840px; color:#0f172a; }
  .lp-section.slate .lp-h2 { color:#fff; }
  .lp-sub { margin:0 0 36px; color:#475569; font-size:17px; line-height:1.6; max-width:760px; }
  .lp-section.slate .lp-sub { color:#94a3b8; }

  /* Grid styles */
  .lp-grid-2 { display:grid; grid-template-columns:repeat(2,1fr); gap:24px; }
  .lp-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:22px; }
  .lp-grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }

  /* Cards */
  .lp-card { padding:28px; background:#fff; border:1px solid var(--border); border-radius:16px; box-shadow:var(--shadow-xs); transition:transform .14s, box-shadow .14s, border-color .14s; }
  .lp-card:hover { transform:translateY(-3px); box-shadow:var(--shadow); border-color:#cbd5e1; }
  .lp-card.highlight { border-color:#99f6e4; background:linear-gradient(180deg,#f0fdfa,#ffffff); }
  .lp-card-head { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
  .lp-ic { width:42px; height:42px; border-radius:12px; background:#f0fdfa; color:#0d9488; display:flex; align-items:center; justify-content:center; font-weight:800; }
  .lp-ic.navy { background:#f0f9ff; color:#0369a1; }
  .lp-ct { font-size:16.5px; font-weight:700; color:#0f172a; }
  .lp-cb { font-size:14px; line-height:1.6; color:#475569; margin:0; }

  /* ========================================================================= */
  /* MOBILE APP SHOWCASE SECTION */
  /* ========================================================================= */
  .lp-mobile-showcase { padding:96px 0; background:linear-gradient(180deg,#ffffff 0%,#f1f5f9 100%); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
  .lp-mobile-grid { display:grid; grid-template-columns:1.05fr 1fr; gap:54px; align-items:center; }
  .lp-mockup-duo { display:flex; gap:20px; justify-content:center; position:relative; }
  
  /* Phone Frame Styling */
  .lp-mockup-duo { display:flex; gap:24px; justify-content:center; align-items:flex-start; position:relative; }
  .lp-phone-frame { 
    width:268px; 
    height:552px; 
    background:#0b1120; 
    border-radius:36px; 
    padding:16px 8px 12px 8px; 
    box-shadow:0 25px 60px -15px rgba(15,23,42,.35), 0 0 0 2px #334155, 0 0 0 5px #020617; 
    position:relative; 
    box-sizing:border-box;
  }
  .lp-phone-frame.offset { margin-top:32px; }
  .lp-phone-speaker { 
    position:absolute; 
    top:6px; 
    left:50%; 
    transform:translateX(-50%); 
    width:42px; 
    height:3.5px; 
    background:#334155; 
    border-radius:3px; 
    z-index:20; 
  }
  .lp-phone-screen { 
    width:100%; 
    height:100%; 
    border-radius:22px; 
    overflow:hidden; 
    background:#f8fafc; 
    position:relative; 
  }
  .lp-phone-screen img { 
    width:100%; 
    height:100%; 
    object-fit:cover; 
    object-position:top center; 
    display:block; 
  }

  /* Store Download Badges */
  .lp-store-row { margin-top:32px; display:flex; flex-wrap:wrap; gap:16px; align-items:center; }
  .lp-store-badge { display:inline-flex; align-items:center; gap:12px; min-height:52px; background:#0f172a; color:#fff !important; padding:12px 20px; border-radius:12px; border:1px solid #334155; transition:transform .15s, background .15s, box-shadow .15s; box-shadow:var(--shadow-sm); touch-action:manipulation; }
  .lp-store-badge:hover { transform:translateY(-2px); background:#1e293b; box-shadow:var(--shadow); }
  .lp-store-badge.disabled { cursor:default; pointer-events:none; user-select:none; }
  .lp-store-badge.disabled:hover { transform:none; background:#0f172a; box-shadow:var(--shadow-sm); }
  .lp-store-badge svg { width:26px; height:26px; fill:currentColor; flex-shrink:0; }
  .lp-store-badge-text { display:flex; flex-direction:column; text-align:left; line-height:1.15; }
  .lp-store-sub { font-size:10px; font-weight:500; color:#94a3b8; text-transform:uppercase; letter-spacing:.6px; }
  .lp-store-main { font-size:15px; font-weight:700; color:#fff; letter-spacing:-.2px; }
  .lp-store-note { margin-top:14px; font-size:12.5px; color:#64748b; }

  /* Feature list */
  .lp-feat-list { list-style:none; padding:0; margin:24px 0 0; display:grid; gap:16px; }
  .lp-feat-item { display:flex; gap:14px; align-items:flex-start; }
  .lp-feat-icon { width:28px; height:28px; border-radius:8px; background:#ccfbf1; color:#0f766e; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:13px; font-weight:800; margin-top:2px; }
  .lp-feat-title { font-size:15px; font-weight:700; color:#0f172a; margin-bottom:2px; }
  .lp-feat-desc { font-size:13.5px; color:#64748b; line-height:1.5; margin:0; }

  /* ========================================================================= */
  /* DUAL ROLES SECTION: Patients vs TPAs */
  /* ========================================================================= */
  .lp-dual-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:28px; margin-top:28px; }
  .lp-dual-card { padding:36px; border-radius:20px; border:1px solid var(--border); background:#fff; box-shadow:var(--shadow-sm); position:relative; overflow:hidden; }
  .lp-dual-card.patient { border-top:4px solid #0d9488; }
  .lp-dual-card.enterprise { border-top:4px solid #0369a1; background:#f8fafc; }
  .lp-dual-badge { display:inline-block; font-size:11.5px; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:4px 10px; border-radius:6px; margin-bottom:14px; }
  .lp-dual-card.patient .lp-dual-badge { background:#ccfbf1; color:#0f766e; }
  .lp-dual-card.enterprise .lp-dual-badge { background:#e0f2fe; color:#0369a1; }
  .lp-dual-title { font-size:22px; font-weight:800; color:#0f172a; margin:0 0 10px; }
  .lp-dual-desc { font-size:14.5px; line-height:1.6; color:#475569; margin-bottom:20px; }
  .lp-dual-features { list-style:none; padding:0; margin:0 0 24px; display:grid; gap:10px; }
  .lp-dual-features li { display:flex; gap:10px; align-items:center; font-size:14px; color:#334155; }
  .lp-dual-features li svg { color:#0d9488; flex-shrink:0; }

  /* ========================================================================= */
  /* CHECKLIST SECTION */
  /* ========================================================================= */
  .lp-checklist-card { background:#fff; border:1px solid var(--border); border-radius:18px; padding:32px; box-shadow:var(--shadow-sm); }
  .lp-chk-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:24px; }
  .lp-chk-col { background:#f8fafc; border:1px solid var(--border); border-radius:12px; padding:20px; }
  .lp-chk-col h4 { margin:0 0 12px; font-size:14px; font-weight:700; color:#0f172a; display:flex; align-items:center; gap:8px; }
  .lp-chk-list { list-style:none; padding:0; margin:0; display:grid; gap:8px; }
  .lp-chk-item { font-size:13px; color:#475569; display:flex; gap:8px; align-items:flex-start; line-height:1.45; }
  .lp-chk-item svg { color:#0d9488; flex-shrink:0; margin-top:3px; }

  /* 5-Step Process Pipeline */
  .lp-process-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; margin-top:32px; }
  .lp-process-step { background:#fff; border:1px solid var(--border); border-radius:14px; padding:22px 18px; box-shadow:var(--shadow-xs); position:relative; }
  .lp-pstep-num { font-size:11px; font-weight:800; letter-spacing:1px; color:#0f766e; margin-bottom:8px; }
  .lp-pstep-title { font-size:15px; font-weight:700; color:#0f172a; margin-bottom:6px; }
  .lp-pstep-desc { font-size:13px; line-height:1.5; color:#64748b; margin:0; }

  /* FAQ */
  .lp-faq { display:grid; gap:12px; max-width:900px; margin:0 auto; }
  .lp-faq details { background:#fff; border:1px solid var(--border); border-radius:12px; padding:18px 22px; box-shadow:var(--shadow-xs); }
  .lp-faq summary { cursor:pointer; font-weight:700; font-size:16px; list-style:none; display:flex; justify-content:space-between; align-items:center; color:#0f172a; }
  .lp-faq summary::-webkit-details-marker { display:none; }
  .lp-faq summary::after { content:"+"; font-size:22px; color:#94a3b8; font-weight:400; }
  .lp-faq details[open] summary::after { content:"-"; }
  .lp-faq-body { margin-top:12px; color:#475569; font-size:14.5px; line-height:1.6; }

  /* CTA Banner */
  .lp-cta-banner { padding:84px 0; background:linear-gradient(135deg,#041a2e,#06243f 50%,#0b3a67 85%,#0d9488); color:#fff; text-align:center; }
  .lp-cta-banner h2 { font-size:42px; font-weight:800; letter-spacing:-1.2px; max-width:800px; margin:0 auto 16px; color:#fff; }
  .lp-cta-banner p { font-size:17px; color:rgba(255,255,255,.85); max-width:640px; margin:0 auto 32px; }

  /* ========================================================================= */
  /* OFFICIAL WCT CORPORATE FOOTER (Matched to User Reference Image) */
  /* ========================================================================= */
  .wct-footer { background:#111827; color:#cbd5e1; padding:70px 0 28px; font-size:14px; position:relative; border-top:1px solid #1f2937; }
  .wct-foot-top { display:grid; grid-template-columns:1.4fr repeat(5, 1fr); gap:28px; padding-bottom:50px; border-bottom:1px solid rgba(255,255,255,.1); }
  
  /* WCT Logo representation */
  .wct-brand-col { display:flex; flex-direction:column; align-items:flex-start; }
  .wct-logo-wrap { display:inline-flex; align-items:center; gap:14px; margin-bottom:16px; }
  .wct-logo-text { font-size:32px; font-weight:800; color:#fff; letter-spacing:1px; }

  .wct-foot-col h4 { color:#fff; font-size:14px; font-weight:700; margin:0 0 16px; letter-spacing:.2px; }
  .wct-foot-col ul { list-style:none; padding:0; margin:0; display:grid; gap:10px; }
  .wct-foot-col ul li { font-size:13.5px; color:#cbd5e1; transition:color .15s; }
  .wct-foot-col ul li a { color:#cbd5e1; transition:color .15s; }
  .wct-foot-col ul li a:hover { color:#38bdf8; }

  .wct-foot-bottom { margin-top:30px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:18px; font-size:13px; color:#94a3b8; }
  .wct-badge-cmmi { display:inline-flex; align-items:center; background:#fff; color:#0f172a; padding:6px 14px; border-radius:8px; font-weight:800; font-size:12px; letter-spacing:.3px; box-shadow:0 2px 4px rgba(0,0,0,.2); }
  .wct-badge-cmmi span.blue { color:#0284c7; }
  .wct-foot-center { text-align:center; }
  .wct-foot-center a { color:#cbd5e1; margin:0 6px; }
  .wct-foot-center a:hover { color:#fff; }
  .wct-foot-social { display:inline-flex; align-items:center; gap:12px; }
  .wct-foot-social a { color:#94a3b8; transition:color .15s; }
  .wct-foot-social a:hover { color:#38bdf8; }

  @media (max-width:1100px){
    .wct-foot-top { grid-template-columns:1fr 1fr 1fr; gap:32px; }
  }
  @media (max-width:1024px){
    .lp-hero-grid, .lp-mobile-grid { grid-template-columns:1fr; gap:40px; }
    .lp-dual-grid { grid-template-columns:1fr; }
    .lp-process-grid { grid-template-columns:repeat(2,1fr); }
    .lp-chk-grid { grid-template-columns:1fr; }
    .lp-grid-4, .lp-grid-3 { grid-template-columns:1fr 1fr; }
  }
  @media (max-width:768px){
    .lp-wrap { padding:0 18px; }
    .lp-nav-inner { padding:10px 16px; }
    .lp-nav-links { display:none; }
    .lp-nav-ghost { display:none; }
    .lp-by-badge { display:none; }
    .lp-strip-desktop { display:none; }
    .lp-strip-mobile { display:inline; }
    .lp-cta-text-desktop { display:none !important; }
    .lp-cta-text-mobile { display:inline !important; color:#fff !important; }
    .lp-nav-cta { padding:9px 16px; min-height:44px; display:inline-flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; border-radius:8px; touch-action:manipulation; }

    .lp-strip { font-size:11.5px; padding:7px 12px; line-height:1.45; }
    .lp-strip span.pill { font-size:10px; padding:2px 6px; margin-right:6px; }
    .lp-strip a { margin-left:6px; white-space:nowrap; }

    .lp-hero { padding:42px 0 46px; }
    .lp-badge { font-size:11px; padding:5px 12px; max-width:100%; white-space:normal; line-height:1.3; }
    .lp-h1 { font-size:32px; letter-spacing:-.8px; line-height:1.15; }
    .lp-lede { font-size:15px; margin-top:14px; line-height:1.55; }
    .lp-cta-row { flex-direction:column; width:100%; gap:10px; }
    .lp-cta-row .lp-btn { width:100%; min-height:48px; justify-content:center; box-sizing:border-box; }
    .lp-microcopy { font-size:12px; gap:8px 14px; justify-content:flex-start; }

    .lp-hero-card { padding:16px 14px; border-radius:16px; margin-top:16px; }
    .lp-pipeline-preview { padding:14px 12px; }
    .lp-pp-steps { gap:4px; font-size:10px; }
    .lp-pp-step .dot { width:16px; height:16px; font-size:9px; }

    .lp-section { padding:56px 0; }
    .lp-h2 { font-size:26px; letter-spacing:-.6px; line-height:1.2; }
    .lp-sub { font-size:15px; margin-bottom:24px; line-height:1.5; }

    .lp-mockup-duo { flex-direction:column; align-items:center; gap:28px; }
    .lp-phone-frame { width:250px; height:514px; max-width:86vw; }
    .lp-phone-frame.offset { margin-top:0; }
    .lp-store-row { flex-direction:column; width:100%; gap:10px; }
    .lp-store-badge { width:100%; min-height:52px; justify-content:center; box-sizing:border-box; }

    .lp-dual-card { padding:22px 18px; border-radius:16px; }
    .lp-dual-title { font-size:20px; }
    .lp-dual-features li { font-size:13.5px; }
    .lp-dual-card .lp-btn { width:100%; min-height:48px; justify-content:center; box-sizing:border-box; }

    .lp-checklist-card { padding:18px 14px; border-radius:16px; }
    .lp-chk-col { padding:16px 14px; }
    .lp-process-grid { grid-template-columns:1fr; gap:12px; }
    .lp-grid-4, .lp-grid-3, .lp-grid-2 { grid-template-columns:1fr; }

    .lp-cta-banner { padding:52px 16px; }
    .lp-cta-banner h2 { font-size:26px; letter-spacing:-.6px; line-height:1.2; }
    .lp-cta-banner p { font-size:15px; margin-bottom:22px; }
    .lp-cta-banner .lp-btn { width:100%; max-width:320px; min-height:48px; }

    .wct-footer { padding:48px 0 24px; }
    .wct-foot-top { grid-template-columns:1fr 1fr; gap:28px 16px; }
    .wct-brand-col { grid-column:1 / -1; margin-bottom:8px; }
    .wct-foot-bottom { flex-direction:column; text-align:center; gap:16px; }
    .wct-badge-cmmi { margin:0 auto; }
  }
  @media (max-width:380px){
    .lp-h1 { font-size:28px; }
    .lp-phone-frame { width:226px; height:466px; }
  }
`;

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AppleStoreSvg() {
  return (
    <svg viewBox="0 0 384 512">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function PlayStoreSvg() {
  return (
    <svg viewBox="0 0 512 512">
      <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
    </svg>
  );
}

function WctLogoMark() {
  return (
    <Image
      src="/wct-logo-white.png"
      alt="WCT Logo"
      width={46}
      height={46}
      style={{ width: "46px", height: "46px", objectFit: "contain" }}
    />
  );
}

function LinkedInIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="lp" id="top">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Top Announcement Strip */}
      <div className="lp-strip">
        <span className="pill">Healthcare Claims</span>
        <span className="lp-strip-desktop">ClaimsGuru by WaferWire (WCT) | Built for Indian Health Insurance Reimbursements and TPA Adjudication</span>
        <span className="lp-strip-mobile">ClaimsGuru by WCT | Health Reimbursement</span>
        <a href="#pipeline">5-Step Process &rarr;</a>
      </div>

      {/* Navigation */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-brand-box">
            <NavBrand>
              <Image
                src="/image.png"
                alt="ClaimsGuru by WCT"
                width={155}
                height={36}
                priority
                style={{ height: "32px", width: "auto", objectFit: "contain" }}
              />
            </NavBrand>
            <span className="lp-by-badge">by WaferWire (WCT)</span>
          </div>

          <div className="lp-nav-links">
            <a href="#mobile-app">Mobile App</a>
            <a href="#dual-access">Patients vs TPAs</a>
            <a href="#checklist">Checklist Guide</a>
            <a href="#pipeline">AI Pipeline</a>
            <a href="#security">Compliance</a>
            <a href="#faq">FAQ</a>
          </div>

          <div className="lp-nav-actions">
            <Link className="lp-nav-ghost" href="/login">
              Sign In
            </Link>
            <Link className="lp-nav-cta" href="/login">
              <span className="lp-cta-text-desktop">Open Web Workspace</span>
              <span className="lp-cta-text-mobile">Sign In</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="lp-hero">
        <div className="lp-wrap">
          <div className="lp-hero-grid">
            <div>
              <span className="lp-badge">
                Healthcare Product by WaferWire (WCT)
              </span>
              <h1 className="lp-h1">
                Smarter Claims. <br />
                <span className="em">Faster Care.</span>
              </h1>
              <p className="lp-lede">
                The smart AI intake and review layer for health insurance. Patients can submit and track reimbursement files easily on mobile or web, while TPAs and insurers review itemized bills, ICD-10 coding, and tariff limits on desktop.
              </p>

              <div className="lp-cta-row">
                <Link className="lp-btn lp-btn-primary" href="/login">
                  Launch Web Portal
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </Link>
                <a className="lp-btn lp-btn-outline" href="#mobile-app">
                  Download Mobile App
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                    <line x1="12" y1="18" x2="12.01" y2="18"></line>
                  </svg>
                </a>
              </div>

              <div className="lp-microcopy">
                <span><CheckIcon /> Compatible with standard IRDAI TPA dossier formats</span>
                <span><CheckIcon /> Zero External PHI Egress</span>
                <span><CheckIcon /> Dedicated Azure Cloud Privacy</span>
              </div>
            </div>

            {/* Hero Live Pipeline Card */}
            <div className="lp-hero-card">
              <div className="lp-hcard-header">
                <div className="lp-hcard-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7ee8da" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                  Live Reimbursement Dossier
                </div>
                <span className="lp-status-live">Claim #9043CDED · RUNNING</span>
              </div>

              <div className="lp-pipeline-preview">
                <div className="lp-pp-head">
                  <span>Processing: <b>Final Hospital Bill and Discharge Summary</b></span>
                  <b>55% Complete</b>
                </div>
                <div className="lp-pp-bar">
                  <div className="lp-pp-bar-fill"></div>
                </div>
                <div className="lp-pp-steps">
                  <div className="lp-pp-step done">
                    <div className="dot">&#10003;</div>
                    OCR
                  </div>
                  <div className="lp-pp-step active">
                    <div className="dot">&#9679;</div>
                    Parse
                  </div>
                  <div className="lp-pp-step pending">
                    <div className="dot">3</div>
                    Code
                  </div>
                  <div className="lp-pp-step pending">
                    <div className="dot">4</div>
                    Predict
                  </div>
                  <div className="lp-pp-step pending">
                    <div className="dot">5</div>
                    Validate
                  </div>
                </div>
              </div>

              <div className="lp-card-checklist-box">
                <h4>Mandatory Checklist Documents Verified</h4>
                <div className="lp-check-tags">
                  <span className="lp-tag">&#10003; Final Bill Break-up</span>
                  <span className="lp-tag">&#10003; Discharge Summary</span>
                  <span className="lp-tag">&#10003; Payment Receipts</span>
                  <span className="lp-tag">&#10003; Pharmacy Prescriptions</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MOBILE APPLICATION SHOWCASE (Requested by User with Real Screenshots) */}
      {/* ========================================================================= */}
      <section id="mobile-app" className="lp-mobile-showcase">
        <div className="lp-wrap">
          <div className="lp-mobile-grid">
            <div>
              <span className="lp-eye">Mobile Patient Experience</span>
              <h2 className="lp-h2">Fast, Effortless Reimbursement in Your Pocket</h2>
              <p className="lp-sub">
                Avoid claim rejections caused by missing receipts. Patients and policyholders can photograph hospital bills directly from home or hospital bedside, follow live extraction progress, and check off every required document before submitting to the TPA.
              </p>

              <ul className="lp-feat-list">
                <li className="lp-feat-item">
                  <div className="lp-feat-icon">1</div>
                  <div>
                    <div className="lp-feat-title">Camera and Document Scanner</div>
                    <p className="lp-feat-desc">
                      Capture multi-page final bills, doctor advice sheets, and pharmacy receipts using your camera or gallery with automatic edge detection and clarity enhancement.
                    </p>
                  </div>
                </li>
                <li className="lp-feat-item">
                  <div className="lp-feat-icon">2</div>
                  <div>
                    <div className="lp-feat-title">Live Pipeline Progress</div>
                    <p className="lp-feat-desc">
                      Follow your claim step by step through OCR, document parsing, medical coding, rejection-risk estimation, and rule validation with full visibility.
                    </p>
                  </div>
                </li>
                <li className="lp-feat-item">
                  <div className="lp-feat-icon">3</div>
                  <div>
                    <div className="lp-feat-title">Missing Paperwork Alerts</div>
                    <p className="lp-feat-desc">
                      Get notified right away if an essential receipt, investigation report, or payment slip is missing, saving weeks of back-and-forth query delays.
                    </p>
                  </div>
                </li>
                <li className="lp-feat-item">
                  <div className="lp-feat-icon">4</div>
                  <div>
                    <div className="lp-feat-title">Secure Sign In with Microsoft Entra External ID</div>
                    <p className="lp-feat-desc">
                      Log in smoothly with verified credentials. All health data is encrypted both in transit and at rest on Microsoft Azure.
                    </p>
                  </div>
                </li>
              </ul>

              {/* App Store and Google Play Download Badges (Disabled for now until published) */}
              <div className="lp-store-row">
                <div 
                  className="lp-store-badge disabled" 
                  title="Coming soon on Apple App Store"
                >
                  <AppleStoreSvg />
                  <div className="lp-store-badge-text">
                    <span className="lp-store-sub">Download on the</span>
                    <span className="lp-store-main">App Store</span>
                  </div>
                </div>

                <div 
                  className="lp-store-badge disabled" 
                  title="Coming soon on Google Play"
                >
                  <PlayStoreSvg />
                  <div className="lp-store-badge-text">
                    <span className="lp-store-sub">Get it on</span>
                    <span className="lp-store-main">Google Play</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Phone Mockups with user's actual screenshots */}
            <div className="lp-mockup-duo">
              {/* Phone 1: Login Screen */}
              <div className="lp-phone-frame">
                <div className="lp-phone-speaker"></div>
                <div className="lp-phone-screen">
                  <Image
                    src="/mobile-app-preview-1.jpg"
                    alt="ClaimsGuru Mobile Sign In with Microsoft Entra"
                    width={320}
                    height={640}
                    priority
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
                  />
                </div>
              </div>

              {/* Phone 2: Active Pipeline Processing Screen */}
              <div className="lp-phone-frame offset">
                <div className="lp-phone-speaker"></div>
                <div className="lp-phone-screen">
                  <Image
                    src="/mobile-app-preview-2.jpg"
                    alt="ClaimsGuru Real-Time Claim Processing Pipeline"
                    width={320}
                    height={640}
                    priority
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* DUAL WORKSPACE: Patients vs TPAs */}
      {/* ========================================================================= */}
      <section id="dual-access" className="lp-section">
        <div className="lp-wrap">
          <span className="lp-eye">Two Roles, One Platform</span>
          <h2 className="lp-h2">Designed for Both Claimants and TPA Reviewers</h2>
          <p className="lp-sub">
            Reimbursement involves two main parties: patients who want quick, painless intake, and TPAs or insurers who need thorough clinical verification on desktop workstations.
          </p>

          <div className="lp-dual-grid">
            {/* Patient Card */}
            <div className="lp-dual-card patient">
              <span className="lp-dual-badge">For Patients and Claimants</span>
              <h3 className="lp-dual-title">Mobile App and Web Portal</h3>
              <p className="lp-dual-desc">
                Patients can submit from the hospital or home via phone or browser. ClaimsGuru acts as a smart pre-filter, organizing paper bills into a verified, complete reimbursement package.
              </p>
              <ul className="lp-dual-features">
                <li><CheckIcon /> Direct photo capture of itemized bills and discharge summaries</li>
                <li><CheckIcon /> Automatic split into pre-hospitalization, hospitalization, and post-hospitalization</li>
                <li><CheckIcon /> Guided checklist verification before final submission</li>
                <li><CheckIcon /> Real-time status notifications for reviews and query updates</li>
              </ul>
              <Link className="lp-btn lp-btn-primary" href="/login">
                Sign In as Patient
              </Link>
            </div>

            {/* TPA Card */}
            <div className="lp-dual-card enterprise">
              <span className="lp-dual-badge">For TPAs and Insurers</span>
              <h3 className="lp-dual-title">Enterprise Desktop Workspace</h3>
              <p className="lp-dual-desc">
                Built for desktop and laptop adjudication. Medical reviewers and TPA claims processors can audit itemized bills, check tariff limits, cross-reference ICD codes, and spot over-billing quickly.
              </p>
              <ul className="lp-dual-features">
                <li><CheckIcon /> Dual-pane bill viewer with OCR text overlays</li>
                <li><CheckIcon /> Automated ICD-10 diagnosis and CPT procedure code mapping</li>
                <li><CheckIcon /> Tariff anomaly detection and non-payable deduction break-up</li>
                <li><CheckIcon /> One-click generation of IRDAI claim forms (Part A and B)</li>
              </ul>
              <Link className="lp-btn lp-btn-outline" style={{ background: "#0b3a67", color: "#fff", borderColor: "#0b3a67" }} href="/login?role=tpa">
                TPA Adjuster Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHECKLIST SECTION (Simplified and Grounded) */}
      {/* ========================================================================= */}
      <section id="checklist" className="lp-section alt">
        <div className="lp-wrap">
          <span className="lp-eye">Document Integrity</span>
          <h2 className="lp-h2">Essential Checklist for Claim Reimbursement</h2>
          <p className="lp-sub">
            ClaimsGuru guides claimants to attach all required documents upfront, helping prevent settlement delays and query cycles.
          </p>

          <div className="lp-checklist-card">
            <div className="lp-chk-grid">
              <div className="lp-chk-col">
                <h4>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  1. Hospital and Clinical Records
                </h4>
                <ul className="lp-chk-list">
                  <li className="lp-chk-item"><CheckIcon /> Hospital discharge summary with admission and discharge dates</li>
                  <li className="lp-chk-item"><CheckIcon /> Operation theatre notes and implant invoice (for surgery)</li>
                  <li className="lp-chk-item"><CheckIcon /> Medico-legal certificate or FIR copy (for accidents)</li>
                </ul>
              </div>

              <div className="lp-chk-col">
                <h4>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                  2. Bills and Payment Receipts
                </h4>
                <ul className="lp-chk-list">
                  <li className="lp-chk-item"><CheckIcon /> Hospital final bill with itemized room rent break-up</li>
                  <li className="lp-chk-item"><CheckIcon /> Payment receipts with stamped confirmation</li>
                  <li className="lp-chk-item"><CheckIcon /> Pharmacy bills with doctor prescriptions</li>
                  <li className="lp-chk-item"><CheckIcon /> Pre and post-hospitalization bills</li>
                </ul>
              </div>

              <div className="lp-chk-col">
                <h4>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  3. Reports and Bank Details
                </h4>
                <ul className="lp-chk-list">
                  <li className="lp-chk-item"><CheckIcon /> Lab and scan reports with doctor advice</li>
                  <li className="lp-chk-item"><CheckIcon /> Cancelled cheque for bank account transfer</li>
                  <li className="lp-chk-item"><CheckIcon /> PAN card or photo ID copy</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5-STEP PIPELINE */}
      {/* ========================================================================= */}
      <section id="pipeline" className="lp-section">
        <div className="lp-wrap">
          <span className="lp-eye">How It Works</span>
          <h2 className="lp-h2">From Paper Pile to Settlement-Ready Claim</h2>
          <p className="lp-sub">
            ClaimsGuru compresses hours of document gathering and manual data entry into a fast, transparent workflow.
          </p>

          <div className="lp-process-grid">
            <div className="lp-process-step">
              <div className="lp-pstep-num">STEP 01</div>
              <div className="lp-pstep-title">Intimate and Snap</div>
              <p className="lp-pstep-desc">
                Patient or desk coordinator snaps photos or uploads PDFs of hospital bills, discharge summaries, and payment receipts.
              </p>
            </div>

            <div className="lp-process-step">
              <div className="lp-pstep-num">STEP 02</div>
              <div className="lp-pstep-title">AI OCR and Extraction</div>
              <p className="lp-pstep-desc">
                Automated OCR reads structured fields including diagnosis, admission timeline, room rent, and line-item charges.
              </p>
            </div>

            <div className="lp-process-step">
              <div className="lp-pstep-num">STEP 03</div>
              <div className="lp-pstep-title">Coding and Bill Audit</div>
              <p className="lp-pstep-desc">
                Matches ICD-10 diagnosis codes and checks billing lines against discharge summaries, separating non-payable expenses.
              </p>
            </div>

            <div className="lp-process-step">
              <div className="lp-pstep-num">STEP 04</div>
              <div className="lp-pstep-title">Desktop TPA Review</div>
              <p className="lp-pstep-desc">
                TPA adjusters inspect flagged anomalies, verify deduction categories, and validate the claim with a complete audit log.
              </p>
            </div>

            <div className="lp-process-step">
              <div className="lp-pstep-num">STEP 05</div>
              <div className="lp-pstep-title">IRDAI Dossier Export</div>
              <p className="lp-pstep-desc">
                Generates complete IRDAI Part A and B claim forms with verified attachments, compatible with standard IRDAI TPA dossier formats.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECURITY & DATA PROTECTION */}
      {/* ========================================================================= */}
      <section id="security" className="lp-section slate">
        <div className="lp-wrap">
          <span className="lp-eye" style={{ color: "#7ee8da" }}>Security and Privacy</span>
          <h2 className="lp-h2">Enterprise Healthcare Protection by Design</h2>
          <p className="lp-sub">
            Health insurance data contains sensitive personal details. ClaimsGuru operates on Microsoft Azure in Central India with dedicated tenant privacy.
          </p>

          <div className="lp-grid-3">
            <div className="lp-card" style={{ background: "#1e293b", borderColor: "#334155" }}>
              <div className="lp-ic" style={{ background: "rgba(13,148,136,.15)", color: "#7ee8da" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div className="lp-ct" style={{ color: "#fff" }}>Zero External PHI Egress</div>
              <p className="lp-cb" style={{ color: "#94a3b8" }}>
                Personal identifiers are scrubbed before analysis. AI models run securely within your dedicated Azure enterprise environment.
              </p>
            </div>

            <div className="lp-card" style={{ background: "#1e293b", borderColor: "#334155" }}>
              <div className="lp-ic" style={{ background: "rgba(13,148,136,.15)", color: "#7ee8da" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div className="lp-ct" style={{ color: "#fff" }}>DPDP Act 2023 Aligned</div>
              <p className="lp-cb" style={{ color: "#94a3b8" }}>
                Built-in consent controls and patient data deletion workflows in line with Indian Digital Personal Data Protection standards.
              </p>
            </div>

            <div className="lp-card" style={{ background: "#1e293b", borderColor: "#334155" }}>
              <div className="lp-ic" style={{ background: "rgba(13,148,136,.15)", color: "#7ee8da" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <div className="lp-ct" style={{ color: "#fff" }}>Central India Cloud Residency</div>
              <p className="lp-cb" style={{ color: "#94a3b8" }}>
                All data remains within India, hosted on Azure Central India with end-to-end encryption at rest (AES-256) and in transit (TLS 1.3).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FAQ SECTION */}
      {/* ========================================================================= */}
      <section id="faq" className="lp-section">
        <div className="lp-wrap">
          <span className="lp-eye">Questions and Answers</span>
          <h2 className="lp-h2" style={{ textAlign: "center", margin: "6px auto 14px" }}>Frequently Asked Questions</h2>
          <p className="lp-sub" style={{ textAlign: "center", margin: "0 auto 36px" }}>
            Common questions about ClaimsGuru for claimants, hospitals, and TPAs.
          </p>

          <div className="lp-faq">
            <details>
              <summary>Can patients use ClaimsGuru on mobile phones?</summary>
              <div className="lp-faq-body">
                Yes. Patients can use the ClaimsGuru Mobile Apps (iOS and Android) or open the web app on their phone browser to photograph bills, follow live progress, and submit dossiers easily.
              </div>
            </details>

            <details>
              <summary>How do TPAs and insurers use ClaimsGuru?</summary>
              <div className="lp-faq-body">
                Claims adjusters and medical reviewers access the desktop web workspace. They work with structured, pre-validated claim files with line-item bill breakdowns, ICD-10 coding confidence scores, and tariff checks ready for review.
              </div>
            </details>

            <details>
              <summary>Does ClaimsGuru replace the TPA or the insurer?</summary>
              <div className="lp-faq-body">
                No. ClaimsGuru serves as the intelligent intake, extraction, and validation gateway. It helps the claimant organize and check their papers upfront, delivering clean, organized files to the TPA or insurer for final decision and payout.
              </div>
            </details>

            <details>
              <summary>Does ClaimsGuru support both pre and post-hospitalization bills?</summary>
              <div className="lp-faq-body">
                Yes. In accordance with IRDAI rules, ClaimsGuru automatically segregates expenses into pre-hospitalization (up to 30 days prior), main hospitalization, and post-hospitalization (up to 60 or 90 days after discharge), matching pharmacy receipts with doctor prescriptions.
              </div>
            </details>

            <details>
              <summary>How does ClaimsGuru reduce claim rejection rates?</summary>
              <div className="lp-faq-body">
                A large percentage of reimbursement delays are caused by missing documents like breakdown bills or investigation slips. ClaimsGuru checks the standard checklist before submission and flags tariff discrepancies, non-payable items, and room rent caps upfront.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CALL TO ACTION BANNER */}
      {/* ========================================================================= */}
      <section className="lp-cta-banner">
        <div className="lp-wrap">
          <h2>Experience Modern Healthcare Claims Today</h2>
          <p>
            Whether you are a patient submitting a hospital bill or a TPA processing dockets, ClaimsGuru by WaferWire brings speed, accuracy, and clarity to every claim.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="lp-btn lp-btn-primary" href="/login">
              Open Web Workspace Free
            </Link>
            <a className="lp-btn lp-btn-outline" href="#mobile-app">
              Get Mobile App
            </a>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* OFFICIAL WCT CORPORATE FOOTER (Matched to User Reference Image) */}
      {/* ========================================================================= */}
      <footer className="wct-footer">
        <div className="lp-wrap">
          <div className="wct-foot-top">
            {/* WCT Brand column */}
            <div className="wct-brand-col">
              <div className="wct-logo-wrap">
                <WctLogoMark />
                <span className="wct-logo-text">WCT</span>
              </div>
            </div>

            {/* Column 1: Services */}
            <div className="wct-foot-col">
              <h4>Services</h4>
              <ul>
                <li>Data Estate Modernization</li>
                <li>Microsoft Fabric</li>
                <li>App Modernization</li>
                <li>Infrastructure Modernization</li>
                <li>AI EaaS</li>
                <li>Dynamics 365</li>
                <li>DevSecOps Excellence</li>
                <li>SRE</li>
                <li>SAP</li>
              </ul>
            </div>

            {/* Column 2: Industries */}
            <div className="wct-foot-col">
              <h4>Industries</h4>
              <ul>
                <li>Healthcare &amp; Life Sciences</li>
                <li>Education</li>
                <li>Utilities</li>
              </ul>
            </div>

            {/* Column 3: Company */}
            <div className="wct-foot-col">
              <h4>Company</h4>
              <ul>
                <li>About</li>
                <li>Microsoft Partnership</li>
                <li>Careers</li>
                <li>Contact Us</li>
              </ul>
            </div>

            {/* Column 4: Resources */}
            <div className="wct-foot-col">
              <h4>Resources</h4>
              <ul>
                <li>Blogs</li>
              </ul>
            </div>

            {/* Column 5: Our Locations */}
            <div className="wct-foot-col">
              <h4>Our Locations</h4>
              <ul>
                <li>USA (Headquarters)</li>
                <li>India</li>
                <li>Mexico</li>
                <li>United Kingdom</li>
                <li>Australia</li>
              </ul>
            </div>
          </div>

          {/* Bottom row with CMMI badge, copyright, and social */}
          <div className="wct-foot-bottom">
            <div className="wct-badge-cmmi">
              <span className="blue" style={{ marginRight: 6 }}>ML3</span> CMMI APPRAISED
            </div>

            <div className="wct-foot-center">
              <div>
                <Link href="/privacy&policy">Terms and Conditions</Link> | <Link href="/privacy&policy">Privacy Policy</Link>
              </div>
              <div style={{ marginTop: 4 }}>
                &copy; 2026 WCT. All rights reserved.
              </div>
            </div>

            <div className="wct-foot-social">
              <a 
                href="https://www.linkedin.com/company/waferwire/posts/?feedView=all" 
                target="_blank" 
                rel="noopener noreferrer"
                title="WCT on LinkedIn"
              >
                <LinkedInIcon />
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive AI Chat Assistant */}
      <ClaimChatWidget />
    </main>
  );
}
