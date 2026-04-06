import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { APP_NAME } from "@/lib/constants";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Loan Management System",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-right" theme="system" closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
