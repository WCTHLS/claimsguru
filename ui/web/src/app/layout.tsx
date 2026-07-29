import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "ClaimGPT — AI-Powered Healthcare Claims Intelligence Platform",
  description:
    "ClaimGPT helps TPAs and insurers automate claims review, coding, validation, fraud detection, and adjudication workflows with intelligent healthcare automation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Add the suppression flag here
    <html lang="en" suppressHydrationWarning>
      <body>
        <LanguageProvider>
          <AuthProvider>{children}</AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}