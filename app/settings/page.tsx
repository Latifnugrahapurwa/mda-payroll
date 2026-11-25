"use client";

import { useEffect, useState } from "react";
import { Save, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Field, NumberInput } from "@/components/Field";
import { Toast } from "@/components/Toast";
import { usePayrollStore } from "@/lib/storage";
import type { GlobalSettings } from "@/lib/types";

export default function SettingsPage() {
  const { state, saveSettings } = usePayrollStore();
  const [form, setForm] = useState<GlobalSettings>(state.settings);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => setForm(state.settings), [state.settings]);

  function save() {
    saveSettings(form);
    setSaved(true);
    setNotice("Pengaturan global berhasil disimpan pada browser ini.");
    window.setTimeout(() => setSaved(false), 3500);
  }

  return (
    <div className="mx-auto max-w-[1120px] space-y-8">
      {notice && <Toast message={notice} onClose={() => setNotice("")} />}

      <div>
        <p className="text-[13px] font-extrabold uppercase tracking-[.18em] text-orange-600">Konfigurasi</p>
        <h1 className="mt-2 text-[34px] font-black leading-tight tracking-tight text-slate-950">Pengaturan Global</h1>
        <p className="mt-2 text-[16px] text-slate-600">Atur parameter perhitungan penggajian dan integrasi Telegram.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <div className="mb-7 flex items-start gap-4">
          <div className="rounded-xl bg-orange-50 p-3 text-orange-700"><SlidersHorizontal size={24} /></div>
          <div><h2 className="text-[21px] font-extrabold text-slate-950">Payment Rules</h2><p className="mt-1 text-[15px] leading-relaxed text-slate-600">Nilai berikut menjadi dasar kalkulasi otomatis untuk setiap slip gaji.</p></div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Standard Monthly Hours" hint="Jumlah jam kerja standar dalam satu bulan."><NumberInput min={1} value={form.standardMonthlyHours} onValueChange={(value) => setForm({ ...form, standardMonthlyHours: value })} /></Field>
          <Field label="MDA Fees Percentage (%)" hint="Persentase biaya MDA yang dihitung dari Sub Total."><NumberInput value={form.mdaFeesPercentage} onValueChange={(value) => setForm({ ...form, mdaFeesPercentage: value })} /></Field>
          <Field label="Monthly Transport Allowance Base (Rp)" hint="Nilai dasar tunjangan transport bulanan."><NumberInput value={form.monthlyTransportAllowanceBase} onValueChange={(value) => setForm({ ...form, monthlyTransportAllowanceBase: value })} /></Field>
          <Field label="Monthly Meal Allowance Base (Rp)" hint="Nilai dasar tunjangan makan bulanan."><NumberInput value={form.monthlyMealAllowanceBase} onValueChange={(value) => setForm({ ...form, monthlyMealAllowanceBase: value })} /></Field>
        </div>
      </section>

      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-soft sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-white p-3 text-sky-700"><ShieldCheck size={24} /></div>
          <div>
            <h2 className="text-[21px] font-extrabold text-slate-950">Telegram Bot Configuration</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">Token Telegram hanya disimpan di server Vercel, bukan di browser. Atur <code className="rounded bg-white px-1.5 py-0.5 font-bold">TELEGRAM_BOT_TOKEN</code> pada Project Settings → Environment Variables.</p>
            <p className="mt-3 text-[14px] leading-relaxed text-slate-600">Untuk webhook, atur juga <code className="rounded bg-white px-1.5 py-0.5 font-bold">TELEGRAM_WEBHOOK_SECRET</code> dengan nilai acak yang sama saat mendaftarkan webhook Telegram.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse items-stretch justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:px-7">
        <p className={`text-[14px] font-semibold ${saved ? "text-emerald-700" : "text-slate-500"}`}>{saved ? "Pengaturan sudah tersimpan." : "Perubahan belum disimpan."}</p>
        <button onClick={save} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-7 py-3 text-[15px] font-extrabold text-white transition hover:bg-slate-800"><Save size={19} /> Simpan Pengaturan</button>
      </div>
    </div>
  );
}
