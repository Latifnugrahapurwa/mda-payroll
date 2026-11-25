"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { LockKeyhole, LogIn } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Login gagal.");
      window.location.replace("/payroll");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tidak dapat login. Periksa koneksi dan konfigurasi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <section className="w-full max-w-[460px] rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-10">
        <div className="mb-8 flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-black">
            <Image src="/logo-mda.jpg" alt="Logo MDA" fill className="object-cover" priority />
          </div>
          <div>
            <p className="text-[17px] font-black leading-tight text-slate-950">MELANESIA DIGITAL</p>
            <p className="text-[17px] font-black leading-tight text-slate-950">ADVERTISEMENT</p>
            <p className="mt-1 text-[12px] font-bold uppercase tracking-[.2em] text-slate-500">Payroll System</p>
          </div>
        </div>
        <div className="mb-7">
          <div className="mb-3 inline-flex rounded-xl bg-orange-50 p-3 text-orange-700"><LockKeyhole size={24} /></div>
          <h1 className="text-[28px] font-black tracking-tight text-slate-950">Login Bendahara</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">Masukkan password untuk membuka workspace penggajian MDA.</p>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <label className="block space-y-2">
            <span className="text-[14px] font-bold text-slate-800">Password bendahara</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required autoFocus className="min-h-[56px] w-full rounded-xl border border-slate-300 px-4 py-3 text-[17px] outline-none transition placeholder:text-slate-400 focus:border-slate-700 focus:ring-4 focus:ring-slate-200" placeholder="Masukkan password" />
          </label>
          {error && <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-[14px] font-semibold leading-relaxed text-rose-800">{error}</div>}
          <button disabled={loading || !password} className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-[16px] font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            <LogIn size={20} /> {loading ? "Memeriksa..." : "Masuk ke Payroll"}
          </button>
        </form>
        <p className="mt-7 text-center text-[12px] leading-relaxed text-slate-500">Akses terbatas untuk bendahara Melanesia Digital Advertisement.</p>
      </section>
    </main>
  );
}
