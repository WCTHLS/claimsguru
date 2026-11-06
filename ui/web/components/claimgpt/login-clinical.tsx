'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import fullLogo from './ClaimsGuru Black PNG.png';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
  Sparkles,
} from 'lucide-react';
import {
  authenticateWithPassword,
  beginEntraAuthFlow,
  getAuthErrorField,
  getAuthRedirectPath,
  isEntraEnabled,
  type AuthErrorField,
} from '@/lib/auth';
import { BrandPanel } from '@/components/claimgpt/brand-panel';
import { LanguageSwitcher, STORAGE_KEY } from '@/components/claimgpt/language-switcher';
import { SSOButton } from '@/components/claimgpt/sso-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AuroraBackground,
  GradientText,
  MagneticButton,
  SpotlightCard,
  StaggerContainer,
  StaggerItem,
} from '@/components/claimgpt/effects';
import { cn } from '@/lib/utils';

type Role = 'patient' | 'tpa';

export interface LoginTranslation {
  welcome: string;
  subtitleEntraPrefix: string;
  subtitleLocalPrefix: string;
  forOrgs: string;
  forPatients: string;
  patientTitle: string;
  patientTag: string;
  patientDesc: string;
  orgTitle: string;
  orgTag: string;
  orgDesc: string;
  securedBy: string;
  newToGuru: string;
  createAccount: string;
  irdaiAligned: string;
  claimIntake: string;
  claimIntakeValue: string;
  dataPrivacy: string;
  dataPrivacyValue: string;
  allOperational: string;
  standardsAligned: string;
}

