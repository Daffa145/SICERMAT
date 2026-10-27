import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "CERMAT — Compliance Evaluation & Review Mutu",
  description:
    "Sistem Internal Evaluasi & Telaah Kepatuhan Dokumen Mutu (Modul 3) CTD/ACTD Obat Jadi",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    shortcut: "/favicon.ico",
    apple: "/cermat.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CERMAT",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
