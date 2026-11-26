"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Download, FileDown, RotateCcw, Save } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { Field, NumberInput, SectionTitle, SelectInput, TextInput } from "@/components/Field";
import { SlipCard } from "@/components/SlipCard";
import { Toast, type ToastKind } from "@/components/Toast";
import { usePayrollStore } from "@/lib/storage";
import { calculatePayroll, currentPeriod, formatPeriod, makePayrollRecord, safeFilePart } from "@/lib/payroll";
import { EMPTY_PAYROLL_INPUT, type PayrollInput } from "@/lib/types";
import { WorkbookTransfer } from "@/components/WorkbookTransfer";
import type { ImportMode, PayrollWorkbookData } from "@/lib/xlsx-backup";

type Notice = { message: string; kind: ToastKind };

function NumericField({ label, value, onChange, hint, readOnly = false }: { label: string; value: number; onChange?: (value: number) => void; hint?: string; readOnly?: boolean }) {
  return <Field label={label} hint={hint}><NumberInput value={Number.isFinite(value) ? value : 0} onValueChange={(next) => onChange?.(next)} readOnly={readOnly} showZero={readOnly} /></Field>;
}

export default function PayrollPage() {
  const { state, savePayroll, markExported, replacePeriodPayrolls, importMaster } = usePayrollStore();
  const [period, setPeriod] = useState(currentPeriod());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [form, setForm] = useState<PayrollInput>(EMPTY_PAYROLL_INPUT);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const employees = useMemo(() => [...state.employees].sort((a, b) => a.name.localeCompare(b.name)), [state.employees]);
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? null;
  const existingRecord = state.payrolls.find((record) => record.period === period && record.employeeId === selectedEmployeeId);
  const calculations = useMemo(() => calculatePayroll(form, state.settings), [form, state.settings]);
  const previewRecord = useMemo(() => selectedEmployee ? makePayrollRecord(selectedEmployee, period, form, state.settings) : null, [selectedEmployee, period, form, state.settings]);
  const periodRecords = state.payrolls.filter((record) => record.period === period);
  const lastExport = state.lastExportedAt[period];
  const needsBackup = periodRecords.length > 0 && (!lastExport || periodRecords.some((record) => new Date(record.updatedAt).getTime() > new Date(lastExport).getTime()));
  const selectedIndex = employees.findIndex((employee) => employee.id === selectedEmployeeId);

  useEffect(() => {
    if (!selectedEmployeeId && employees.length) setSelectedEmployeeId(employees[0].id);
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedEmployee) {
      setForm(EMPTY_PAYROLL_INPUT);
      return;
    }
    const saved = state.payrolls.find((record) => record.period === period && record.employeeId === selectedEmployee.id);
    if (saved) {
      const { id: _id, employeeId: _employeeId, employeeSnapshot: _snapshot, period: _period, updatedAt: _updatedAt, totalPaidHours: _hours, basedPayoutAmount: _based, transportAllowance: _transport, mealAllowance: _meal, subTotal: _sub, mdaFees: _fees, totalToBePaid: _total, ...input } = saved;
      setForm(input);
    } else {
      setForm({ ...EMPTY_PAYROLL_INPUT, salaryPerHour: selectedEmployee.salaryPerHour, positionalPayoutAmount: selectedEmployee.positionalPayoutDefault });
    }
  }, [selectedEmployeeId, period, state.payrolls, state.employees]);

  function notify(message: string, kind: ToastKind = "success") {
    setNotice({ message, kind });
  }

  function update<K extends keyof PayrollInput>(key: K, value: PayrollInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function navigateEmployee(direction: number) {
    if (!employees.length) return;
    const next = (selectedIndex + direction + employees.length) % employees.length;
    setSelectedEmployeeId(employees[next].id);
  }

  function save() {
    if (!selectedEmployee || !previewRecord) return;
    savePayroll(previewRecord);
    notify(`Slip ${selectedEmployee.name} periode ${formatPeriod(period)} berhasil disimpan.`);
  }

  async function createPng() {
    const node = exportRef.current;
    if (!node || !previewRecord) throw new Error("Slip belum siap diekspor.");
    const width = 760;
    const height = Math.max(1040, node.scrollHeight);
    return toPng(node, { width, height, pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
  }

  async function downloadImage() {
    if (exporting) return;
    setExporting("png");
    try {
      const data = await createPng();
      const anchor = document.createElement("a");
      anchor.href = data;
      anchor.download = `Slip_Gaji_${safeFilePart(selectedEmployee?.name ?? "Karyawan")}_${period}.png`;
      anchor.click();
      notify("Slip gaji berhasil diekspor ke PNG resolusi tinggi.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal membuat PNG. Silakan coba kembali.", "error");
    } finally {
      setExporting(null);
    }
  }

  async function downloadPdf() {
    if (exporting) return;
    setExporting("pdf");
    try {
      const data = await createPng();
      const image = new window.Image();
      image.src = data;
      await image.decode();

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 12;
      const scale = Math.min((pageWidth - margin * 2) / image.naturalWidth, (pageHeight - margin * 2) / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      pdf.addImage(data, "PNG", (pageWidth - width) / 2, (pageHeight - height) / 2, width, height, undefined, "FAST");
      pdf.save(`Slip_Gaji_${safeFilePart(selectedEmployee?.name ?? "Karyawan")}_${period}.pdf`);
      notify("Slip gaji berhasil diekspor ke PDF A4 tanpa pemotongan konten.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Gagal membuat PDF. Silakan coba kembali.", "error");
    } finally {
      setExporting(null);
    }
  }

  function importWorkbook(data: PayrollWorkbookData, mode: ImportMode, records: PayrollWorkbookData["records"]) {
    importMaster(data.employees, data.settings, mode === "replace");
    replacePeriodPayrolls(data.period, records);
    markExported(data.period);
    setPeriod(data.period);
    setSelectedEmployeeId(records[0]?.employeeId ?? (mode === "replace" ? data.employees[0]?.id : state.employees[0]?.id) ?? "");
  }

  return (
    <div className="space-y-8 pb-10">
      {notice && <Toast message={notice.message} kind={notice.kind} onClose={() => setNotice(null)} />}

      <div className="flex flex-col justify-between gap-5 2xl:flex-row 2xl:items-end">
        <div>
          <p className="text-[13px] font-extrabold uppercase tracking-[.18em] text-orange-600">Payroll Workspace</p>
          <h1 className="mt-2 text-[34px] font-black leading-tight tracking-tight text-slate-950">Input & Slip Gaji</h1>
          <p className="mt-2 text-[16px] text-slate-600">Input komponen penggajian dan periksa slip secara langsung.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-[54px] items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 shadow-sm">
            <span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-500">Periode</span>
            <input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="min-w-0 bg-transparent text-[16px] font-extrabold text-slate-950 outline-none" />
          </label>
          <span className={`inline-flex min-h-[48px] items-center rounded-xl px-4 py-3 text-[13px] font-extrabold ${needsBackup ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{needsBackup ? "Perlu Backup" : "Arsip Tersimpan"}</span>
        </div>
      </div>

      <WorkbookTransfer
        period={period}
        employees={state.employees}
        settings={state.settings}
        records={periodRecords}
        onImport={importWorkbook}
        onExported={() => markExported(period)}
        onNotice={notify}
      />

      {employees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm"><h2 className="text-[22px] font-extrabold">Belum ada karyawan</h2><p className="mt-2 text-[16px] text-slate-600">Tambahkan master karyawan terlebih dahulu untuk membuat slip gaji.</p></div>
      ) : (
        <div className="grid items-start gap-7 2xl:grid-cols-[minmax(0,1fr)_minmax(580px,.98fr)]">
          <section className="min-w-0 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1"><Field label="Pilih Karyawan"><SelectInput value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} {employee.eic ? `(${employee.eic})` : ""}</option>)}</SelectInput></Field></div>
                <div className="flex gap-2"><button onClick={() => navigateEmployee(-1)} title="Karyawan sebelumnya" aria-label="Karyawan sebelumnya" className="flex h-[52px] w-[54px] items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-100"><ArrowLeft size={21} /></button><button onClick={() => navigateEmployee(1)} title="Karyawan berikutnya" aria-label="Karyawan berikutnya" className="flex h-[52px] w-[54px] items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-100"><ArrowRight size={21} /></button></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><span className="text-[14px] font-medium text-slate-600">Karyawan {selectedIndex + 1} dari {employees.length}</span>{existingRecord ? <span className="rounded-full bg-emerald-50 px-4 py-2 text-[13px] font-extrabold text-emerald-800">Slip Tersimpan</span> : <span className="rounded-full bg-amber-50 px-4 py-2 text-[13px] font-extrabold text-amber-800">Belum Disimpan</span>}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-7">
              <SectionTitle>Employee Details</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="EIC"><TextInput value={selectedEmployee?.eic ?? ""} readOnly placeholder="-" /></Field>
                <Field label="Name"><TextInput value={selectedEmployee?.name ?? ""} readOnly /></Field>
                <Field label="Position"><TextInput value={selectedEmployee?.position ?? ""} readOnly /></Field>
                <Field label="Salary / Hours (Rp)" hint="Dapat di-override khusus periode ini"><NumberInput value={form.salaryPerHour} onValueChange={(value) => update("salaryPerHour", value)} /></Field>
                <Field label="Positional Payout Default (Rp)"><TextInput value={selectedEmployee?.positionalPayoutDefault ? String(selectedEmployee.positionalPayoutDefault) : ""} readOnly placeholder="0" /></Field>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-7">
              <SectionTitle>Attendance Data (Days / Hours)</SectionTitle>
              <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
                <NumericField label="Attend (Days)" value={form.attend} onChange={(value) => update("attend", value)} />
                <NumericField label="Sick Leave" value={form.sickLeave} onChange={(value) => update("sickLeave", value)} />
                <NumericField label="Absence" value={form.absence} onChange={(value) => update("absence", value)} />
                <NumericField label="Leave Permitted" value={form.leavePermitted} onChange={(value) => update("leavePermitted", value)} />
                <NumericField label="AFK Count" value={form.afkCount} onChange={(value) => update("afkCount", value)} />
                <NumericField label="AFK Hours" value={form.afkHours} onChange={(value) => update("afkHours", value)} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-7">
              <SectionTitle>Payment Rules</SectionTitle>
              <div className="grid grid-cols-2 gap-5">
                <NumericField label="Work Hours" value={form.workHours} onChange={(value) => update("workHours", value)} />
                <NumericField label="Compensation Hours" value={form.compensationHours} onChange={(value) => update("compensationHours", value)} />
                <NumericField label="RST Hours" value={form.rstHours} onChange={(value) => update("rstHours", value)} />
                <NumericField label="Total Paid Hours" value={calculations.totalPaidHours} readOnly />
              </div>
              <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[14px] leading-relaxed text-slate-700">Work Hours + Compensation Hours + RST Hours − AFK Hours</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-7">
              <SectionTitle>Allowances & Bonus</SectionTitle>
              <div className="grid grid-cols-2 gap-5">
                <NumericField label="Positional Payout (Rp)" value={form.positionalPayoutAmount} onChange={(value) => update("positionalPayoutAmount", value)} />
                <div><NumericField label="Transport Allowance (Rp)" value={form.transportAllowanceOverride ?? calculations.transportAllowance} onChange={(value) => update("transportAllowanceOverride", value)} /><button onClick={() => update("transportAllowanceOverride", null)} className="mt-2 text-[13px] font-bold text-sky-700 transition hover:text-sky-900">Gunakan otomatis</button></div>
                <div><NumericField label="Meal Allowance (Rp)" value={form.mealAllowanceOverride ?? calculations.mealAllowance} onChange={(value) => update("mealAllowanceOverride", value)} /><button onClick={() => update("mealAllowanceOverride", null)} className="mt-2 text-[13px] font-bold text-sky-700 transition hover:text-sky-900">Gunakan otomatis</button></div>
                <NumericField label="Performance Bonus (%)" value={form.performanceBonusPercentage} onChange={(value) => update("performanceBonusPercentage", value)} />
                <NumericField label="Bonus (Rp)" value={form.bonus} onChange={(value) => update("bonus", value)} />
                <NumericField label="Sub Total (Rp)" value={calculations.subTotal} readOnly />
              </div>
              <div className="mt-5"><Field label="Bonus Notes"><textarea value={form.bonusNotes} onChange={(event) => update("bonusNotes", event.target.value)} rows={4} placeholder="Catatan bonus atau keterangan performa..." className="min-h-[116px] w-full rounded-xl border border-slate-300 px-4 py-3 text-[16px] leading-relaxed outline-none transition placeholder:text-slate-400 focus:border-slate-700 focus:ring-4 focus:ring-slate-100" /></Field></div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-7">
              <SectionTitle>Deductions</SectionTitle>
              <div className="grid grid-cols-2 gap-5">
                <NumericField label="Loan Installment (Rp)" value={form.loanInstallment} onChange={(value) => update("loanInstallment", value)} />
                <div><NumericField label="MDA Fees (Rp)" value={form.mdaFeesOverride ?? calculations.mdaFees} onChange={(value) => update("mdaFeesOverride", value)} /><button onClick={() => update("mdaFeesOverride", null)} className="mt-2 text-[13px] font-bold text-sky-700 transition hover:text-sky-900">Gunakan otomatis</button></div>
              </div>
              <p className="mt-5 text-[14px] text-slate-600">Tarif MDA saat ini: <b>{state.settings.mdaFeesPercentage}%</b> dari Sub Total.</p>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft sm:flex-row sm:p-6">
              <button onClick={save} className="inline-flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-[15px] font-extrabold text-white transition hover:bg-slate-800"><Save size={20} /> Simpan Slip</button>
              <button onClick={() => { if (selectedEmployee) setForm({ ...EMPTY_PAYROLL_INPUT, salaryPerHour: selectedEmployee.salaryPerHour, positionalPayoutAmount: selectedEmployee.positionalPayoutDefault }); }} className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 py-3 text-[15px] font-bold text-slate-700 transition hover:bg-slate-50"><RotateCcw size={18} /> Reset Form</button>
            </div>
          </section>

          <section className="min-w-0">
            <div className="mb-4 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div><h2 className="text-[22px] font-extrabold text-slate-950">Live Preview</h2><p className="mt-1 text-[14px] text-slate-600">Tampilan slip gaji · siap diunduh dan dicetak</p></div>
              <div className="flex flex-wrap gap-2"><button onClick={downloadImage} disabled={!!exporting} className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"><Download size={17} /> {exporting === "png" ? "Membuat PNG..." : "Download PNG"}</button><button onClick={downloadPdf} disabled={!!exporting} className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"><FileDown size={17} /> {exporting === "pdf" ? "Membuat PDF..." : "Download PDF"}</button></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-inner sm:p-5">
              <div className="mx-auto w-full max-w-[760px] overflow-hidden rounded-sm shadow-xl">{previewRecord && <SlipCard record={previewRecord} />}</div>
            </div>
            <p className="mt-4 text-center text-[13px] text-slate-500">Nomor rekening bank tidak ditampilkan pada slip gaji.</p>
          </section>
        </div>
      )}

      {previewRecord && (
        <div aria-hidden="true" className="pointer-events-none fixed left-[-12000px] top-0 opacity-0">
          <div ref={exportRef} style={{ width: 760, minWidth: 760 }}><SlipCard record={previewRecord} /></div>
        </div>
      )}
    </div>
  );
}