const LOGIN_TRANSLATIONS: Record<string, LoginTranslation> = {
  en: {
    welcome: 'Welcome to ClaimsGuru',
    subtitleEntraPrefix: 'Select your portal to continue with',
    subtitleLocalPrefix: 'Sign in to your ClaimsGuru workspace to continue.',
    forOrgs: 'For Organisations',
    forPatients: 'For Patients',
    patientTitle: 'Continue as a patient',
    patientTag: 'Patients and policyholders',
    patientDesc: 'Sign in to track and submit reimbursement claims',
    orgTitle: 'Continue as an organisation',
    orgTag: 'TPAs and insurers',
    orgDesc: 'Sign in to review and adjudicate claims',
    securedBy: 'Secured by Microsoft Entra External ID (CIAM)',
    newToGuru: 'New to ClaimsGuru?',
    createAccount: 'Create an account',
    irdaiAligned: 'IRDAI aligned',
    claimIntake: 'Claim intake',
    claimIntakeValue: '< 3 min',
    dataPrivacy: 'Data privacy',
    dataPrivacyValue: 'Zero egress',
    allOperational: 'All systems operational',
    standardsAligned: 'IRDAI & ISO 27001 aligned',
  },
  hi: {
    welcome: 'ClaimsGuru में आपका स्वागत है',
    subtitleEntraPrefix: 'जारी रखने के लिए अपना पोर्टल चुनें',
    subtitleLocalPrefix: 'जारी रखने के लिए अपने ClaimsGuru वर्कस्पेस में साइन इन करें।',
    forOrgs: 'संगठनों के लिए',
    forPatients: 'मरीजों के लिए',
    patientTitle: 'मरीज के रूप में जारी रखें',
    patientTag: 'मरीज एवं बीमित',
    patientDesc: 'प्रतिपूर्ति दावों को ट्रैक और सबमिट करने के लिए साइन इन करें',
    orgTitle: 'संगठन के रूप में जारी रखें',
    orgTag: 'टीपीए एवं बीमाकर्ता',
    orgDesc: 'दावों की समीक्षा और निर्णय के लिए साइन इन करें',
    securedBy: 'Microsoft Entra External ID (CIAM) द्वारा सुरक्षित',
    newToGuru: 'ClaimsGuru में नए हैं?',
    createAccount: 'खाता बनाएं',
    irdaiAligned: 'IRDAI संरेखित',
    claimIntake: 'दावा इनटेक',
    claimIntakeValue: '< 3 मिनट',
    dataPrivacy: 'डेटा गोपनीयता',
    dataPrivacyValue: 'शून्य डेटा निकास',
    allOperational: 'सभी प्रणालियाँ चालू हैं',
    standardsAligned: 'IRDAI एवं ISO 27001 संरेखित',
  },
  bn: {
    welcome: 'ClaimsGuru-তে স্বাগতম',
    subtitleEntraPrefix: 'এগিয়ে যেতে আপনার পোর্টাল নির্বাচন করুন',
    subtitleLocalPrefix: 'চালিয়ে যেতে আপনার ClaimsGuru ওয়ার্কস্পেসে সাইন ইন করুন।',
    forOrgs: 'সংস্থার জন্য',
    forPatients: 'রোগীদের জন্য',
    patientTitle: 'রোগী হিসেবে চালিয়ে যান',
    patientTag: 'রোগী ও বিমাকৃত',
    patientDesc: 'রিইম্বারসমেন্ট দাবি ট্র্যাক এবং জমা দিতে সাইন ইন করুন',
    orgTitle: 'সংস্থা হিসেবে চালিয়ে যান',
    orgTag: 'টিপিএ ও বিমাকারী',
    orgDesc: 'দাবি পর্যালোচনা এবং নিষ্পত্তির জন্য সাইন ইন করুন',
    securedBy: 'Microsoft Entra External ID (CIAM) দ্বারা সুরক্ষিত',
    newToGuru: 'ClaimsGuru-তে নতুন?',
    createAccount: 'অ্যাকাউন্ট তৈরি করুন',
    irdaiAligned: 'IRDAI সংগতিপূর্ণ',
    claimIntake: 'দাবি গ্রহণ',
    claimIntakeValue: '< ৩ মিনিট',
    dataPrivacy: 'ডেটা গোপনীয়তা',
    dataPrivacyValue: 'শূন্য ডেটা নির্গমন',
    allOperational: 'সকল ব্যবস্থা সচল',
    standardsAligned: 'IRDAI ও ISO 27001 সংগতিপূর্ণ',
  },
  ta: {
    welcome: 'ClaimsGuru-விற்கு வரவேற்கிறோம்',
    subtitleEntraPrefix: 'தொடர உங்கள் போர்ட்டலைத் தேர்ந்தெடுக்கவும்',
    subtitleLocalPrefix: 'தொடர உங்கள் ClaimsGuru பணியிடத்தில் உள்நுழையவும்.',
    forOrgs: 'நிறுவனங்களுக்கு',
    forPatients: 'நோயாளிகளுக்கு',
    patientTitle: 'நோயாளியாக தொடரவும்',
    patientTag: 'நோயாளி & காப்பீடு',
    patientDesc: 'கோரிக்கைகளைக் கண்காணிக்கவும் சமர்ப்பிக்கவும் உள்நுழைக',
    orgTitle: 'நிறுவனமாக தொடரவும்',
    orgTag: 'TPA & காப்பீட்டாளர்கள்',
    orgDesc: 'கோரிக்கைகளை மதிப்பாய்வு செய்து தீர்ப்பளிக்க உள்நுழைக',
    securedBy: 'Microsoft Entra External ID (CIAM) மூலம் பாதுகாக்கப்பட்டது',
    newToGuru: 'ClaimsGuru-விற்கு புதியவரா?',
    createAccount: 'கணக்கு உருவாக்கவும்',
    irdaiAligned: 'IRDAI இணக்கமானது',
    claimIntake: 'கோரிக்கை பதிவு',
    claimIntakeValue: '< 3 நிமிடம்',
    dataPrivacy: 'தரவு தனியுரிமை',
    dataPrivacyValue: 'பூஜ்ஜிய கசிவு',
    allOperational: 'அனைத்து அமைப்புகளும் செயல்படுகின்றன',
    standardsAligned: 'IRDAI & ISO 27001 இணக்கமானது',
  },
  te: {
    welcome: 'ClaimsGuru కు స్వాగతం',
    subtitleEntraPrefix: 'కొనసాగించడానికి మీ పోర్టల్‌ను ఎంచుకోండి',
    subtitleLocalPrefix: 'కొనసాగించడానికి మీ ClaimsGuru వర్క్‌స్పేస్‌లో లాగిన్ అవ్వండి.',
    forOrgs: 'సంస్థల కోసం',
    forPatients: 'రోగుల కోసం',
    patientTitle: 'రోగిగా కొనసాగండి',
    patientTag: 'రోగులు & బీమాదారులు',
    patientDesc: 'రీయింబర్స్‌మెంట్ క్లెయిమ్‌లను ట్రాక్ చేయడానికి సైన్ ఇన్ చేయండి',
    orgTitle: 'సంస్థగా కొనసాగండి',
    orgTag: 'TPAలు & బీమా సంస్థలు',
    orgDesc: 'క్లెయిమ్‌లను సమీక్షించడానికి మరియు పరిష్కరించడానికి సైన్ ఇన్ చేయండి',
    securedBy: 'Microsoft Entra External ID (CIAM) ద్వారా సురక్షితం',
    newToGuru: 'ClaimsGuru కు కొత్తవారా?',
    createAccount: 'ఖాతాను సృష్టించండి',
    irdaiAligned: 'IRDAI అనుగుణమైనది',
    claimIntake: 'క్లెయిమ్ స్వీకరణ',
    claimIntakeValue: '< 3 నిమి',
    dataPrivacy: 'డేటా గోప్యత',
    dataPrivacyValue: 'జీరో నిష్క్రమణ',
    allOperational: 'అన్ని వ్యవస్థలు పనిచేస్తున్నాయి',
    standardsAligned: 'IRDAI & ISO 27001 అనుగుణమైనది',
  },
  mr: {
    welcome: 'ClaimsGuru मध्ये आपले स्वागत आहे',
    subtitleEntraPrefix: 'पुढे जाण्यासाठी आपले पोर्टल निवडा',
    subtitleLocalPrefix: 'पुढे जाण्यासाठी आपल्या ClaimsGuru वर्कस्पेसमध्ये साइन इन करा.',
    forOrgs: 'संस्थांसाठी',
    forPatients: 'रुग्णांसाठी',
    patientTitle: 'रुग्ण म्हणून पुढे जा',
    patientTag: 'रुग्ण आणि विमाधारक',
    patientDesc: 'दावे ट्रॅक आणि सबमिट करण्यासाठी साइन इन करा',
    orgTitle: 'संस्था म्हणून पुढे जा' ,
    orgTag: 'टीपीए आणि विमाकर्ते',
    orgDesc: 'दाव्यांचे पुनरावलोकन आणि निर्णय घेण्यासाठी साइन इन करा',
    securedBy: 'Microsoft Entra External ID (CIAM) द्वारे सुरक्षित',
    newToGuru: 'ClaimsGuru वर नवीन आहात?',
    createAccount: 'खाते तयार करा',
    irdaiAligned: 'IRDAI संरेखित',
    claimIntake: 'दावा नोंदणी',
    claimIntakeValue: '< 3 मिनिटे',
    dataPrivacy: 'डेटा गोपनीयता',
    dataPrivacyValue: 'शून्य डेटा गळती',
    allOperational: 'सर्व प्रणाली कार्यरत आहेत',
    standardsAligned: 'IRDAI आणि ISO 27001 संरेखित',
  },
  gu: {
    welcome: 'ClaimsGuru માં આપનું સ્વાગત છે',
    subtitleEntraPrefix: 'ચાલુ રાખવા માટે તમારું પોર્ટલ પસંદ કરો',
    subtitleLocalPrefix: 'ચાલુ રાખવા માટે તમારા ClaimsGuru વર્કસ્પેસમાં સાઇન ઇન કરો.',
    forOrgs: 'સંસ્થાઓ માટે',
    forPatients: 'દર્દીઓ માટે',
    patientTitle: 'દર્દી તરીકે આગળ વધો',
    patientTag: 'દર્દી અને વીમાધારક',
    patientDesc: 'ક્લેમ ટ્રેક અને સબમિટ કરવા માટે સાઇન ઇન કરો',
    orgTitle: 'સંસ્થા તરીકે આગળ વધો',
    orgTag: 'TPA અને વીમાકર્તાઓ',
    orgDesc: 'દાવાઓની સમીક્ષા અને નિર્ણય માટે સાઇન ઇન કરો',
    securedBy: 'Microsoft Entra External ID (CIAM) દ્વારા સુરક્ષિત',
    newToGuru: 'ClaimsGuru માં નવા છો?',
    createAccount: 'એકાઉન્ટ બનાવો',
    irdaiAligned: 'IRDAI સુસંગત',
    claimIntake: 'દાવા સ્વીકૃતિ',
    claimIntakeValue: '< 3 મિનિટ',
    dataPrivacy: 'ડેટા ગોપનીયતા',
    dataPrivacyValue: 'શૂન્ય બહાર નિકાસ',
    allOperational: 'તમામ સિસ્ટમો કાર્યરત છે',
    standardsAligned: 'IRDAI અને ISO 27001 સુસંગત',
  },
  kn: {
    welcome: 'ClaimsGuru ಗೆ ಸುಸ್ವಾಗತ',
    subtitleEntraPrefix: 'ಮುಂದುವರಿಯಲು ನಿಮ್ಮ ಪೋರ್ಟಲ್ ಆಯ್ಕೆಮಾಡಿ',
    subtitleLocalPrefix: 'ಮುಂದುವರಿಯಲು ನಿಮ್ಮ ClaimsGuru ಕಾರ್ಯಕ್ಷೇತ್ರಕ್ಕೆ ಸೈನ್ ಇನ್ ಮಾಡಿ.',
    forOrgs: 'ಸಂಸ್ಥೆಗಳಿಗಾಗಿ',
    forPatients: 'ರೋಗಿಗಳಿಗೆ',
    patientTitle: 'ರೋಗಿಯಾಗಿ ಮುಂದುವರಿಯಿರಿ',
    patientTag: 'ರೋಗಿಗಳು & ವಿಮಾದಾರರು',
    patientDesc: 'ಕ್ಲೈಮ್‌ಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಲು ಮತ್ತು ಸಲ್ಲಿಸಲು ಸೈನ್ ಇನ್ ಮಾಡಿ',
    orgTitle: 'ಸಂಸ್ಥೆಯಾಗಿ ಮುಂದುವರಿಯಿರಿ',
    orgTag: 'TPAಗಳು & ವಿಮೆಗಾರರು',
    orgDesc: 'ಕ್ಲೈಮ್‌ಗಳನ್ನು ಪರಿಶೀಲಿಸಲು ಮತ್ತು ತೀರ್ಪು ನೀಡಲು ಸೈನ್ ಇನ್ ಮಾಡಿ',
    securedBy: 'Microsoft Entra External ID (CIAM) ನಿಂದ ಸುರಕ್ಷಿತ',
    newToGuru: 'ClaimsGuru ಗೆ ಹೊಸಬರೇ?',
    createAccount: 'ಖಾತೆ ತೆರೆಯಿರಿ',
    irdaiAligned: 'IRDAI ಜೋಡಿಸಲಾಗಿದೆ',
    claimIntake: 'ಕ್ಲೈಮ್ ಸ್ವೀಕಾರ',
    claimIntakeValue: '< 3 ನಿಮಿಷ',
    dataPrivacy: 'ಡೇಟಾ ಗೌಪ್ಯತೆ',
    dataPrivacyValue: 'ಶೂನ್ಯ ಹೊರಹರಿವು',
    allOperational: 'ಎಲ್ಲಾ ವ್ಯವಸ್ಥೆಗಳು ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿವೆ',
    standardsAligned: 'IRDAI & ISO 27001 ಜೋಡಿಸಲಾಗಿದೆ',
  },
  ml: {
    welcome: 'ClaimsGuru-ലേക്ക് സ്വാഗതം',
    subtitleEntraPrefix: 'തുടരാൻ നിങ്ങളുടെ പോർട്ടൽ തിരഞ്ഞെടുക്കുക',
    subtitleLocalPrefix: 'തുടരാൻ നിങ്ങളുടെ ClaimsGuru വർക്ക്സ്പേസിൽ സൈൻ ഇൻ ചെയ്യുക.',
    forOrgs: 'സ്ഥാപനങ്ങൾക്കായി',
    forPatients: 'രോഗികൾക്കായി',
    patientTitle: 'രോഗിയായി തുടരുക',
    patientTag: 'രോഗികളും ഇൻഷ്വർ ചെയ്തവരും',
    patientDesc: 'ക്ലെയിമുകൾ ട്രാക്ക് ചെയ്യാനും സമർപ്പിക്കാനും സൈൻ ഇൻ ചെയ്യുക',
    orgTitle: 'സ്ഥാപനമായി തുടരുക',
    orgTag: 'TPA-കളും ഇൻഷുറർമാരും',
    orgDesc: 'ക്ലെയിമുകൾ അവലോകനം ചെയ്യാനും തീർപ്പാക്കാനും സൈൻ ഇൻ ചെയ്യുക',
    securedBy: 'Microsoft Entra External ID (CIAM) വഴി സുരക്ഷിതം',
    newToGuru: 'ClaimsGuru-ൽ പുതിയ ആളാണോ?',
    createAccount: 'അക്കൗണ്ട് സൃഷ്ടിക്കുക',
    irdaiAligned: 'IRDAI അനുരൂപം',
    claimIntake: 'ക്ലെയിം സ്വീകരണം',
    claimIntakeValue: '< 3 മിനിറ്റ്',
    dataPrivacy: 'ഡാറ്റ സ്വകാര്യത',
    dataPrivacyValue: 'പൂജ്യം ചോർച്ച',
    allOperational: 'എല്ലാ സംവിധാനങ്ങളും പ്രവർത്തനക്ഷമമാണ്',
    standardsAligned: 'IRDAI & ISO 27001 അനുരൂപം',
  },
  pa: {
    welcome: 'ClaimsGuru ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ',
    subtitleEntraPrefix: 'ਜਾਰੀ ਰੱਖਣ ਲਈ ਆਪਣਾ ਪੋਰਟਲ ਚੁਣੋ',
    subtitleLocalPrefix: 'ਜਾਰੀ ਰੱਖਣ ਲਈ ਆਪਣੇ ClaimsGuru ਵਰਕਸਪੇਸ ਵਿੱਚ ਸਾਈਨ ਇਨ ਕਰੋ।',
    forOrgs: 'ਸੰਸਥਾਵਾਂ ਲਈ',
    forPatients: 'ਮਰੀਜ਼ਾਂ ਲਈ',
    patientTitle: 'ਮਰੀਜ਼ ਵਜੋਂ ਜਾਰੀ ਰੱਖੋ',
    patientTag: 'ਮਰੀਜ਼ ਅਤੇ ਬੀਮਾ ਧਾਰਕ',
    patientDesc: 'ਦਾਅਵਿਆਂ ਨੂੰ ਟਰੈਕ ਅਤੇ ਜਮ੍ਹਾਂ ਕਰਨ ਲਈ ਸਾਈਨ ਇਨ ਕਰੋ',
    orgTitle: 'ਸੰਸਥਾ ਵਜੋਂ ਜਾਰੀ ਰੱਖੋ',
    orgTag: 'ਟੀਪੀਏ ਅਤੇ ਬੀਮਾਕਰਤਾ',
    orgDesc: 'ਦਾਅਵਿਆਂ ਦੀ ਸਮੀਖਿਆ ਅਤੇ ਨਿਪਟਾਰੇ ਲਈ ਸਾਈਨ ਇਨ ਕਰੋ',
    securedBy: 'Microsoft Entra External ID (CIAM) ਦੁਆਰਾ ਸੁਰੱਖਿਅਤ',
    newToGuru: 'ClaimsGuru ਲਈ ਨਵੇਂ ਹੋ?',
    createAccount: 'ਖਾਤਾ ਬਣਾਓ',
    irdaiAligned: 'IRDAI ਅਨੁਕੂਲ',
    claimIntake: 'ਦਾਅਵਾ ਦਾਖਲਾ',
    claimIntakeValue: '< 3 ਮਿੰਟ',
    dataPrivacy: 'ਡੇਟਾ ਗੋਪਨੀਯਤਾ',
    dataPrivacyValue: 'ਜ਼ੀਰੋ ਨਿਕਾਸ',
    allOperational: 'ਸਾਰੇ ਸਿਸਟਮ ਚਾਲੂ ਹਨ',
    standardsAligned: 'IRDAI ਅਤੇ ISO 27001 ਅਨੁਕੂਲ',
  },
  or: {
    welcome: 'ClaimsGuru କୁ ସ୍ୱାଗତ',
    subtitleEntraPrefix: 'ଆଗକୁ ବଢ଼ିବାକୁ ନିଜର ପୋର୍ଟାଲ ଚୟନ କରନ୍ତୁ',
    subtitleLocalPrefix: 'ଆଗକୁ ବଢ଼ିବାକୁ ନିଜ ClaimsGuru କାର୍ଯ୍ୟକ୍ଷେତ୍ରରେ ସାଇନ୍ ଇନ୍ କରନ୍ତୁ।',
    forOrgs: 'ସଂସ୍ଥାଗୁଡ଼ିକ ପାଇଁ',
    forPatients: 'ରୋଗୀଙ୍କ ପାଇଁ',
    patientTitle: 'ରୋଗୀ ଭାବରେ ଆଗକୁ ବଢ଼ନ୍ତୁ',
    patientTag: 'ରୋଗୀ ଓ ବୀମାଧାରୀ',
    patientDesc: 'ଦାବି ଟ୍ରାକ୍ ଓ ଦାଖଲ କରିବାକୁ ସାଇନ୍ ଇନ୍ କରନ୍ତୁ',
    orgTitle: 'ସଂସ୍ଥା ଭାବରେ ଆଗକୁ ବଢ଼ନ୍ତୁ',
    orgTag: 'TPA ଓ ବୀମାକାରୀ',
    orgDesc: 'ଦାବି ସମୀକ୍ଷା ଓ ନିଷ୍ପତ୍ତି ପାଇଁ ସାଇନ୍ ଇନ୍ କରନ୍ତୁ',
    securedBy: 'Microsoft Entra External ID (CIAM) ଦ୍ୱାରା ସୁରକ୍ଷିତ',
    newToGuru: 'ClaimsGuru ରେ ନୂଆ କି?',
    createAccount: 'ଖାତା ଖୋଲନ୍ତୁ',
    irdaiAligned: 'IRDAI ଅନୁମୋଦିତ',
    claimIntake: 'ଦାବି ଗ୍ରହଣ',
    claimIntakeValue: '< ୩ ମିନିଟ୍',
    dataPrivacy: 'ଡାଟା ଗୋପନୀୟତା',
    dataPrivacyValue: 'ଶୂନ ନିଷ୍କାସନ',
    allOperational: 'ସମସ୍ତ ପ୍ରଣାଳୀ କାର୍ଯ୍ୟକ୍ଷମ',
    standardsAligned: 'IRDAI ଓ ISO 27001 ଅନୁମୋଦିତ',
  },
  as: {
    welcome: 'ClaimsGuru লৈ স্বাগতম',
    subtitleEntraPrefix: 'আগবাঢ়িবলৈ আপোনাৰ পৰ্টেল বাছক',
    subtitleLocalPrefix: 'আগবাঢ়িবলৈ আপোনাৰ ClaimsGuru ৱৰ্কস্পেচত ছাইন ইন কৰক।',
    forOrgs: 'সংগঠনৰ বাবে',
    forPatients: 'ৰোগীৰ বাবে',
    patientTitle: 'ৰোগী হিচাপে আগবাঢ়ক',
    patientTag: 'ৰোগী আৰু বীমাকৃত',
    patientDesc: 'দাবী অনুসৰণ আৰু দাখিলৰ বাবে ছাইন ইন কৰক',
    orgTitle: 'সংগঠন হিচাপে আগবাঢ়ক',
    orgTag: 'টিপিএ আৰু বীমাকাৰী',
    orgDesc: 'দাবী পৰ্যালোচনা আৰু নিষ্পত্তিৰ বাবে ছাইন ইন কৰক',
    securedBy: 'Microsoft Entra External ID (CIAM) দ্বাৰা সুৰক্ষিত',
    newToGuru: 'ClaimsGuru-ত নতুন নেকি?',
    createAccount: 'একাউণ্ট সৃষ্টি কৰক',
    irdaiAligned: 'IRDAI সংৰেখিত',
    claimIntake: 'দাবী গ্ৰহণ',
    claimIntakeValue: '< ৩ মিনিট',
    dataPrivacy: 'তথ্যৰ গোপনীয়তা',
    dataPrivacyValue: 'শূন্য তথ্য নিৰ্গমন',
    allOperational: 'সকলো ব্যৱস্থা সক্ৰিয়',
    standardsAligned: 'IRDAI আৰু ISO 27001 সংৰেখিত',
  },
  ur: {
    welcome: 'ClaimsGuru میں خوش آمدید',
    subtitleEntraPrefix: 'آگے بڑھنے کے لیے اپنا پورٹل منتخب کریں',
    subtitleLocalPrefix: 'جاری رکھنے کے لیے اپنے ClaimsGuru ورک اسپیس میں سائن ان کریں۔',
    forOrgs: 'اداروں کے لیے',
    forPatients: 'مریضوں کے لیے',
    patientTitle: 'بطور مریض جاری رکھیں',
    patientTag: 'مریض اور بیمہ دار',
    patientDesc: 'ری ایمبرسمنٹ کلیمز کو ٹریک اور جمع کرنے کے لیے سائن ان کریں',
    orgTitle: 'بطور ادارہ جاری رکھیں',
    orgTag: 'ٹی پی اے اور انشوررز',
    orgDesc: 'کلیمز کا جائزہ لینے اور فیصلہ کرنے کے لیے سائن ان کریں',
    securedBy: 'Microsoft Entra External ID (CIAM) سے محفوظ',
    newToGuru: 'ClaimsGuru میں نئے ہیں؟',
    createAccount: 'اکاؤنٹ بنائیں',
    irdaiAligned: 'IRDAI ہم آہنگ',
    claimIntake: 'کلیم اندراج',
    claimIntakeValue: '< 3 منٹ',
    dataPrivacy: 'ڈیٹا پرائیویسی',
    dataPrivacyValue: 'صفر اخراج',
    allOperational: 'تمام نظام فعال ہیں',
    standardsAligned: 'IRDAI اور ISO 27001 ہم آہنگ',
  },
  sa: {
    welcome: 'ClaimsGuru मध्ये भवतां स्वागतम्',
    subtitleEntraPrefix: 'अनुवर्तनाय स्वपोर्टलम् वृणुध्वम्',
    subtitleLocalPrefix: 'अनुवर्तनाय स्वकीये ClaimsGuru कार्यक्षेत्रे प्रवेशं कुर्वन्तु।',
    forOrgs: 'संस्थाभ्यः',
    forPatients: 'रोगिभ्यः',
    patientTitle: 'रोगीरूपेण अनुवर्तताम्',
    patientTag: 'रोगिणः बीमाकृताश्च',
    patientDesc: 'प्रतिपूर्तिदावानां समावेषणाय प्रवेशं कुर्वन्तु',
    orgTitle: 'संस्थारूपेण अनुवर्तताम्',
    orgTag: 'टीपीए बीमाकारकाश्च',
    orgDesc: 'दावानां पुनरीक्षणाय प्रवेशं कुर्वन्तु',
    securedBy: 'Microsoft Entra External ID (CIAM) द्वारा सुरक्षितम्',
    newToGuru: 'ClaimsGuru मध्ये नवीनाः?',
    createAccount: 'खातं रचयन्तु',
    irdaiAligned: 'IRDAI संरेखितम्',
    claimIntake: 'दावास्वीकृतिः',
    claimIntakeValue: '< ३ निमेषाः',
    dataPrivacy: 'दत्तगोपनीयता',
    dataPrivacyValue: 'शून्यनिर्गमः',
    allOperational: 'सर्वाणि तन्त्राणि सक्रियाणि',
    standardsAligned: 'IRDAI एवं ISO 27001 संरेखितम्',
  },
};

