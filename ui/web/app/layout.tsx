import './globals.css';
import type { Metadata } from 'next';
import { DesignProvider } from '@/components/claimgpt/design-context';
import { DesignSwitcher } from '@/components/claimgpt/design-switcher';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'ClaimsGuru | Enterprise · India',
  description:
    'AI-powered health insurance claim reimbursement & audit platform for India. OCR, ICD-10/CPT coding, validation, TPA submission, and audit in one unified workspace.',
  metadataBase: new URL('https://claimsguru.example.com'),
  icons: {
    icon: [
      { url: '/ClaimsGuru_logo_icon.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/ClaimsGuru_logo_icon.png',
    apple: '/ClaimsGuru_logo_icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  if (typeof window !== 'undefined' && window.location.hostname === 'wct-health.com') {
                    window.location.replace('https://www.wct-health.com' + window.location.pathname + window.location.search + window.location.hash);
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
        <link rel="icon" href="/ClaimsGuru_logo_icon.png" type="image/png" />
        <link rel="shortcut icon" href="/ClaimsGuru_logo_icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/ClaimsGuru_logo_icon.png" />
      </head>
      <body className="font-sans antialiased">
        <DesignProvider>
          {children}
          <DesignSwitcher />
          <Toaster />
        </DesignProvider>
      </body>
    </html>
  );
}
