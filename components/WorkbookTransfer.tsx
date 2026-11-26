"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, FileUp, LoaderCircle } from "lucide-react";
import type { Employee, GlobalSettings, PayrollRecord } from "@/lib/types";
import { exportPayrollWorkbook, importPayrollWorkbook, remapImportedPayrollRecords, type ImportMode, type PayrollWorkbookData } from "@/lib/xlsx-backup";
import type { ToastKind } from "@/components/Toast";

export function WorkbookTransfer({
  period,
  employees,
  settings,
  records,
  onImport,
  onExported,
  onNotice,
  compact = false,
}: {
  period: string;
  employees: Employee[];
  settings: GlobalSettings;
  records: PayrollRecord[];
  onImport: (data: PayrollWorkbookData, mode: ImportMode, mappedRecords: PayrollRecord[]) => void;
  onExported: () => void;
  onNotice: (message: string, kind?: ToastKind) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImportMode>("merge");
  const [busy, setBusy] = useState<"export" | "import" | null>(null);
  const [pending, setPending] = useState<PayrollWorkbookData | null>(null);
  const [fileName, setFileName] = useState("");

  async function exportFile() {
    if (busy) return;
    setBusy("export");
    try {
      await exportPayrollWorkbook({ period, employees, settings, records, exportedAt: new Date().toISOString() });
      onExported();
      onNotice(`Workbook lengkap periode ${period} berhasil diekspor.`, "success");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Gagal membuat file Excel.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function selectFile(file?: File) {
    if (!file) return;
    setBusy("import");
    try {
      const data = await importPayrollWorkbook(file);
      setPending(data);
      setFileName(file.name);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "File Excel tidak dapat dibaca.", "error");
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setBusy(null);
    }
  }

  function confirmImport() {
    if (!pending) return;
    try {
      const mappedRecords = remapImportedPayrollRecords(pending.records, pending.employees, employees, mode);
      onImport(pending, mode, mappedRecords);
      onNotice(`Import berhasil: ${pending.employees.length} master karyawan dan ${mappedRecords.length} slip periode ${pending.period} diproses.`, "success");
      setPending(null);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Import workbook gagal.", "error");
    }
  }

  return (
    <div className={compact ? "space-y-4" : "flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"}>
      {compact && <div><h2 className="text-[18px] font-extrabold text-slate-950">Backup & Pemulihan Data</h2><p className="mt-1 text-[14px] leading-relaxed text-slate-600">Satu file Excel berisi master karyawan, pengaturan global, ringkasan, dan rincian payroll periode {period}.</p></div>}
      {!compact && <div className="min-w-[220px] flex-1"><p className="text-[14px] font-extrabold text-slate-900">Workbook lengkap · {period}</p><p className="mt-1 text-[13px] text-slate-500">Master karyawan + pengaturan + rekap bulanan dalam satu file.</p></div>}
      <div className={compact ? "grid gap-3" : "flex flex-wrap items-end gap-3"}>
        <button type="button" disabled={!!busy} onClick={() => void exportFile()} className={`inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[14px] font-extrabold text-slate-800 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 ${compact ? "w-full" : ""}`}>
          {busy === "export" ? <LoaderCircle className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
          Export Excel (.xlsx)
        </button>
        <div className={compact ? "space-y-2" : "min-w-[230px]"}>
          <label className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">Mode import master</label>
          <select value={mode} onChange={(event) => setMode(event.target.value as ImportMode)} className="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white px-3 text-[14px] font-semibold text-slate-800 outline-none focus:border-slate-700 focus:ring-4 focus:ring-slate-100">
            <option value="merge">Gabungkan / Perbarui (EIC / Nama)</option>
            <option value="replace">Timpa Semua Master</option>
          </select>
        </div>
        <button type="button" disabled={!!busy} onClick={() => inputRef.current?.click()} className={`inline-flex min-h-[50px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-[14px] font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 ${compact ? "w-full" : ""}`}>
          {busy === "import" ? <LoaderCircle className="animate-spin" size={18} /> : <FileUp size={18} />}
          Import dari Excel (.xlsx)
        </button>
        <input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void selectFile(event.target.files?.[0])} className="hidden" />
      </div>
      <p className="text-[12px] leading-relaxed text-slate-500">File berisi data sensitif (rekening dan Chat ID); simpan secara privat. Import memperbarui master/pengaturan dan mengganti arsip payroll pada periode di file. Hasil kalkulasi dihitung ulang; periode lain tetap tersimpan.</p>

      {pending && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <div role="alertdialog" aria-modal="true" aria-labelledby="workbook-import-title" className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><FileSpreadsheet size={25} /></div>
              <div className="min-w-0 flex-1"><h2 id="workbook-import-title" className="text-[22px] font-black text-slate-950">Konfirmasi Import Workbook</h2><p className="mt-1 break-all text-[13px] text-slate-500">{fileName}</p></div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-[12px] font-semibold text-slate-500">Master karyawan</p><p className="mt-1 text-[25px] font-black tabular-nums text-slate-950">{pending.employees.length}</p></div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-[12px] font-semibold text-slate-500">Slip payroll</p><p className="mt-1 text-[25px] font-black tabular-nums text-slate-950">{pending.records.length}</p></div>
              <div className="col-span-2 rounded-xl bg-slate-50 p-4 sm:col-span-1"><p className="text-[12px] font-semibold text-slate-500">Periode arsip</p><p className="mt-1 text-[18px] font-black text-slate-950">{pending.period}</p></div>
            </div>
            <div className={`mt-5 rounded-xl border p-4 text-[14px] leading-relaxed ${mode === "replace" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-sky-200 bg-sky-50 text-sky-900"}`}>
              {mode === "replace" ? "Mode Timpa Semua: seluruh master karyawan pada browser ini akan diganti. Pengaturan global juga diperbarui." : "Mode Gabungkan: karyawan dicocokkan berdasarkan EIC atau nama. Data yang cocok diperbarui, karyawan lain tetap dipertahankan."}
              <p className="mt-2 font-semibold">Arsip payroll periode {pending.period} akan diganti dengan {pending.records.length} slip dari file. Hasil kalkulasi dihitung ulang; arsip periode lain tidak diubah.</p>
              {mode === "replace" && <p className="mt-2">Slip periode lain tetap tersimpan, tetapi slip milik karyawan yang tidak ada lagi di master baru mungkin tidak tampil pada daftar karyawan.</p>}
            </div>
            <div className="mt-7 flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <button type="button" onClick={() => { setPending(null); setFileName(""); if (inputRef.current) inputRef.current.value = ""; }} className="min-h-[48px] rounded-xl border border-slate-300 px-5 text-[14px] font-bold text-slate-700 hover:bg-slate-50">Batal</button>
              <button type="button" onClick={confirmImport} className={`min-h-[48px] rounded-xl px-5 text-[14px] font-extrabold text-white ${mode === "replace" ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-950 hover:bg-slate-800"}`}>Konfirmasi Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