function formatFriendlyAuthError(msg: string): string {
  if (
    /pyodbc|OperationalError|08S01|TCP Provider|SQLExec|database synchronization error|SQL Server|SELECT id/i.test(
      msg
    )
  ) {
    return 'We are experiencing a temporary connection delay. Please tap Sign In again in a moment.';
  }
  return msg;
}

export function LoginClinical() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entraLoadingRole, setEntraLoadingRole] = useState<Role | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [authErrorField, setAuthErrorField] = useState<AuthErrorField | null>(null);
  const [currentLang, setCurrentLang] = useState<string>('en');

  // Environment feature flag for Entra External ID
  const [useEntra, setUseEntra] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'wct-health.com') {
      window.location.replace(`https://www.wct-health.com${window.location.pathname}${window.location.search}`);
      return;
    }
    setUseEntra(isEntraEnabled());
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setCurrentLang(saved);
        }
      } catch {
        // Storage unavailable
      }

      const handleLangChange = (e: Event) => {
        const detail = (e as CustomEvent)?.detail;
        if (detail?.lang) {
          setCurrentLang(detail.lang);
        }
      };
      window.addEventListener('claimsguru:lang-change', handleLangChange);

      const params = new URLSearchParams(window.location.search);
      if (params.get('deleted') === 'true') {
        setSuccessMessage('Your account, personal data, and Microsoft Entra credentials have been permanently deleted.');
      }
      const err = params.get('error');
      if (err) {
        const decoded = formatFriendlyAuthError(decodeURIComponent(err));
        setErrorMessage(decoded);
        setAuthErrorField(getAuthErrorField(decoded));
      }
      const requestedRole = params.get('role');
      if (requestedRole === 'tpa' || requestedRole === 'patient') {
        setRole(requestedRole);
      }

      return () => {
        window.removeEventListener('claimsguru:lang-change', handleLangChange);
      };
    }
  }, []);

  const t = LOGIN_TRANSLATIONS[currentLang] || LOGIN_TRANSLATIONS.en;

  const handleEntraSignIn = async (targetRole: Role, isRegister = false) => {
    setEntraLoadingRole(targetRole);
    setErrorMessage(null);
    try {
      await beginEntraAuthFlow({ role: targetRole, isRegister });
    } catch (err) {
      setErrorMessage(formatFriendlyAuthError(err instanceof Error ? err.message : 'Unable to connect to Microsoft Entra External ID.'));
      setEntraLoadingRole(null);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setAuthErrorField(null);

    const form = e.currentTarget;
    const identifier = (form.elements.namedItem('identifier') as HTMLInputElement | null)?.value || '';
    const password = (form.elements.namedItem('pw') as HTMLInputElement | null)?.value || '';

    if (!identifier || !password) {
      setErrorMessage('Please enter your email address and password.');
      setAuthErrorField(!identifier ? 'username' : 'password');
      setSubmitting(false);
      return;
    }

    try {
      const session = await authenticateWithPassword({ username: identifier, password, role });
      if (session) {
        router.replace(getAuthRedirectPath(session));
      }
    } catch (error) {
      const message = formatFriendlyAuthError(error instanceof Error ? error.message : 'Unable to sign in.');
      setErrorMessage(message);
      setAuthErrorField(getAuthErrorField(message));
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full bg-background">
      <div className="hidden w-1/2 lg:block">
        <BrandPanel />
      </div>
      <div className="relative flex w-full flex-col min-h-screen justify-between overflow-y-auto overflow-x-hidden lg:w-1/2">
        <AuroraBackground />

        {/* Top bar: matches left panel baseline exactly with p-6 sm:p-8 lg:p-12 */}
        <div className="relative z-20 flex w-full items-center justify-between px-5 pt-6 sm:px-8 sm:pt-8 lg:px-12 lg:pt-12 min-h-[44px]">
          <div className="flex items-center gap-2 lg:hidden">
            <img src={fullLogo.src} className="h-8 sm:h-9 w-auto object-contain" alt="ClaimsGuru Logo" />
          </div>
          <div className="ml-auto">
            <LanguageSwitcher variant="light" onLanguageChange={(code) => setCurrentLang(code)} />
          </div>
        </div>

        {/* Main Content Area - optimized vertical fit for 1366x768 single screen */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-4 sm:px-8 sm:py-6 lg:px-12">
          <StaggerContainer className="my-auto w-full max-w-lg">
            <StaggerItem index={0}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-[2rem]">
                    {t.welcome}
                  </h2>
                  <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                    {useEntra ? (
                      <>
                        {t.subtitleEntraPrefix}{' '}
                        <span className="font-bold text-[#0F4C81] whitespace-nowrap">
                          Microsoft Entra External ID
                        </span>
                        .
                      </>
                    ) : (
                      <>
                        {t.subtitleLocalPrefix}{' '}
                        <span className="font-bold text-[#0F4C81]">ClaimsGuru</span>.
                      </>
                    )}
                  </p>
                </div>
                {!useEntra && (
                  <button
                    type="button"
                    onClick={() => setRole(role === 'patient' ? 'tpa' : 'patient')}
                    className={cn(
                      'group relative shrink-0 text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline',
                      authErrorField === 'role' ? 'text-red-500 font-bold' : ''
                    )}
                  >
                    {role === 'patient' ? t.forOrgs : t.forPatients}
                    <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-60 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                      {role === 'patient'
                        ? 'Sign in to manage and review claims'
                        : 'Sign in to track and submit insurance claims'}
                    </span>
                  </button>
                )}
              </div>
            </StaggerItem>

            {useEntra ? (
              /* ========================================================================= */
              /* Microsoft Entra External ID (CIAM) Flow */
              /* ========================================================================= */
              <StaggerItem index={1} className="mt-6 space-y-3.5 sm:space-y-4">
                {/* Continue as a patient - STRICTLY INLINE SAME LINE FOR TITLE AND TAG */}
                <button
                  type="button"
                  disabled={entraLoadingRole !== null}
                  onClick={() => handleEntraSignIn('patient')}
                  className={cn(
                    "group relative flex w-full min-h-[104px] sm:min-h-[114px] items-center justify-between rounded-2xl border-2 bg-white/95 p-3.5 sm:p-5 text-left shadow-xs backdrop-blur-sm transition-all hover:border-teal-600 hover:bg-teal-50/30 hover:shadow-md disabled:opacity-50",
                    errorMessage?.toLowerCase().includes('patient')
                      ? 'border-teal-600 ring-2 ring-teal-500/30 bg-teal-50/30'
                      : 'border-slate-200/90'
                  )}
                >
                  <div className="flex items-center gap-3 sm:gap-4.5 min-w-0 flex-1">
                    <div className="flex h-11 w-11 sm:h-13 sm:w-13 shrink-0 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-700 border border-teal-500/25 group-hover:bg-teal-700 group-hover:text-white transition-all shadow-2xs">
                      <User className="h-5.5 w-5.5 sm:h-6.5 sm:w-6.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* STRICT SINGLE LINE: flex-nowrap with whitespace-nowrap badge */}
                      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                        <span className="font-display text-sm sm:text-base lg:text-lg font-bold text-slate-900 tracking-tight shrink-0">
                          {t.patientTitle}
                        </span>
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-teal-800 border border-teal-200 shrink-0 whitespace-nowrap">
                          {t.patientTag}
                        </span>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-normal line-clamp-2">
                        {t.patientDesc}
                      </p>
                    </div>
                  </div>
                  <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-teal-700 group-hover:text-white transition-all ml-2.5 sm:ml-3 shadow-2xs">
                    {entraLoadingRole === 'patient' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-700 group-hover:border-white border-t-transparent" />
                    ) : (
                      <ArrowRight className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    )}
                  </div>
                </button>

                {/* Continue as an organisation - STRICTLY INLINE SAME LINE FOR TITLE AND TAG */}
                <button
                  type="button"
                  disabled={entraLoadingRole !== null}
                  onClick={() => handleEntraSignIn('tpa')}
                  className={cn(
                    "group relative flex w-full min-h-[104px] sm:min-h-[114px] items-center justify-between rounded-2xl border-2 bg-white/95 p-3.5 sm:p-5 text-left shadow-xs backdrop-blur-sm transition-all hover:border-teal-600 hover:bg-teal-50/30 hover:shadow-md disabled:opacity-50",
                    errorMessage?.toLowerCase().includes('organisation') || errorMessage?.toLowerCase().includes('organization')
                      ? 'border-teal-600 ring-2 ring-teal-500/30 bg-teal-50/30'
                      : 'border-slate-200/90'
                  )}
                >
                  <div className="flex items-center gap-3 sm:gap-4.5 min-w-0 flex-1">
                    <div className="flex h-11 w-11 sm:h-13 sm:w-13 shrink-0 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-700 border border-teal-500/25 group-hover:bg-teal-700 group-hover:text-white transition-all shadow-2xs">
                      <Building2 className="h-5.5 w-5.5 sm:h-6.5 sm:w-6.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* STRICT SINGLE LINE: flex-nowrap with whitespace-nowrap badge */}
                      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                        <span className="font-display text-sm sm:text-base lg:text-lg font-bold text-slate-900 tracking-tight shrink-0">
                          {t.orgTitle}
                        </span>
                        <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] sm:text-xs font-semibold text-teal-800 border border-teal-200 shrink-0 whitespace-nowrap">
                          {t.orgTag}
                        </span>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-normal line-clamp-2">
                        {t.orgDesc}
                      </p>
                    </div>
                  </div>
                  <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-teal-700 group-hover:text-white transition-all ml-2.5 sm:ml-3 shadow-2xs">
                    {entraLoadingRole === 'tpa' ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-700 group-hover:border-white border-t-transparent" />
                    ) : (
                      <ArrowRight className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    )}
                  </div>
                </button>

                {successMessage && (
                  <p className="rounded-lg border border-emerald-500/30 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                    {successMessage}
                  </p>
                )}

                {errorMessage && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {errorMessage}
                  </p>
                )}

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 pt-2 text-xs sm:text-sm font-medium text-slate-600">
                  <ShieldCheck className="h-4.5 w-4.5 text-teal-700 shrink-0" />
                  <span>{t.securedBy}</span>
                </div>
              </StaggerItem>
            ) : (
              /* ========================================================================= */
              /* Local Email + Password Authentication (Fallback Flow) */
              /* ========================================================================= */
              <StaggerItem index={1} className="mt-6">
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="identifier" className="text-slate-800 text-sm font-semibold">
                      {role === 'patient' ? 'Email Address or Mobile Number' : 'Work Email'}
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="identifier"
                        name="identifier"
                        type={role === 'patient' ? 'text' : 'email'}
                        inputMode="email"
                        autoComplete="username"
                        placeholder={
                          role === 'patient'
                            ? 'e.g. john@example.com or 9876543210'
                            : 'you@yourcompany.com'
                        }
                        className={cn(
                          'h-11 pl-10 border-slate-300 text-slate-900',
                          authErrorField === 'username' ? 'border-red-500 ring-red-400 focus-visible:ring-red-400' : ''
                        )}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pw" className="text-slate-800 text-sm font-semibold">Password</Label>
                      <button type="button" className="text-xs font-medium text-teal-700 hover:text-teal-900 hover:underline">
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="pw"
                        name="pw"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className={cn(
                          'h-11 pl-10 pr-10 border-slate-300 text-slate-900',
                          authErrorField === 'password' ? 'border-red-500 ring-red-400 focus-visible:ring-red-400' : ''
                        )}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {successMessage ? (
                    <p className="rounded-lg border border-emerald-500/30 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                      {successMessage}
                    </p>
                  ) : null}
                  {errorMessage ? (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      {errorMessage}
                    </p>
                  ) : null}
                  <MagneticButton
                    type="submit"
                    disabled={submitting}
                    className="teal-gradient flex h-11 w-full items-center justify-center rounded-xl text-sm sm:text-base font-semibold text-white shadow-elevation-sm"
                  >
                    {submitting ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        {role === 'patient' ? 'Sign in to patient portal' : 'Continue'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </MagneticButton>
                </form>

                <div className="mt-6 relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Or sign in with
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <SSOButton provider="microsoft" />
                  <SSOButton provider="okta" />
                  <SSOButton provider="saml" />
                </div>
              </StaggerItem>
            )}

            {/* Bottom Links & Trust Highlights */}
            <StaggerItem index={2} className="mt-5 space-y-4">
              <div className="text-center">
                {useEntra ? (
                  <p className="text-sm sm:text-base text-slate-600">
                    {t.newToGuru}{' '}
                    <button
                      type="button"
                      onClick={() => handleEntraSignIn('patient', true)}
                      className="font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 hover:underline ml-1"
                    >
                      <span>{t.createAccount}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </p>
                ) : (
                  role === 'patient' && (
                    <p className="text-sm sm:text-base text-slate-600">
                      {t.newToGuru}{' '}
                      <Link
                        href="/register"
                        className="font-bold text-teal-700 hover:text-teal-900 inline-flex items-center gap-1 hover:underline ml-1"
                      >
                        <span>{t.createAccount}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </p>
                  )
                )}
              </div>

              {/* Trust highlight chips - compact and high-contrast (WCAG AA) */}
              <div className="pt-4 border-t border-slate-200/70">
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5 text-center">
                  <div className="rounded-xl bg-white/80 backdrop-blur-xs border border-slate-200/90 p-2.5 shadow-2xs">
                    <div className="text-sm sm:text-base font-bold text-teal-800">100%</div>
                    <div className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">{t.irdaiAligned}</div>
                  </div>
                  <div className="rounded-xl bg-white/80 backdrop-blur-xs border border-slate-200/90 p-2.5 shadow-2xs">
                    <div className="text-sm sm:text-base font-bold text-teal-800">{t.claimIntakeValue}</div>
                    <div className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">{t.claimIntake}</div>
                  </div>
                  <div className="rounded-xl bg-white/80 backdrop-blur-xs border border-slate-200/90 p-2.5 shadow-2xs">
                    <div className="text-sm sm:text-base font-bold text-teal-800">{t.dataPrivacyValue}</div>
                    <div className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">{t.dataPrivacy}</div>
                  </div>
                </div>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </div>

        {/* Footer */}
        <footer className="relative z-10 border-t border-slate-200/60 bg-white/50 backdrop-blur-sm px-4 py-3 w-full">
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-1.5 text-center text-xs text-slate-600">
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>{t.allOperational}</span>
              </span>
              <span className="text-slate-400">·</span>
              <span className="font-medium text-slate-600">{t.standardsAligned}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-slate-500 text-[11px] sm:text-xs">
              <span>&copy; {new Date().getFullYear()} WaferWire Cloud Technologies</span>
              <span className="text-slate-400">·</span>
              <span>ClaimsGuru v1.0</span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
