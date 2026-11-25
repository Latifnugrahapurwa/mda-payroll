import type { Metadata } from "next";
import "./globals.css";
import { PayrollStoreProvider } from "@/lib/storage";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "MDA Payroll | Melanesia Digital Advertisement",
  description: "Payroll management and salary slip system for Melanesia Digital Advertisement.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><PayrollStoreProvider><AppShell>{children}</AppShell></PayrollStoreProvider></body></html>;
}
