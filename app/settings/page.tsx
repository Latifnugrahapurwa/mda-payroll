"use client";

import { useEffect, useState } from "react";
import { Copy, Plus, Save, ShieldCheck, SlidersHorizontal, Trash2 } from "lucide-react";
import { Field, NumberInput, TextInput } from "@/components/Field";
import { Toast } from "@/components/Toast";
import { usePayrollStore } from "@/lib/storage";
import { createDefaultPaymentRule, type GlobalSettings, type PaymentRule } from "@/lib/types";

export default function SettingsPage() {
  const { state, saveSettings, savePaymentRules } = usePayrollStore();
  const [rules, setRules] = useState<PaymentRule[]>(state.paymentRules);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => setRules(state.paymentRules), [state.paymentRules]);

  function updateRule<K extends keyof PaymentRule>(id: string, key: K, value: PaymentRule[K]) {
    setRules((current) => current.map((rule) => rule.id === id ? { ...rule, [key]: value } : rule));
    setSaved(false);
  }

  function addRule() {
    const base = rules[0] ?? createDefaultPaymentRule(state.settings);
    setRules((current) => [...current, {
      ...base,
      id: crypto.randomUUID(),
      name: `Payment Rules ${current.length + 1}`,
      description: "",
    }]);
    setSaved(false);
  }

  function duplicateRule(rule: PaymentRule) {
    setRules((current) => [...current, { ...rule, id: crypto.randomUUID(), name: `${rule.name} Copy` }]);
    setSaved(false);
  }

  function removeRule(rule: PaymentRule) {
    if (rules.length <= 1) {
      setNotice("Minimal harus tersedia satu Payment Rules.");
      return;
    }
    const assigned = state.employees.filter((employee) => employee.paymentRuleId === rule.id);
    if (assigned.length) {
      setNotice(`Tidak dapat menghapus "${rule.name}" karena masih digunakan ${assigned.length} karyawan. Pindahkan karyawan tersebut ke aturan lain terlebih dahulu.`);
      return;
    }
    setRules((current) => current.filter((item) => item.id !== rule.id));
    setSaved(false);
  }

  function save() {
    const names = rules.map((rule) => rule.name.trim().toLowerCase());
    if (rules.some((rule) => !rule.name.trim())) {
      setNotice("Nama setiap Payment Rules wajib diisi.");
      return;
    }
    if (new Set(names).size !== names.length) {
      setNotice("Nama Payment Rules tidak boleh duplikat.");
      return;
    }
    if (rules.some((rule) =>
      rule.standardMonthlyHours <= 0 ||
      rule.monthlyTransportAllowanceBase < 0 ||
      rule.monthlyMealAllowanceBase < 0 ||
      rule.mdaFeesPercentage < 0 ||
      rule.defaultWorkHours < 0 ||
      rule.defaultCompensationHours < 0 ||
      rule.defaultRstHours < 0
    )) {
      setNotice("Standard Monthly Hours harus lebih dari 0 dan nilai lainnya tidak boleh negatif.");
      return;
    }

    const first = rules[0];
    const settings: GlobalSettings = {
      standardMonthlyHours: first.standardMonthlyHours,
      monthlyTransportAllowanceBase: first.monthlyTransportAllowanceBase,
      monthlyMealAllowanceBase: first.monthlyMealAllowanceBase,
      mdaFeesPercentage: first.mdaFeesPercentage,
    };
    saveSettings(settings);
    savePaymentRules(rules);
    setSaved(true);
    setNotice("Payment Rules berhasil disimpan.");
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 pb-10">
      {notice && <Toast message={notice} onClose={() => setNotice("")} />}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[13px] font-extrabold uppercase tracking-[.18em] text-orange-600">Konfigurasi</p>
          <h1 className="mt-2 text-[34px] font-black leading-tight tracking-tight text-slate-950">Pengaturan Global</h1>
          <p className="mt-2 max-w-3xl text-[16px] text-slate-600">Buat profil aturan pembayaran sendiri. Setiap karyawan dapat menggunakan profil berbeda, dan nilainya menjadi dasar pengisian slip bulanan.</p>
        </div>
        <button onClick={addRule} className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-[15px] font-extrabold text-slate-800 transition hover:bg-slate-50">
          <Plus size={19} /> Buat Payment Rules
        </button>
      </div>

      <section className="space-y-5">
        {rules.map((rule, index) => (
          <article key={rule.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-slate-50/80 p-5 sm:flex-row sm:items-center sm:px-7">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700"><SlidersHorizontal size={21} /></div>
                <div className="min-w-0">
                  <p className="text-[12px] font-extrabold uppercase tracking-wider text-slate-500">Payment Rules {index + 1}</p>
                  <h2 className="truncate text-[19px] font-black text-slate-950">{rule.name || "Belum diberi nama"}</h2>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => duplicateRule(rule)} className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-bold text-slate-700 hover:bg-slate-100"><Copy size={16} /> Duplikasi</button>
                <button type="button" onClick={() => removeRule(rule)} className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-[13px] font-bold text-rose-700 hover:bg-rose-50"><Trash2 size={16} /> Hapus</button>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
              <Field label="Nama Payment Rules *" hint="Nama bebas, misalnya Regular, Senior Editor, atau Part Time.">
                <TextInput value={rule.name} onChange={(event) => updateRule(rule.id, "name", event.target.value)} placeholder="Nama aturan pembayaran" />
              </Field>
              <Field label="Deskripsi" hint="Catatan internal untuk membedakan aturan.">
                <TextInput value={rule.description} onChange={(event) => updateRule(rule.id, "description", event.target.value)} placeholder="Deskripsi aturan (opsional)" />
              </Field>
              <Field label="Standard Monthly Hours" hint="Pembagi jam untuk menghitung tunjangan transport dan makan.">
                <NumberInput min={1} value={rule.standardMonthlyHours} onValueChange={(value) => updateRule(rule.id, "standardMonthlyHours", value)} />
              </Field>
              <Field label="MDA Fees Percentage (%)" hint="Persentase biaya MDA dari Sub Total.">
                <NumberInput value={rule.mdaFeesPercentage} onValueChange={(value) => updateRule(rule.id, "mdaFeesPercentage", value)} />
              </Field>
              <Field label="Monthly Transport Allowance Base (Rp)">
                <NumberInput value={rule.monthlyTransportAllowanceBase} onValueChange={(value) => updateRule(rule.id, "monthlyTransportAllowanceBase", value)} />
              </Field>
              <Field label="Monthly Meal Allowance Base (Rp)">
                <NumberInput value={rule.monthlyMealAllowanceBase} onValueChange={(value) => updateRule(rule.id, "monthlyMealAllowanceBase", value)} />
              </Field>
              <div className="sm:col-span-2">
                <div className="mb-3">
                  <h3 className="text-[15px] font-extrabold text-slate-900">Default Payment Hours</h3>
                  <p className="mt-1 text-[13px] text-slate-500">Nilai awal saat membuat slip baru. Tetap dapat disesuaikan pada periode berjalan.</p>
                </div>
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Default Work Hours"><NumberInput value={rule.defaultWorkHours} onValueChange={(value) => updateRule(rule.id, "defaultWorkHours", value)} /></Field>
                  <Field label="Default Compensation Hours"><NumberInput value={rule.defaultCompensationHours} onValueChange={(value) => updateRule(rule.id, "defaultCompensationHours", value)} /></Field>
                  <Field label="Default RST Hours"><NumberInput value={rule.defaultRstHours} onValueChange={(value) => updateRule(rule.id, "defaultRstHours", value)} /></Field>
                </div>
              </div>
              <p className="sm:col-span-2 rounded-xl border border-sky-100 bg-sky-50 p-4 text-[13px] leading-relaxed text-sky-900">Profil ini hanya digunakan sebagai dasar pengisian dan kalkulasi payroll. Nama Payment Rules tidak ditampilkan pada slip gaji.</p>
            </div>
          </article>
        ))}
      </section>

      <section className="flex flex-col-reverse items-stretch justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:px-7">
        <p className={`text-[14px] font-semibold ${saved ? "text-emerald-700" : "text-slate-500"}`}>{saved ? "Perubahan Payment Rules sudah tersimpan." : "Perubahan belum disimpan."}</p>
        <button onClick={save} className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-7 py-3 text-[15px] font-extrabold text-white transition hover:bg-slate-800"><Save size={19} /> Simpan Semua Rules</button>
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
    </div>
  );
}
