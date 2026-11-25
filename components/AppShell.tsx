"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Banknote, BriefcaseBusiness, LayoutDashboard, LogOut, Send, Settings2 } from "lucide-react";
import { usePayrollStore } from "@/lib/storage";

const navItems = [
  { href: "/payroll", label: "Penggajian", icon: Banknote },
  { href: "/employees", label: "Karyawan", icon: BriefcaseBusiness },
  { href: "/send", label: "Kirim & Rekap", icon: Send },
  { href: "/settings", label: "Pengaturan", icon: Settings2 },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, loaded } = usePayrollStore();
  const activeLabel = navItems.find((item) => item.href === pathname)?.label ?? "Dashboard";

  if (pathname === "/login") return <>{children}</>;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  }

  return (
    <div className="min-h-screen bg-[#f3f5f8] text-slate-950 md:flex">
      <aside className="z-30 flex w-full flex-col border-b border-slate-200 bg-white md:fixed md:inset-y-0 md:w-[280px] md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 px-5 py-5 md:px-6 md:py-7">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-black shadow-sm">
            <Image src="/logo-mda.jpg" alt="Logo Melanesia Digital Advertisement" fill className="object-cover" sizes="56px" priority />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-black tracking-tight text-slate-950">MELANESIA DIGITAL</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[.2em] text-slate-500">Payroll System</p>
          </div>
        </div>
        <div className="hidden px-5 pb-3 md:block"><p className="px-3 text-[11px] font-extrabold uppercase tracking-[.2em] text-slate-400">Workspace</p></div>
        <nav aria-label="Navigasi utama" className="flex gap-2 overflow-x-auto px-3 pb-4 md:flex-col md:px-4">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-[50px] shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-bold transition ${active ? "bg-slate-950 text-white shadow-md shadow-slate-900/10" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
                <Icon size={20} strokeWidth={2.1} /><span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden border-t border-slate-100 p-5 md:block">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-[13px] font-extrabold text-slate-800"><LayoutDashboard size={17} /> Penyimpanan Lokal</div>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{loaded ? `${state.employees.length} karyawan · ${state.payrolls.length} arsip slip` : "Memuat data..."}</p>
            <p className="mt-2 text-[12px] font-semibold text-emerald-700">Data tersimpan di browser ini</p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 md:ml-[280px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-9">
          <div className="text-[14px] font-semibold text-slate-500">MDA <span className="mx-2 text-slate-300">/</span> <span className="font-bold text-slate-900">{activeLabel}</span></div>
          <div className="flex items-center gap-3"><span className="hidden items-center gap-2 text-[13px] font-semibold text-slate-500 sm:inline-flex"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" />Secure Workspace</span><button type="button" onClick={logout} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-[13px] font-bold text-slate-700 transition hover:bg-slate-100"><LogOut size={16} /> Keluar</button></div>
        </header>
        <div className="page-content mx-auto w-full max-w-[1840px] px-5 py-7 md:px-9 md:py-9 xl:px-11">{children}</div>
      </main>
    </div>
  );
}
