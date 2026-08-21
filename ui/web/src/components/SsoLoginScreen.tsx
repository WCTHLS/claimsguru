"use client";

import { useEffect, useState } from "react";
import { useAuth, type SsoProvider } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

/* ── Brand SVG icons ── */
function ProviderIcon({ icon }: { icon: SsoProvider["icon"] }) {
  switch (icon) {
    case "google":
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
      );
    case "microsoft":
      return (
        <svg width="18" height="18" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
          <path fill="#F25022" d="M1 1h10v10H1z"/>
          <path fill="#7FBA00" d="M12 1h10v10H12z"/>
          <path fill="#00A4EF" d="M1 12h10v10H1z"/>
          <path fill="#FFB900" d="M12 12h10v10H12z"/>
        </svg>
      );
    case "okta":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="11" fill="#007DC1"/>
          <circle cx="12" cy="12" r="5" fill="#fff"/>
        </svg>
      );
    case "saml":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0f4c81" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      );
    case "apple":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#000" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12-1.14.486-2.31 1.142-3.08.744-.83 2.024-1.5 3.022-1.57zm4.565 14.83c-.78 1.7-1.6 3.4-2.93 3.42-1.31.04-1.73-.78-3.22-.78-1.5 0-1.96.74-3.2.82-1.27.05-2.24-1.83-3.04-3.52-1.62-3.42-2.86-9.66.62-11.85 1.71-1.07 3.85-.82 4.95-.82 1.05 0 3.13-.27 4.93.82 1.84 1.12 3.04 3.34 2.94 5.6.04.04-1.55 1.92-1.05 6.31z"/>
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="7" r="4"/>
          <path d="M5.5 21a6.5 6.5 0 0 1 13 0"/>
        </svg>
      );
  }
}

/* ─────────────────────────────────────────────────────────────────
   Signup modal — popup card opened from "Create account" link
   ───────────────────────────────────────────────────────────────── */
interface SignupModalProps {
  open: boolean;
  onClose: () => void;
  ssoProviders: SsoProvider[];
  activeRole?: "patient" | "tpa";
}

