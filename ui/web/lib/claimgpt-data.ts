export const FEATURES = [
  'Around 14,000 ICD codes via on-prem RAG',
  'SLA-tracked processing queue',
  '14 Indian languages supported',
];

export const TRUST_BADGES = ['IRDAI', 'ISO 27001', 'HIPAA-aligned'];

export const INSURERS = [
  'Star Health',
  'HDFC ERGO',
  'ICICI Lombard',
  'Niva Bupa',
  'Care Health',
  'Other',
];

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'kn', label: '<ctrl42>ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'or', label: 'ଓଡ଼ିଆ' },
  { code: 'as', label: 'অসমীয়া' },
  { code: 'ur', label: 'اردو' },
  { code: 'sa', label: 'संस्कृत' },
];

export type Stage = 'staged' | 'ocr' | 'parsing' | 'coding' | 'scoring';

export const PIPELINE: { key: Stage; label: string }[] = [
  { key: 'staged', label: 'Claim Attached' },
  { key: 'ocr', label: 'OCR Text Capture' },
  { key: 'parsing', label: 'Parsing (LLM agent)' },
  { key: 'coding', label: 'ICD-10 / CPT Coding' },
  { key: 'scoring', label: 'Compliance & Risk Scoring' },
];

export const STAGED_FILES = [
  { name: 'hospital_bill_main.pdf', size: '248 KB' },
  { name: 'lab_report_bloodwork.jpg', size: '1.2 MB' },
  { name: 'discharge_summary.pdf', size: '512 KB' },
];

export type LineItem = {
  id: string;
  category: string;
  description: string;
  amount: number;
  box: { x: number; y: number; w: number; h: number };
};

export const LINE_ITEMS: LineItem[] = [
  {
    id: 'room',
    category: 'Room Rent & Nursing',
    description: 'Deluxe Private Room (4 days @ ₹7,500)',
    amount: 30000,
    box: { x: 8, y: 30, w: 84, h: 7 },
  },
  {
    id: 'icu',
    category: 'ICU Charges',
    description: 'Intensive Care Monitoring (1 day)',
    amount: 18000,
    box: { x: 8, y: 40, w: 84, h: 7 },
  },
  {
    id: 'ot',
    category: 'OT & Surgeon Fees',
    description: 'Laparoscopic Surgery + Anesthesia',
    amount: 45000,
    box: { x: 8, y: 50, w: 84, h: 7 },
  },
  {
    id: 'pharmacy',
    category: 'Pharmacy & Consumables',
    description: 'IV Antibiotics, Analgesics, Surgical Disposables',
    amount: 12500,
    box: { x: 8, y: 60, w: 84, h: 7 },
  },
  {
    id: 'diagnostics',
    category: 'Diagnostics & Pathology',
    description: 'Contrast CT Abdomen, CBC, LFT, KFT',
    amount: 9800,
    box: { x: 8, y: 70, w: 84, h: 7 },
  },
];

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDob(rawDob?: string | null): string {
  if (!rawDob || !rawDob.trim()) return '01 Jan 2000';
  const clean = rawDob.trim();

  // If already like "19 Aug 1990" or "01 Jan 2000"
  if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(clean)) return clean;

  // If 8 digits e.g. "01012000" (DDMMYYYY) or "20000101" (YYYYMMDD)
  if (/^\d{8}$/.test(clean)) {
    const first4 = parseInt(clean.slice(0, 4), 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (first4 >= 1900 && first4 <= 2099) {
      const y = clean.slice(0, 4);
      const m = parseInt(clean.slice(4, 6), 10) - 1;
      const d = clean.slice(6, 8);
      if (m >= 0 && m < 12) {
        return `${d.padStart(2, '0')} ${months[m]} ${y}`;
      }
    } else {
      const d = clean.slice(0, 2);
      const m = parseInt(clean.slice(2, 4), 10) - 1;
      const y = clean.slice(4, 8);
      if (m >= 0 && m < 12) {
        return `${d.padStart(2, '0')} ${months[m]} ${y}`;
      }
    }
  }

  // If DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const ddmmyyyy = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (ddmmyyyy) {
    const d = ddmmyyyy[1].padStart(2, '0');
    const m = parseInt(ddmmyyyy[2], 10) - 1;
    const y = ddmmyyyy[3];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (m >= 0 && m < 12) {
      return `${d} ${months[m]} ${y}`;
    }
  }

  // If YYYY-MM-DD
  const yyyymmdd = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (yyyymmdd) {
    const y = yyyymmdd[1];
    const m = parseInt(yyyymmdd[2], 10) - 1;
    const d = yyyymmdd[3].padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (m >= 0 && m < 12) {
      return `${d} ${months[m]} ${y}`;
    }
  }

  // Fallback try Date parse
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d} ${months[parsed.getMonth()]} ${parsed.getFullYear()}`;
  }

  return clean;
}

export function formatClaimTime(createdAt?: string | null): string {
  if (!createdAt) {
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleString('en-US', { month: 'short' });
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day} ${month} ${time}`;
  }
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return 'Just now';
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${day} ${month} ${time}`;
}

export function formatClaimAge(createdAt?: string | null): string {
  if (!createdAt) return '0m';
  const d = new Date(createdAt);
  if (isNaN(d.getTime())) return '0m';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return '0m';
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 60) return `${diffMin}m`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d`;
}

