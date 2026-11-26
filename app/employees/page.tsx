"use client";

import { useMemo, useState } from "react";
import { Copy, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { Field, NumberInput, TextInput } from "@/components/Field";
import { Toast, type ToastKind } from "@/components/Toast";
import { usePayrollStore } from "@/lib/storage";
import type { Employee } from "@/lib/types";
import { currentPeriod } from "@/lib/payroll";
import { WorkbookTransfer } from "@/components/WorkbookTransfer";
import type { ImportMode, PayrollWorkbookData } from "@/lib/xlsx-backup";

const blankEmployee = (): Employee => ({
  id: crypto.randomUUID(), eic: "", name: "", position: "", salaryPerHour: 0,
  positionalPayoutDefault: 0, bankName: "BNI", bankAccountNumber: "", telegramChatId: "",
});

type Notice = { message: string; kind: ToastKind };

export default function EmployeesPage() {
  const { state, setEmployees, importMaster, replacePeriodPayrolls, markExported } = usePayrollStore();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const filtered = useMemo(
    () => state.employees.filter((employee) => `${employee.eic} ${employee.name} ${employee.position}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name)),
    [state.employees, search],
  );

  function openNew() {
    setEditing(blankEmployee());
    setModalOpen(true);
  }

  function saveEmployee() {
    if (!editing?.name.trim() || !editing.position.trim()) {
      setNotice({ message: "Nama lengkap dan jabatan wajib diisi.", kind: "error" });
      return;
    }
    const exists = state.employees.some((employee) => employee.id !== editing.id && editing.eic.trim() && employee.eic.trim().toLowerCase() === editing.eic.trim().toLowerCase());
    if (exists) {
      setNotice({ message: "EIC sudah digunakan karyawan lain. Periksa kembali kode karyawan.", kind: "error" });
      return;
    }
    setEmployees(state.employees.some((employee) => employee.id === editing.id)
      ? state.employees.map((employee) => employee.id === editing.id ? editing : employee)
      : [...state.employees, editing]);
    setModalOpen(false);
    setEditing(null);
    setNotice({ message: "Data karyawan berhasil disimpan.", kind: "success" });
  }

  function importWorkbook(data: PayrollWorkbookData, mode: ImportMode, records: PayrollWorkbookData["records"]) {
    importMaster(data.employees, data.settings, mode === "replace");
    replacePeriodPayrolls(data.period, records);
    markExported(data.period);
  }

  async function copyAccount(account: string) {
    try {
      await navigator.clipboard.writeText(account);
      setNotice({ message: "Nomor rekening berhasil disalin.", kind: "success" });
    } catch {
      setNotice({ message: "Browser tidak mengizinkan penyalinan otomatis. Salin nomor rekening secara manual.", kind: "error" });
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setEmployees(state.employees.filter((employee) => employee.id !== deleteTarget.id));
    setNotice({ message: `${deleteTarget.name} berhasil dihapus dari master karyawan. Arsip slip lama tetap tersimpan.`, kind: "success" });
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-8">
      {notice && <Toast message={notice.message} kind={notice.kind} onClose={() => setNotice(null)} />}

      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-[13px] font-extrabold uppercase tracking-[.18em] text-orange-600">Master Data</p>
          <h1 className="mt-2 text-[34px] font-black leading-tight tracking-tight text-slate-950">Data Karyawan</h1>
          <p className="mt-2 text-[16px] text-slate-600">Kelola identitas, tarif, rekening internal, dan koneksi Telegram.</p>
        </div>
        <button onClick={openNew} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-[15px] font-extrabold text-white shadow-sm transition hover:bg-slate-800">
          <Plus size={20} /> Tambah Karyawan
        </button>
      </div>

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-6 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-[19px] font-extrabold text-slate-950">Daftar Karyawan <span className="ml-2 text-[15px] font-semibold text-slate-400">{state.employees.length}</span></h2>
              <p className="mt-1 text-[14px] text-slate-500">Nomor rekening hanya digunakan untuk kebutuhan bendahara.</p>
            </div>
            <div className="relative w-full xl:max-w-[340px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, EIC, atau jabatan..." className="min-h-[50px] w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-slate-700 focus:ring-4 focus:ring-slate-100" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="bg-slate-50 text-[12px] font-extrabold uppercase tracking-[.1em] text-slate-500">
                <tr><th className="px-6 py-4">Karyawan</th><th className="px-6 py-4">Tarif / Jam</th><th className="px-6 py-4">Rekening BNI</th><th className="px-6 py-4">Telegram</th><th className="px-6 py-4 text-right">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[15px]">
                {filtered.map((employee) => (
                  <tr key={employee.id} className="transition hover:bg-slate-50/80">
                    <td className="px-6 py-5"><p className="font-extrabold text-slate-900">{employee.name}</p><p className="mt-1 text-[13px] text-slate-500">{employee.eic || "Tanpa EIC"} <span className="mx-1 text-slate-300">·</span> {employee.position}</p></td>
                    <td className="px-6 py-5 font-bold tabular-nums text-slate-800">Rp {employee.salaryPerHour.toLocaleString("en-US")}</td>
                    <td className="px-6 py-5"><div className="flex items-center gap-2"><span className="text-[14px] text-slate-700">{employee.bankName} · {employee.bankAccountNumber || "-"}</span>{employee.bankAccountNumber && <button title="Salin rekening" aria-label={`Salin rekening ${employee.name}`} onClick={() => copyAccount(employee.bankAccountNumber)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"><Copy size={17} /></button>}</div></td>
                    <td className="px-6 py-5">{employee.telegramChatId
                      ? <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-extrabold text-emerald-800">Terhubung</span>
                      : <span className="inline-flex rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-extrabold text-slate-600">Belum Linked</span>}</td>
                    <td className="px-6 py-5"><div className="flex justify-end gap-2">
                      <button title="Edit karyawan" aria-label={`Edit ${employee.name}`} onClick={() => { setEditing({ ...employee }); setModalOpen(true); }} className="rounded-lg border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"><Pencil size={17} /></button>
                      <button title="Hapus karyawan" aria-label={`Hapus ${employee.name}`} onClick={() => setDeleteTarget(employee)} className="rounded-lg border border-rose-200 p-2.5 text-rose-600 transition hover:bg-rose-50"><Trash2 size={17} /></button>
                    </div></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} className="px-6 py-16 text-center text-[15px] text-slate-500">{search ? "Tidak ada karyawan yang cocok dengan pencarian." : "Belum ada data karyawan. Tambahkan karyawan pertama Anda."}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-6 py-4 text-[13px] text-slate-500">Menampilkan {filtered.length} dari {state.employees.length} karyawan.</div>
        </section>

        <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <WorkbookTransfer
            compact
            period={currentPeriod()}
            employees={state.employees}
            settings={state.settings}
            records={state.payrolls.filter((record) => record.period === currentPeriod())}
            onImport={importWorkbook}
            onExported={() => markExported(currentPeriod())}
            onNotice={(message, kind = "success") => setNotice({ message, kind })}
          />
        </section>
      </div>

      {modalOpen && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="employee-modal-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-7 flex items-start justify-between gap-4"><div><h2 id="employee-modal-title" className="text-[24px] font-black text-slate-950">{state.employees.some((employee) => employee.id === editing.id) ? "Edit Karyawan" : "Tambah Karyawan"}</h2><p className="mt-1 text-[15px] text-slate-500">Lengkapi data master karyawan berikut.</p></div><button onClick={() => setModalOpen(false)} aria-label="Tutup" className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100"><X size={21} /></button></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="EIC (Opsional)"><TextInput value={editing.eic} onChange={(event) => setEditing({ ...editing, eic: event.target.value })} placeholder="MDA-001" /></Field>
              <Field label="Nama Lengkap *"><TextInput value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} placeholder="Nama karyawan" /></Field>
              <Field label="Jabatan *"><TextInput value={editing.position} onChange={(event) => setEditing({ ...editing, position: event.target.value })} placeholder="Editor (Senior)" /></Field>
              <Field label="Tarif Gaji per Jam (Rp)"><NumberInput value={editing.salaryPerHour} onValueChange={(value) => setEditing({ ...editing, salaryPerHour: value })} /></Field>
              <Field label="Tunjangan Jabatan Default (Rp)"><NumberInput value={editing.positionalPayoutDefault} onValueChange={(value) => setEditing({ ...editing, positionalPayoutDefault: value })} /></Field>
              <Field label="Bank"><TextInput value={editing.bankName} onChange={(event) => setEditing({ ...editing, bankName: event.target.value })} /></Field>
              <Field label="Nomor Rekening (Internal)"><TextInput value={editing.bankAccountNumber} onChange={(event) => setEditing({ ...editing, bankAccountNumber: event.target.value })} placeholder="Nomor rekening BNI" /></Field>
              <Field label="Telegram Chat ID"><TextInput value={editing.telegramChatId} onChange={(event) => setEditing({ ...editing, telegramChatId: event.target.value })} placeholder="Contoh: 123456789" /></Field>
            </div>
            <div className="mt-8 flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-6 sm:flex-row"><button onClick={() => setModalOpen(false)} className="min-h-[50px] rounded-xl border border-slate-300 px-6 py-3 text-[14px] font-bold text-slate-700 transition hover:bg-slate-50">Batal</button><button onClick={saveEmployee} className="min-h-[50px] rounded-xl bg-slate-950 px-7 py-3 text-[14px] font-extrabold text-white transition hover:bg-slate-800">Simpan Karyawan</button></div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">
            <div className="mb-4 inline-flex rounded-xl bg-rose-50 p-3 text-rose-700"><Trash2 size={24} /></div>
            <h2 className="text-[21px] font-black text-slate-950">Hapus karyawan?</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">Data <b>{deleteTarget.name}</b> akan dihapus dari master. Arsip slip yang sudah tersimpan tidak ikut terhapus.</p>
            <div className="mt-7 flex justify-end gap-3"><button onClick={() => setDeleteTarget(null)} className="min-h-[48px] rounded-xl border border-slate-300 px-5 text-[14px] font-bold text-slate-700">Batal</button><button onClick={confirmDelete} className="min-h-[48px] rounded-xl bg-rose-600 px-5 text-[14px] font-extrabold text-white hover:bg-rose-700">Ya, hapus</button></div>
          </div>
        </div>
      )}

    </div>
  );
}