function SignupModal({ open, onClose, ssoProviders, activeRole = "patient" }: SignupModalProps) {
  const { signup } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  /* Registration Form States */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male");
  const [insurer, setInsurer] = useState("Star Health");
  const [policyNo, setPolicyNo] = useState("");
  const [sumInsured, setSumInsured] = useState("");
  const [policyDoc, setPolicyDoc] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [orgRole, setOrgRole] = useState("Claims Reviewer");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* Esc to close + lock body scroll */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const onProviderSignup = (id: string) => {
    setBusy(id);
    signup(id, { email: signupEmail, firstName, lastName });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (firstName.trim().length < 2) return setFormError("Please enter your first name.");
    if (lastName.trim().length < 2) return setFormError("Please enter your last name.");
    if (!signupEmail.trim()) return setFormError("Please enter your email address or mobile number.");
    
    if (activeRole === "patient") {
      if (password && password !== confirmPassword) {
        return setFormError("Passwords do not match.");
      }
    } else {
      if (organization.trim().length < 2) return setFormError("Please enter your organization name.");
    }

    if (!acceptedTerms) return setFormError("You must accept the Terms of Service and Privacy Policy.");

    try {
      sessionStorage.setItem(
        "signup_meta",
        JSON.stringify({ 
          organization: organization.trim() || "Patient Portal", 
          role: activeRole === "patient" ? "Patient" : orgRole,
          policyNo: policyNo.trim(),
          insurer: insurer,
          sumInsured: sumInsured,
          ts: Date.now() 
        }),
      );
    } catch { /* storage unavailable */ }

    setBusy("default");
    signup(undefined, {
      email: signupEmail.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    });
  };

  return (
    <div
      className="signup-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-modal-title"
      onClick={onClose}
    >
      <div className="signup-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
        <button
          type="button"
          className="signup-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className="signup-modal-head">
          <span className="signup-modal-icon" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="22" y1="11" x2="16" y2="11"/>
            </svg>
          </span>
          <div className="signup-modal-head-text">
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: "11px", fontWeight: "700", padding: "3px 8px", borderRadius: "12px", marginBottom: "6px" }}>
              <span>{activeRole === "patient" ? "👤 Account Role: User / Patient" : "🏢 Account Role: TPA Adjuster"}</span>
            </div>
            <h2 id="signup-modal-title">Create Account</h2>
            <p>Fill in your details below to register your account.</p>
          </div>
        </div>

        <div className="signup-modal-body">
          {/* Quick SSO row */}
          <span className="signup-modal-sso-label">Quick sign-up with</span>
          <div className="signup-modal-sso-row">
            {ssoProviders.slice(0, 3).map((p) => (
              <button
                key={p.id}
                type="button"
                className="signup-modal-sso-btn"
                onClick={() => onProviderSignup(p.id)}
                disabled={busy !== null}
                title={`Sign up with ${p.label}`}
              >
                <ProviderIcon icon={p.icon} />
                <span>{busy === p.id ? "…" : p.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          <div className="sso-divider"><span>or fill in your details</span></div>

          <form className="sso-signup-form" onSubmit={onSubmit} noValidate>
            {/* ── Name Row ── */}
            <div className="sso-form-grid">
              <div className="sso-field">
                <label htmlFor="su-fname" className="sso-label">First name<span className="sso-req" aria-hidden>*</span></label>
                <input
                  id="su-fname" type="text" autoComplete="given-name" placeholder="e.g. John"
                  value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  className="sso-input" required minLength={2}
                />
              </div>
              <div className="sso-field">
                <label htmlFor="su-lname" className="sso-label">Last name<span className="sso-req" aria-hidden>*</span></label>
                <input
                  id="su-lname" type="text" autoComplete="family-name" placeholder="e.g. Doe"
                  value={lastName} onChange={(e) => setLastName(e.target.value)}
                  className="sso-input" required minLength={2}
                />
              </div>
            </div>

            {/* ── Patient Specific Fields ── */}
            {activeRole === "patient" ? (
              <>
                <div className="sso-form-grid">
                  <div className="sso-field">
                    <label htmlFor="su-dob" className="sso-label">Date of Birth</label>
                    <input
                      id="su-dob" type="text" placeholder="DD/MM/YYYY"
                      value={dob} onChange={(e) => setDob(e.target.value)}
                      className="sso-input"
                    />
                  </div>
                  <div className="sso-field">
                    <label htmlFor="su-gender" className="sso-label">Gender</label>
                    <select
                      id="su-gender" value={gender} onChange={(e) => setGender(e.target.value)}
                      className="sso-input sso-select" style={{ height: "42px" }}
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div className="sso-field">
                  <label htmlFor="su-email" className="sso-label">Email Address or Mobile Number<span className="sso-req" aria-hidden>*</span></label>
                  <input
                    id="su-email" type="text"
                    placeholder="e.g. john@example.com or 9876543210"
                    value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)}
                    className="sso-input" required
                  />
                </div>

                <div className="sso-form-grid">
                  <div className="sso-field">
                    <label htmlFor="su-insurer" className="sso-label">Insurer Provider</label>
                    <select
                      id="su-insurer" value={insurer} onChange={(e) => setInsurer(e.target.value)}
                      className="sso-input sso-select" style={{ height: "42px" }}
                    >
                      <option>Star Health</option>
                      <option>HDFC ERGO</option>
                      <option>ICICI Lombard</option>
                      <option>Niva Bupa</option>
                      <option>Care Health</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="sso-field">
                    <label htmlFor="su-policyno" className="sso-label">Policy Number</label>
                    <input
                      id="su-policyno" type="text" placeholder="e.g. POL-123456"
                      value={policyNo} onChange={(e) => setPolicyNo(e.target.value)}
                      className="sso-input"
                    />
                  </div>
                </div>

                <div className="sso-field">
                  <label htmlFor="su-suminsured" className="sso-label">Sum Insured (INR)</label>
                  <input
                    id="su-suminsured" type="text" placeholder="e.g. 500000"
                    value={sumInsured} onChange={(e) => setSumInsured(e.target.value)}
                    className="sso-input"
                  />
                </div>

                {/* Optional Health Card / Policy Document Upload */}
                <div className="sso-field">
                  <label htmlFor="su-policydoc" className="sso-label">
                    Upload Health Card / Policy Document <span style={{ color: "#64748b", fontWeight: "normal" }}>(Optional)</span>
                  </label>
                  <input
                    id="su-policydoc" type="file" accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setPolicyDoc(e.target.files?.[0] || null)}
                    className="sso-input" style={{ padding: "8px 12px", height: "auto" }}
                  />
                  <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0 0" }}>
                    Upload your Health ID Card or Policy Copy to auto-verify your coverage details.
                  </p>
                </div>

                <div className="sso-form-grid">
                  <div className="sso-field">
                    <label htmlFor="su-pass" className="sso-label">Password</label>
                    <input
                      id="su-pass" type="password" placeholder="••••••••"
                      value={password} onChange={(e) => setPassword(e.target.value)}
                      className="sso-input"
                    />
                  </div>
                  <div className="sso-field">
                    <label htmlFor="su-confirmpass" className="sso-label">Confirm Password</label>
                    <input
                      id="su-confirmpass" type="password" placeholder="••••••••"
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="sso-input"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* ── TPA Specific Fields ── */
              <>
                <div className="sso-field">
                  <label htmlFor="su-email" className="sso-label">Work email<span className="sso-req" aria-hidden>*</span></label>
                  <input
                    id="su-email" type="email" inputMode="email" autoComplete="email"
                    placeholder="azhar@yourcompany.com"
                    value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)}
                    className="sso-input" required
                  />
                </div>

                <div className="sso-form-grid">
                  <div className="sso-field">
                    <label htmlFor="su-org" className="sso-label">Organization<span className="sso-req" aria-hidden>*</span></label>
                    <input
                      id="su-org" type="text" autoComplete="organization"
                      placeholder="WCT Insurance Pvt Ltd"
                      value={organization} onChange={(e) => setOrganization(e.target.value)}
                      className="sso-input" required minLength={2}
                    />
                  </div>
                  <div className="sso-field">
                    <label htmlFor="su-role" className="sso-label">Role</label>
                    <select
                      id="su-role" value={orgRole} onChange={(e) => setOrgRole(e.target.value)}
                      className="sso-input sso-select" style={{ height: "42px" }}
                    >
                      <option>Claims Reviewer</option>
                      <option>Reviewer</option>
                      <option>Submitter</option>
                      <option>TPA Coordinator</option>
                      <option>Compliance Officer</option>
                      <option>Administrator</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <label className="sso-checkbox-row" style={{ marginTop: "12px" }}>
              <input
                type="checkbox" checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="sso-checkbox"
              />
              <span>
                I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a>,{" "}
                <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>, and consent to
                processing per India&rsquo;s DPDP Act 2023.
              </span>
            </label>

            {formError && (
              <div className="sso-form-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{formError}</span>
              </div>
            )}

            <div className="signup-modal-actions">
              <button type="button" className="signup-modal-cancel" onClick={onClose} disabled={busy !== null}>
                Cancel
              </button>
              <button type="submit" className="sso-signup-submit" disabled={busy !== null}>
                {busy ? "Registering\u2026" : "Register Account"}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </button>
            </div>

            <div className="signup-modal-trust" style={{ marginTop: "16px" }}>
              <span className="signup-modal-trust-pill">IRDAI</span>
              <span className="signup-modal-trust-pill">ISO 27001</span>
              <span className="signup-modal-trust-pill">DPDP 2023</span>
              <span className="signup-modal-trust-pill">HIPAA-aligned</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Main login screen
   ───────────────────────────────────────────────────────────────── */
export default function SsoLoginScreen() {
  const { login, ssoProviders } = useAuth();
  const { t } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);
  
  /* Role & Step navigation states */
  const [step, setStep] = useState<"role_select" | "patient_login" | "tpa_login">("role_select");
  const [selectedRole, setSelectedRole] = useState<"patient" | "tpa">("patient");
  const [emailHint, setEmailHint] = useState("");
  const [password, setPassword] = useState("");
  const [signupOpen, setSignupOpen] = useState(false);

  const onProvider = (id?: string) => {
    setBusy(id || "default");
    login(id);
  };

  /* Role selection submission */
  const handleRoleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === "patient") {
      setStep("patient_login");
    } else {
      setStep("tpa_login");
    }
  };

  /* Email-domain smart routing for sign-in */
  const onContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const domain = emailHint.split("@")[1]?.toLowerCase().trim();
    if (!domain) return onProvider();
    if (/(gmail|googlemail)\./.test(domain)) return onProvider("google");
    if (/(outlook|hotmail|live|microsoft|office365|onmicrosoft)\./.test(domain)) return onProvider("microsoft");
    return onProvider("saml");
  };

  return (
    <div className="sso-login-page">
      <div className="sso-bg" aria-hidden />
      <div className="sso-container">
        {/* Brand panel (left, hidden on mobile) */}
        <aside className="sso-brand-panel">
          <div className="sso-brand" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
            <img src="/image.png" alt="ClaimsGuru Logo" style={{ height: "34px", width: "auto" }} />
            <span className="sso-brand-edition" style={{ marginLeft: "52px" }}>Enterprise · India</span>
          </div>

          <h1 className="sso-headline">
            AI-powered claims<br/>processing for India.
          </h1>
          <p className="sso-subhead">
            One unified workspace for OCR, coding, validation,
            TPA submission, and audit — built for IRDAI-regulated insurers.
          </p>

          <ul className="sso-bullets">
            <li><span className="sso-bullet-dot" /> 74,736 ICD-10-CM codes via on-prem RAG</li>
            <li><span className="sso-bullet-dot" /> SLA-tracked queue · live TPA messaging</li>
            <li><span className="sso-bullet-dot" /> {t("sso.bullet.languages")}</li>
            <li><span className="sso-bullet-dot" /> Data residency: Mumbai (ap-south-1)</li>
          </ul>

          <div className="sso-trust-row">
            <span className="sso-trust-pill">IRDAI</span>
            <span className="sso-trust-pill">ISO 27001</span>
            <span className="sso-trust-pill">DPDP 2023</span>
            <span className="sso-trust-pill">HIPAA-aligned</span>
          </div>
        </aside>

        {/* Sign-in card (right) */}
        <main className="sso-card">
          <div className="sso-card-head sso-card-head-with-lang">
            <div>
              {step !== "role_select" && (
                <button
                  type="button"
                  onClick={() => setStep("role_select")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0f4c81",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                    padding: 0,
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  Change Role
                </button>
              )}
              <h2>{step === "patient_login" ? "User / Patient Sign In" : step === "tpa_login" ? "TPA Adjuster Sign In" : t("sso.signIn")}</h2>
              <p>{step === "patient_login" ? "Enter your registered email or mobile to log in" : step === "tpa_login" ? "Enter your work email to route to your SSO domain" : "Select your role to continue to your workspace"}</p>
            </div>
            <LanguageSwitcher />
          </div>

          {/* ── STEP 1: Role Selection in place of Work Email ── */}
          {step === "role_select" && (
            <form className="sso-email-form" onSubmit={handleRoleContinue}>
              <label className="sso-label">Account Role / Workspace</label>
              <div className="sso-input-row">
                <div className="sso-role-toggle" style={{ flex: 1, marginBottom: 0 }}>
                  <button
                    type="button"
                    className={`sso-role-tab ${selectedRole === "patient" ? "active" : ""}`}
                    onClick={() => setSelectedRole("patient")}
                  >
                    User / Patient
                  </button>
                  <button
                    type="button"
                    className={`sso-role-tab ${selectedRole === "tpa" ? "active" : ""}`}
                    onClick={() => setSelectedRole("tpa")}
                  >
                    TPA Adjuster
                  </button>
                </div>
                <button type="submit" className="sso-continue-btn" disabled={busy !== null}>
                  {t("sso.continue")}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </button>
              </div>
              <p className="sso-help">Select your role to proceed to your designated workspace login.</p>
            </form>
          )}

          {/* ── STEP 2A: Patient Login Form ── */}
          {step === "patient_login" && (
            <form className="sso-email-form" onSubmit={(e) => { e.preventDefault(); onProvider(); }}>
              <div style={{ marginBottom: "12px" }}>
                <label htmlFor="patient-id" className="sso-label">Email or Mobile Number</label>
                <input
                  id="patient-id"
                  type="text"
                  placeholder="name@example.com or 10-digit mobile"
                  value={emailHint}
                  onChange={(e) => setEmailHint(e.target.value)}
                  className="sso-input"
                  style={{ width: "100%" }}
                  required
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label htmlFor="patient-pass" className="sso-label">Password</label>
                <input
                  id="patient-pass"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="sso-input"
                  style={{ width: "100%" }}
                  required
                />
              </div>
              <button type="submit" className="sso-continue-btn" style={{ width: "100%", justifyContent: "center" }} disabled={busy !== null}>
                {busy ? "Signing in…" : "Sign In to Patient Portal"}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </button>
            </form>
          )}

          {/* ── STEP 2B: TPA Adjuster Login Form ── */}
          {step === "tpa_login" && (
            <form className="sso-email-form" onSubmit={onContinue}>
              <label htmlFor="sso-email" className="sso-label">{t("sso.workEmail")}</label>
              <div className="sso-input-row">
                <input
                  id="sso-email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="you@yourcompany.com"
                  value={emailHint}
                  onChange={(e) => setEmailHint(e.target.value)}
                  className="sso-input"
                />
                <button type="submit" className="sso-continue-btn" disabled={busy !== null}>
                  {t("sso.continue")}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
                </button>
              </div>
              <p className="sso-help">We&rsquo;ll route you to the correct SSO provider for your domain.</p>
            </form>
          )}

          {/* ── UNCHANGED LOWER SECTION FOR ALL USERS ── */}
          <div className="sso-divider"><span>{t("sso.orSignIn")}</span></div>

          <div className="sso-providers">
            {ssoProviders.map((p) => (
              <button
                key={p.id}
                className="sso-provider-btn"
                onClick={() => onProvider(p.id)}
                disabled={busy !== null}
                style={{ ["--provider-color" as string]: p.brandColor }}
              >
                <ProviderIcon icon={p.icon} />
                <span>{busy === p.id ? "Redirecting…" : `Continue with ${p.label}`}</span>
                {busy !== p.id && (
                  <svg className="sso-provider-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                )}
              </button>
            ))}
          </div>

          <div className="sso-divider"><span>or</span></div>

          <button
            type="button"
            className="sso-default-btn"
            onClick={() => setSignupOpen(true)}
            style={{ fontWeight: "600", color: "#0f4c81" }}
          >
            New to ClaimsGuru? Create an account
          </button>

          <p className="sso-fineprint" style={{ marginTop: "20px" }}>
            This portal is for authorized personnel of partner insurers and TPAs only.
            All activity is logged for audit per IRDAI guidelines.
          </p>

          <div className="sso-footer-row" style={{ justifyContent: "flex-end" }}>
            <span className="sso-region-tag">🇮🇳 IN · Mumbai</span>
          </div>
        </main>
      </div>

      <SignupModal
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        ssoProviders={ssoProviders}
        activeRole={selectedRole}
      />
    </div>
  );
}
