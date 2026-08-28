import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BillBot — Understand Your Medical Bills in Seconds",
  description:
    "Upload your medical bill or EOB and get a plain-English explanation instantly. Powered by AI to help patients understand charges, insurance coverage, and next steps.",
  keywords: [
    "medical bill explainer",
    "EOB explanation",
    "patient billing",
    "insurance charges",
    "billing codes",
    "healthcare costs",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BillBot",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c1117",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
