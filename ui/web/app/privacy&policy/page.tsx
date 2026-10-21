import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  FileText,
  Mail,
  Phone,
  MapPin,
  Globe,
  Database,
  Trash2,
  CheckCircle2,
  Clock,
  Building,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | ClaimsGuru - WaferWire LLC',
  description:
    'ClaimsGuru Privacy Policy. Learn how ClaimsGuru by WaferWire LLC collects, uses, processes, stores, and protects your medical claim documents and personal data.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 text-white border-b-4 border-teal-600 px-6 py-12 md:py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            Official Policy Documentation
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            ClaimsGuru Privacy Policy
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-6">
            How ClaimsGuru protects, processes, stores, and manages medical claim documents and personal data.
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm text-slate-300">
            <div>
              <span className="text-slate-400">Product:</span>{' '}
              <strong className="text-white">ClaimsGuru</strong>
            </div>
            <div>
              <span className="text-slate-400">Company:</span>{' '}
              <strong className="text-white">WaferWire LLC</strong>
            </div>
            <div>
              <span className="text-slate-400">Effective Date:</span>{' '}
              <strong className="text-white">October 15, 2026</strong>
            </div>
            <div>
              <span className="text-slate-400">Version:</span>{' '}
              <strong className="text-white">1.2.0</strong>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-10">
        {/* Transparency Banner */}
        <div className="bg-white border-l-4 border-teal-600 rounded-r-xl p-5 mb-8 shadow-sm border border-slate-200">
          <p className="text-sm md:text-base text-slate-700 leading-relaxed">
            <strong className="font-semibold text-slate-900">Transparency & Trust Notice:</strong> This privacy policy applies directly to the{' '}
            <strong className="text-teal-700">ClaimsGuru</strong> mobile application, web portal, and backend services provided by{' '}
            <strong className="text-slate-900">WaferWire LLC</strong>. ClaimsGuru complies with the Google Play Developer User Data Policy, HIPAA security standards, and applicable data privacy regulations. It is publicly accessible worldwide without geographical restrictions, geofencing, or login requirements.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-10 space-y-12">
          {/* Section 1 */}
          <section id="introduction">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">1.</span> Introduction & Overview
            </h2>
            <div className="text-slate-600 space-y-3 leading-relaxed">
              <p>
                ClaimsGuru (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is an intelligent medical claims automation platform created and owned by <strong className="text-slate-900">WaferWire LLC</strong>, headquartered at 4034 148TH Ave NE, Redmond - 98052-5165, United States (US).
              </p>
              <p>
                ClaimsGuru is designed to assist patients, insured individuals, corporate employees, healthcare providers, and Third-Party Administrators (TPAs) by digitizing, parsing, validating, and submitting health insurance reimbursement and cashless claims. Because our application handles sensitive medical and personal data, we maintain the highest standards of data confidentiality, encryption, and regulatory compliance.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="information-collected" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">2.</span> Personal Information & Medical Documents Users Upload
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              To process, adjudicate, and validate medical insurance claims, ClaimsGuru collects the following categories of information when you register an account, upload documents, or submit a claim:
            </p>

            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-base mb-2">A. Personal Identifiable Information (PII)</h3>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5 ml-2">
                  <li><strong className="text-slate-800">Identity Details:</strong> Full legal name, date of birth, age, gender, marital status, and relationship to primary policyholder.</li>
                  <li><strong className="text-slate-800">Contact Information:</strong> Email address, mobile telephone number, and physical residential address.</li>
                  <li><strong className="text-slate-800">Account Credentials:</strong> Secure authentication tokens managed via Microsoft Entra ID with encrypted credentials.</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-base mb-2">B. Government & Identity Verification (KYC) Documents</h3>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5 ml-2">
                  <li><strong className="text-slate-800">Government IDs:</strong> Aadhaar card, PAN card, Voter ID, Driver&apos;s License, or Passport uploaded under the Identity Gate to verify claimant identity and prevent fraud.</li>
                  <li><strong className="text-slate-800">Insurance Identifiers:</strong> Health insurance e-card, member ID card, TPA card, and corporate employee ID.</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-base mb-2">C. Health, Medical & Clinical Records</h3>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5 ml-2">
                  <li><strong className="text-slate-800">Hospital Discharge Summaries:</strong> Hospital admission and discharge dates, discharge status, clinical summary, and attending doctor notes.</li>
                  <li><strong className="text-slate-800">Medical Bills & Receipts:</strong> Final itemized hospital bills, interim invoices, breakdown of pharmacy charges, and payment receipts.</li>
                  <li><strong className="text-slate-800">Doctor Prescriptions:</strong> Physician consultation notes, outpatient prescriptions, and recommended treatment plans.</li>
                  <li><strong className="text-slate-800">Diagnostic Investigation Reports:</strong> Pathology lab reports, radiology reports (Blood tests, ECG, X-Ray, Ultrasound, CT Scan, MRI), and biopsy records.</li>
                  <li><strong className="text-slate-800">Clinical Codes:</strong> Standardized ICD-10 diagnosis codes and CPT procedural codes extracted from medical records.</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-base mb-2">D. Insurance Policy & Financial Information</h3>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5 ml-2">
                  <li><strong className="text-slate-800">Insurance Policy Data:</strong> Insurance company name, policy number, certificate number, corporate group ID, coverage limits, and deductible details.</li>
                  <li><strong className="text-slate-800">Payout Banking Details:</strong> Bank name, account number, branch, and IFSC/routing code necessary for direct electronic reimbursement settlement by the insurer or TPA.</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-base mb-2">E. Technical & Device Information</h3>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5 ml-2">
                  <li><strong className="text-slate-800">Device & Network Data:</strong> Device model, operating system version, unique device identifier, and IP address.</li>
                  <li><strong className="text-slate-800">Push Notifications (FCM):</strong> Firebase Cloud Messaging device tokens used exclusively to notify you of claim status transitions, query alerts, and settlement updates.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section id="how-information-is-processed" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">3.</span> How Claim Information is Processed & Stored
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              ClaimsGuru employs robust cloud architecture, artificial intelligence, and strict security protocols to process and protect your claim documents:
            </p>

            <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 mb-6">
              <h4 className="font-semibold text-teal-900 mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4 text-teal-700" />
                Cryptographic Document Ingestion (SHA-256)
              </h4>
              <p className="text-sm text-teal-800 leading-relaxed">
                Upon file upload, ClaimsGuru computes an immutable SHA-256 hash for every document. This cryptographic fingerprint ensures that uploaded medical bills and records cannot be altered, tampered with, or substituted throughout the processing lifecycle.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-900 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Processing Stage</th>
                    <th className="py-3 px-4">Technical Method</th>
                    <th className="py-3 px-4">Security & Safeguards</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">Ingestion & Upload</td>
                    <td className="py-3 px-4">TLS 1.3 / HTTPS Encrypted Uploads</td>
                    <td className="py-3 px-4">All transfers enforce high-cipher SSL. Public file access is strictly blocked.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">OCR & Extraction</td>
                    <td className="py-3 px-4">Azure AI Document Intelligence & OCR</td>
                    <td className="py-3 px-4">Text extraction runs in secure, zero-data-retention isolated pipelines.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">Medical NLP & Coding</td>
                    <td className="py-3 px-4">AI Clinical Rule Engine</td>
                    <td className="py-3 px-4">Extracts ICD-10 and CPT codes, parses IRDAI claim forms, validates limits.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">Document Storage</td>
                    <td className="py-3 px-4">Microsoft Azure Blob Storage</td>
                    <td className="py-3 px-4">Stored in encrypted containers with AES-256 encryption at rest.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">Claims Database</td>
                    <td className="py-3 px-4">Azure SQL / Microsoft SQL Server</td>
                    <td className="py-3 px-4">Row-level security, tenant isolation, and encrypted backups.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 4 */}
          <section id="data-sharing" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">4.</span> Data Sharing & Third-Party Disclosure
            </h2>
            <p className="text-slate-600 mb-4 leading-relaxed font-medium">
              We never sell, rent, monetize, or trade your personal data or medical records to advertisers, marketing agencies, or data brokers.
            </p>
            <p className="text-slate-600 mb-4 leading-relaxed">
              Your data is shared strictly in the following limited circumstances:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-2">
              <li>
                <strong className="text-slate-800">Designated Insurance Providers & TPAs:</strong> When you initiate a claim submission, your claim package (including discharge summary, itemized bills, diagnosis details, and completed IRDAI forms) is transmitted directly to the designated insurer or licensed TPA (e.g., Medi Assist, Vidal Health, Star Health, ICICI Lombard, Care Health, HDFC ERGO) to adjudicate and settle your claim.
              </li>
              <li>
                <strong className="text-slate-800">Cloud Infrastructure Partners:</strong> We partner with Microsoft Azure for secure cloud hosting, database infrastructure, and OCR services under enterprise Data Protection Agreements (DPAs). Authentication is powered by Microsoft Entra ID.
              </li>
              <li>
                <strong className="text-slate-800">Mobile Push Services:</strong> Google Firebase Cloud Messaging (FCM) is utilized solely for dispatching real-time notifications regarding claim approval, query status, or required documents.
              </li>
              <li>
                <strong className="text-slate-800">Legal & Regulatory Authorities:</strong> We may disclose data when legally required by court order, subpoena, law enforcement warrant, or applicable healthcare and insurance regulatory authorities (such as IRDAI).
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section id="retention-and-deletion" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">5.</span> Data Retention & How Users Can Request Deletion
            </h2>
            
            <h3 className="font-semibold text-slate-900 text-base mb-2">A. Data Retention Period</h3>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-2 ml-2 mb-6">
              <li><strong className="text-slate-800">Active Claims:</strong> Retained while your claim is active, under review, in adjudication, or subject to reimbursement queries.</li>
              <li><strong className="text-slate-800">Regulatory Compliance:</strong> Insurance and medical statutory retention requirements generally mandate maintaining claim records and financial logs for statutory periods (typically 3 to 7 years) to support regulatory audits, fraud prevention, and dispute resolution.</li>
              <li><strong className="text-slate-800">Account Deletion:</strong> When an account deletion is requested, all personal profiles, identity records, and attached documents are permanently purged from active systems within 30 days.</li>
            </ul>

            <h3 className="font-semibold text-slate-900 text-base mb-3">B. How You Can Request Complete Deletion</h3>
            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              ClaimsGuru provides convenient and accessible methods to permanently delete your account and personal data:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-900 font-semibold mb-2">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    1. In-App One-Click Deletion
                  </div>
                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                    Open the ClaimsGuru mobile app &rarr; Go to <strong className="text-slate-800">Profile / Settings</strong> &rarr; Scroll down to <strong className="text-slate-800">Delete Account</strong> &rarr; Confirm deletion.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-teal-900 font-semibold mb-2">
                    <Globe className="w-4 h-4 text-teal-600" />
                    2. Web Account Deletion Portal
                  </div>
                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-3">
                    Verify your account credentials and permanently purge your account, profile data, and medical documents in real time via ClaimsGuru.
                  </p>
                </div>
                <Link
                  href="/delete-account"
                  className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Account Online
                </Link>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-slate-900 font-semibold mb-2">
                    <Mail className="w-4 h-4 text-teal-600" />
                    3. Direct Email Request
                  </div>
                  <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                    Email our privacy team at <a href="mailto:info@waferwire.com" className="text-teal-700 underline font-medium">info@waferwire.com</a> with the subject <em>&ldquo;ClaimsGuru Data Deletion Request&rdquo;</em> from your registered account email.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section id="security-measures" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">6.</span> Security Safeguards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-600">
              <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-800">At-Rest Encryption:</strong> All blob storage containers and databases use AES-256 encryption.</span>
              </div>
              <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-800">In-Transit Encryption:</strong> Modern TLS 1.3 encryption with strict HTTP Strict Transport Security.</span>
              </div>
              <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-800">Access Control:</strong> Strict Role-Based Access Control (RBAC) and least privilege architecture.</span>
              </div>
              <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span><strong className="text-slate-800">Hardened Defense:</strong> Anti-clickjacking, content sniffing prevention, and rate-limiting.</span>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section id="contact-us" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">7.</span> Company Details & Contact Information
            </h2>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              If you have questions, inquiries, concerns, or complaints regarding this Privacy Policy or our handling of your personal information, please contact our team:
            </p>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-semibold text-slate-800 sm:w-44 shrink-0 flex items-center gap-2">
                  <Building className="w-4 h-4 text-teal-600" />
                  Product Name:
                </span>
                <span className="text-slate-700">ClaimsGuru</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-semibold text-slate-800 sm:w-44 shrink-0 flex items-center gap-2">
                  <Building className="w-4 h-4 text-teal-600" />
                  Parent Company:
                </span>
                <span className="text-slate-700 font-medium">WaferWire LLC</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-semibold text-slate-800 sm:w-44 shrink-0 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  Postal Address:
                </span>
                <span className="text-slate-700">4034 148TH Ave NE, Redmond - 98052-5165, United States (US)</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-semibold text-slate-800 sm:w-44 shrink-0 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-teal-600" />
                  Email Inquiries:
                </span>
                <a href="mailto:info@waferwire.com" className="text-teal-700 font-medium hover:underline">
                  info@waferwire.com
                </a>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-semibold text-slate-800 sm:w-44 shrink-0 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-teal-600" />
                  Telephone:
                </span>
                <a href="tel:+14252460195" className="text-teal-700 font-medium hover:underline">
                  +1 (425) 246-0195
                </a>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-semibold text-slate-800 sm:w-44 shrink-0 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-teal-600" />
                  Official Website:
                </span>
                <a
                  href="https://waferwire.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 font-medium hover:underline"
                >
                  https://waferwire.com/
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-center py-8 px-4 text-xs md:text-sm border-t border-slate-800 mt-12">
        <p>
          &copy; {new Date().getFullYear()} ClaimsGuru &middot; A product of{' '}
          <a
            href="https://waferwire.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-400 hover:underline"
          >
            WaferWire LLC
          </a>
          . All rights reserved.
        </p>
        <p className="mt-2 text-slate-500">
          Redmond, WA, United States &middot;{' '}
          <a href="mailto:info@waferwire.com" className="text-slate-400 hover:underline">
            info@waferwire.com
          </a>{' '}
          &middot;{' '}
          <a href="tel:+14252460195" className="text-slate-400 hover:underline">
            +1 (425) 246-0195
          </a>
        </p>
      </footer>
    </div>
  );
}
