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
  Building,
  UserCheck,
  Server,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | ClaimsGuru - WaferWire LLC',
  description:
    'ClaimsGuru Privacy Policy. Learn how ClaimsGuru by WaferWire LLC collects, uses, processes, stores, protects, and shares personal and medical claim information.',
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
            Health insurance claim management and document-processing platform by WaferWire LLC.
          </p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm text-slate-300">
            <div>
              <span className="text-slate-400">Application:</span>{' '}
              <strong className="text-white">ClaimsGuru</strong>
            </div>
            <div>
              <span className="text-slate-400">Operated by:</span>{' '}
              <strong className="text-white">WaferWire LLC</strong>
            </div>
            <div>
              <span className="text-slate-400">Effective Date:</span>{' '}
              <strong className="text-white">October 22, 2026</strong>
            </div>
            <div>
              <span className="text-slate-400">Last Updated:</span>{' '}
              <strong className="text-white">October 22, 2026</strong>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-10">
        {/* Transparency Banner */}
        <div className="bg-white border-l-4 border-teal-600 rounded-r-xl p-5 mb-8 shadow-sm border border-slate-200">
          <p className="text-sm md:text-base text-slate-700 leading-relaxed">
            <strong className="font-semibold text-slate-900">Transparency & Notice:</strong> This Privacy Policy applies to the{' '}
            <strong className="text-teal-700">ClaimsGuru</strong> mobile application, web portal, and related services operated by{' '}
            <strong className="text-slate-900">WaferWire LLC</strong>. It is publicly accessible worldwide without geographical restrictions or login requirements.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-10 space-y-12">
          
          {/* Section 1 */}
          <section id="introduction">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">1.</span> Introduction
            </h2>
            <div className="text-slate-600 space-y-3 leading-relaxed text-sm md:text-base">
              <p>
                ClaimsGuru is a health insurance claim management and document-processing platform operated by WaferWire LLC (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
              </p>
              <p>
                This Privacy Policy explains how ClaimsGuru collects, uses, processes, stores, protects, and shares personal information when users access our mobile application and related services.
              </p>
              <p>
                ClaimsGuru helps patients and authorized organizational users process medical documents and insurance policy documents, validate claim information against policy terms, and submit claims to participating insurance companies and Third-Party Administrators (TPAs) enrolled on the platform.
              </p>
              <p>
                ClaimsGuru supports administrative claim processing. The relevant insurance company or TPA is responsible for reviewing the claim, making the final approval or rejection decision, and handling reimbursement or settlement outside ClaimsGuru.
              </p>
              <p>
                By using ClaimsGuru, you acknowledge that you have read this Privacy Policy. Where consent is required by applicable law, we will obtain it separately.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="information-we-collect" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">2.</span> Information We Collect
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed text-sm md:text-base">
              The information we collect depends on how you use ClaimsGuru and the features available to your account.
            </p>

            <div className="space-y-6">
              {/* 2.1 */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-base mb-2">2.1 Personal Information</h3>
                <p className="text-sm text-slate-600 mb-2">We may collect the following information when you create or use an account:</p>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5 ml-2">
                  <li><strong className="text-slate-800">Name:</strong> To identify your account and associate it with your claim.</li>
                  <li><strong className="text-slate-800">Email address:</strong> For account management, authentication where applicable, claim-related communication, and service notifications.</li>
                  <li><strong className="text-slate-800">Phone number:</strong> For contact, account verification, and relevant service-related communication where applicable.</li>
                  <li><strong className="text-slate-800">Other profile information:</strong> Information such as gender, if provided in your profile or registration form.</li>
                  <li><strong className="text-slate-800">Account and role information:</strong> Information needed to identify patients, organizational users, and authorized personnel.</li>
                </ul>
              </div>

              {/* 2.2 */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-base mb-2">2.2 Medical and Health Information</h3>
                <p className="text-sm text-slate-600 mb-2">
                  When you submit a claim, ClaimsGuru may process sensitive health information contained in your uploaded documents, including:
                </p>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5 ml-2 mb-3">
                  <li>Medical bills and hospital invoices.</li>
                  <li>Discharge summaries.</li>
                  <li>Prescriptions, diagnostic reports, and other medical records.</li>
                  <li>Diagnoses and associated medical codes extracted from documents.</li>
                  <li>Treatment details and other information relevant to the submitted claim.</li>
                </ul>
                <p className="text-xs md:text-sm text-slate-500 italic">
                  We use this information only for claim processing, document analysis, policy-related validation, and associated claim-management functions.
                </p>
              </div>

              {/* 2.3 */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-base mb-2">2.3 Insurance Policy and Claim Information</h3>
                <p className="text-sm text-slate-600 mb-2">We may collect and process:</p>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5 ml-2 mb-3">
                  <li>Insurance policy documents and policy identifiers.</li>
                  <li>Insurer and TPA information.</li>
                  <li>Policy coverage, limits, exclusions, and relevant conditions.</li>
                  <li>Claim details and supporting documentation.</li>
                  <li>Extracted document information and validation results.</li>
                  <li>Claim submission records, queries, and status updates.</li>
                  <li>Approval, rejection, or settlement status information provided by authorized users or participating insurers/TPAs.</li>
                </ul>
                <p className="text-xs md:text-sm text-slate-500 italic">
                  This information helps users and authorized organizational personnel manage and review insurance claims.
                </p>
              </div>

              {/* 2.4 */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-base mb-2">2.4 Photos and Files</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-2">
                  When you choose to upload a photo, PDF, or another supported file, ClaimsGuru processes the selected file to perform the requested claim-related function.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed mb-2">
                  Uploaded files may contain personal, medical, and insurance information. We use these files to extract relevant information, validate claim details, and prepare or submit claims.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed font-medium text-slate-800">
                  The application should access only the photos or files needed for the feature being used.
                </p>
              </div>

              {/* 2.5 */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-base mb-2">2.5 Device and Notification Information</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-2">
                  If push notifications are enabled, ClaimsGuru may collect a device or app identifier, such as a push-notification token, along with relevant platform information.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  This information is used to deliver notifications relating to claim status, account activity, or other relevant service updates.
                </p>
              </div>

              {/* 2.6 */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-base mb-2">2.6 Technical and Security Information</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-2">
                  Our systems and service providers may process technical information necessary to operate and secure the application, such as connection information, authentication events, and security logs.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Where diagnostic or analytics services are used, the information collected will depend on the services enabled in the deployed application and their configuration.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section id="how-we-use-information" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">3.</span> How We Use Your Information
            </h2>
            <p className="text-slate-600 mb-4 leading-relaxed text-sm md:text-base">
              We use the information described in this policy to:
            </p>
            <ul className="list-disc list-inside text-sm md:text-base text-slate-600 space-y-2 ml-2 mb-6">
              <li>Create and manage user accounts.</li>
              <li>Authenticate users and enforce appropriate access permissions.</li>
              <li>Receive, store, and process uploaded medical and insurance documents.</li>
              <li>Extract relevant information from documents using document-processing and optical character recognition (OCR) technologies.</li>
              <li>Compare submitted claim information against the supplied insurance policy terms and applicable validation rules.</li>
              <li>Identify missing information, inconsistencies, or potential policy-related issues.</li>
              <li>Prepare and submit claim information to the insurer or TPA selected for the claim.</li>
              <li>Display claim status, queries, and review outcomes in the application.</li>
              <li>Send claim-processing emails, push notifications, and other relevant service communications.</li>
              <li>Maintain application security, troubleshoot technical issues, prevent misuse, and meet applicable legal obligations.</li>
            </ul>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm leading-relaxed">
              <strong>Administrative Processing Notice:</strong> ClaimsGuru&apos;s document extraction and validation functions assist with administrative processing. They do not guarantee coverage, establish a final entitlement to benefits, or guarantee claim approval.
            </div>
          </section>

          {/* Section 4 */}
          <section id="how-claim-submission-works" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">4.</span> How Claim Submission Works
            </h2>
            <div className="text-slate-600 space-y-3 leading-relaxed text-sm md:text-base">
              <p>
                ClaimsGuru allows patients to submit claims to participating insurance companies and TPAs enrolled on the platform.
              </p>
              <p>
                When a user selects the relevant insurer or TPA and submits a claim through the application, ClaimsGuru transmits the necessary claim information and supporting documents through the platform&apos;s claim-processing workflow.
              </p>
              <p>The information transmitted may include:</p>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5 ml-2">
                <li>Patient and claim identification details.</li>
                <li>Relevant medical documents.</li>
                <li>Insurance policy documents and policy information.</li>
                <li>Extracted medical and claim-related information.</li>
                <li>Supporting documents required for review.</li>
              </ul>
              <p>
                The selected insurer or TPA receives the claim information through its authorized access to ClaimsGuru and reviews the claim according to its own processes.
              </p>
              <p>
                Authorized insurer or TPA personnel may update the claim status, request additional information, or record an approval, rejection, or settlement outcome.
              </p>
              <p>
                ClaimsGuru does not itself issue insurance policies, pay reimbursements, or transfer settlement funds. Any reimbursement or settlement is handled by the relevant insurer or TPA outside the ClaimsGuru application.
              </p>
              <p>
                Users should review the selected recipient and claim details before submission. Once a claim is submitted, the recipient may process the information in accordance with its own obligations and policies.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section id="sharing-of-information" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">5.</span> Sharing of Information
            </h2>
            <p className="text-slate-700 font-semibold mb-4 leading-relaxed text-sm md:text-base">
              We do not sell personal information or medical documents to advertisers or data brokers.
            </p>
            <p className="text-slate-600 mb-6 leading-relaxed text-sm md:text-base">
              We may disclose or transfer information in the following circumstances:
            </p>

            <div className="space-y-6">
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-base mb-2">5.1 User-Directed Claim Submission</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-2">
                  When a user initiates or authorizes submission of a claim to a selected participating insurer or TPA, we transmit the information needed for that claim to the selected recipient.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed mb-2">
                  This transfer is necessary to provide the claim-submission service requested by the user.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The insurer or TPA may be a separate legal organization and may process submitted information under its own privacy policy and applicable legal obligations.
                </p>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-base mb-2">5.2 Service Providers</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-2">
                  We may use service providers to operate ClaimsGuru, including providers of:
                </p>
                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-2 mb-3">
                  <li>Cloud hosting and storage.</li>
                  <li>Database and application infrastructure.</li>
                  <li>Document processing and OCR.</li>
                  <li>Authentication and identity management.</li>
                  <li>Email delivery and push notifications.</li>
                  <li>Security, monitoring, and technical support.</li>
                </ul>
                <p className="text-sm text-slate-600 leading-relaxed mb-2">
                  These providers may process information on our behalf as necessary to deliver their services, subject to applicable contractual and security requirements.
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The specific providers and data processed depend on the services enabled in our deployed application.
                </p>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-base mb-2">5.3 Legal and Security Requirements</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  We may disclose information where required by applicable law, a valid legal process, or a competent authority. We may also disclose information where reasonably necessary to protect the security, rights, or safety of users, the company, or the service, subject to applicable law.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section id="data-storage-and-security" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">6.</span> Data Storage and Security
            </h2>
            <div className="text-slate-600 space-y-3 leading-relaxed text-sm md:text-base">
              <p>
                ClaimsGuru uses technical and organizational safeguards designed to protect personal and sensitive information against unauthorized access, loss, misuse, alteration, or disclosure.
              </p>
              <p>Depending on the relevant system, safeguards may include:</p>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1.5 ml-2">
                <li>Encryption of data transmitted over secure connections.</li>
                <li>Authentication and access controls.</li>
                <li>Role-based access to claim information.</li>
                <li>Protected cloud infrastructure and storage.</li>
                <li>Security monitoring and operational safeguards.</li>
              </ul>
              <p>
                Access to medical and insurance information should be limited to authorized users who need it for the relevant claim-processing functions.
              </p>
              <p>
                No electronic system or transmission method can guarantee absolute security. We continually seek to maintain appropriate safeguards for the information processed through our services.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section id="data-retention" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">7.</span> Data Retention
            </h2>
            <div className="text-slate-600 space-y-3 leading-relaxed text-sm md:text-base">
              <p>
                We retain personal information for as long as reasonably necessary to provide ClaimsGuru&apos;s services, process and manage claims, maintain security, resolve disputes, and comply with applicable legal or contractual obligations.
              </p>
              <p>
                Retention periods may vary depending on the information involved, the claim&apos;s status, applicable requirements, and relevant agreements.
              </p>
              <p>
                When information is no longer required or when an account is deleted, it is permanently deleted from our active systems. We do not retain records or maintain backup copies once account deletion has been processed.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section id="account-and-data-deletion" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">8.</span> Account and Data Deletion
            </h2>
            <div className="text-slate-600 space-y-4 leading-relaxed text-sm md:text-base">
              <p>
                Users may request account deletion through our account deletion portal:
              </p>
              
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-teal-900 text-sm">Account Deletion Portal</div>
                  <a
                    href="https://www.wct-health.com/delete-account"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-700 underline text-sm break-all font-medium"
                  >
                    https://www.wct-health.com/delete-account
                  </a>
                </div>
                <Link
                  href="/delete-account"
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Visit Deletion Page
                </Link>
              </div>

              <p>
                Users may also contact our privacy contact listed below for assistance.
              </p>
              <p>
                We will verify and process deletion requests according to our deletion procedures.
              </p>
              <p>
                When an account is deleted, we permanently delete associated personal information, authentication credentials, and uploaded medical documents from our systems. We do not keep any records or maintain backup copies once an account is deleted.
              </p>
              <p>
                Deleting an account may affect access to claim history and other application features.
              </p>
              <p>
                Information previously submitted to an insurer or Third-Party Administrator (TPA) by the user action may also be subject to that organization&apos;s independent retention obligations. Deleting your ClaimsGuru account does not automatically delete records held independently by an insurer or TPA.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section id="user-responsibilities" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">9.</span> User Responsibilities
            </h2>
            <p className="text-slate-600 mb-3 leading-relaxed text-sm md:text-base">Users should:</p>
            <ul className="list-disc list-inside text-sm md:text-base text-slate-600 space-y-1.5 ml-2 mb-4">
              <li>Provide accurate account and claim information.</li>
              <li>Upload only documents they are authorized to submit.</li>
              <li>Review the selected insurer or TPA and the claim details before submission.</li>
              <li>Protect their account credentials and report suspected unauthorized access.</li>
              <li>Avoid submitting information unrelated to the intended claim.</li>
            </ul>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">
              Users should understand that extracted information may contain errors and that the insurer or TPA makes the final claim decision.
            </p>
          </section>

          {/* Section 10 */}
          <section id="childrens-information" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">10.</span> Children&apos;s Information
            </h2>
            <div className="text-slate-600 space-y-3 leading-relaxed text-sm md:text-base">
              <p>
                ClaimsGuru is designed for its intended claim-management users. Where a legitimate claim requires information about a minor, it should be submitted by an authorized parent, guardian, or representative in accordance with applicable law.
              </p>
              <p>
                We do not knowingly collect children&apos;s information for unrelated purposes.
              </p>
            </div>
          </section>

          {/* Section 11 */}
          <section id="third-party-services" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">11.</span> Third-Party Services and External Policies
            </h2>
            <div className="text-slate-600 space-y-3 leading-relaxed text-sm md:text-base">
              <p>
                ClaimsGuru may integrate with external service providers and participating insurers or TPAs to provide its functions.
              </p>
              <p>
                Those organizations may have their own privacy policies and data-handling practices. Their processing of information under their own responsibilities is governed by the applicable policies, agreements, and laws.
              </p>
              <p>
                Users should consult the relevant organization for information about its independent handling of submitted claims.
              </p>
            </div>
          </section>

          {/* Section 12 */}
          <section id="changes-to-policy" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">12.</span> Changes to This Privacy Policy
            </h2>
            <div className="text-slate-600 space-y-3 leading-relaxed text-sm md:text-base">
              <p>
                We may update this Privacy Policy to reflect changes in our services, data practices, or legal requirements.
              </p>
              <p>
                The latest version will be published at our designated privacy-policy URL with an updated effective date. Where required, we will provide additional notice of material changes.
              </p>
            </div>
          </section>

          {/* Section 13 */}
          <section id="contact-us" className="pt-6 border-t border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-teal-600">13.</span> Contact Us
            </h2>
            <p className="text-slate-600 text-sm md:text-base mb-6 leading-relaxed">
              For questions about this Privacy Policy, personal information, or account deletion, contact:
            </p>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4 text-sm">
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-semibold text-slate-800 sm:w-44 shrink-0 flex items-center gap-2">
                  <Building className="w-4 h-4 text-teal-600" />
                  Company:
                </span>
                <span className="text-slate-700 font-medium">WaferWire LLC</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-semibold text-slate-800 sm:w-44 shrink-0 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  Application:
                </span>
                <span className="text-slate-700">ClaimsGuru</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-semibold text-slate-800 sm:w-44 shrink-0 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-teal-600" />
                  Email:
                </span>
                <a href="mailto:info@waferwire.com" className="text-teal-700 font-medium hover:underline">
                  info@waferwire.com
                </a>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-semibold text-slate-800 sm:w-44 shrink-0 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-teal-600" />
                  Website:
                </span>
                <a
                  href="https://www.wct-health.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 font-medium hover:underline"
                >
                  https://www.wct-health.com/
                </a>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-semibold text-slate-800 sm:w-44 shrink-0 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-teal-600" />
                  Account deletion:
                </span>
                <a
                  href="https://www.wct-health.com/delete-account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 font-medium hover:underline"
                >
                  https://www.wct-health.com/delete-account
                </a>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-100 rounded-xl text-slate-600 text-xs md:text-sm leading-relaxed space-y-2 border border-slate-200">
              <p>
                Please do not email medical documents or other sensitive personal information unless our support team specifically requests them through an appropriate channel.
              </p>
              <p className="text-slate-500 italic">
                This Privacy Policy describes ClaimsGuru&apos;s data-handling practices and must be kept consistent with the application&apos;s actual features, deployed service providers, and operational procedures.
              </p>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-center py-8 px-4 text-xs md:text-sm border-t border-slate-800 mt-12">
        <p>
          &copy; {new Date().getFullYear()} ClaimsGuru &middot; Operated by{' '}
          <a
            href="https://www.wct-health.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-400 hover:underline"
          >
            WaferWire LLC
          </a>
          . All rights reserved.
        </p>
        <p className="mt-2 text-slate-500">
          <a href="mailto:info@waferwire.com" className="text-slate-400 hover:underline">
            info@waferwire.com
          </a>{' '}
          &middot;{' '}
          <a href="https://www.wct-health.com/delete-account" className="text-slate-400 hover:underline">
            Account Deletion
          </a>
        </p>
      </footer>
    </div>
  );
}
