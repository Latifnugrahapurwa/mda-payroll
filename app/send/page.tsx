"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Copy, Send, Users, CheckCircle2, Clock3, Wallet } from "lucide-react";
import { SlipCard } from "@/components/SlipCard";
import { Toast, type ToastKind } from "@/components/Toast";
import { usePayrollStore } from "@/lib/storage";
import { currentPeriod, formatMoney, formatNumber, formatPeriod, safeFilePart } from "@/lib/payroll";
import type { PayrollRecord } from "@/lib/types";
import { WorkbookTransfer } from "@/components/WorkbookTransfer";
import type { ImportMode, PayrollWorkbookData } from "@/lib/xlsx-backup";

type SendStatus = "Draft" | "Siap Kirim" | "Mengirim..." | "Terkirim" | "Gagal" | "Belum Linked";
type Notice = { message: string; kind: ToastKind };
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export default function SendPage() {
  const { state, replacePeriodPayrolls, markExported, importMaster } = usePayrollStore();
  const [period, setPeriod] = useState(currentPeriod());
  const [statuses, setStatuses] = useState<Record<string, SendStatus>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0, running: false });
  const [notice, setNotice] = useState<Notice | null>(null);
  const slipRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const rows = useMemo(() => [...state.employees].sort((a, b) => a.name.localeCompare(b.name)).map((employee) => ({ employee, record: state.payrolls.find((payroll) => payroll.period === period && payroll.employeeId === employee.id) ?? null })), [state.employees, state.payrolls, period]);
  const records = rows.flatMap((row) => row.record ? [row.record] : []);
  const readyCount = rows.filter(({ employee, record }) => !!record && !!employee.telegramChatId).length;
  const lastExport = state.lastExportedAt[period];
  const needsBackup = records.length > 0 && (!lastExport || records.some((record) => new Date(record.updatedAt).getTime() > new Date(lastExport).getTime()));
  const sentCount = Object.values(statuses).filter((status) => status === "Terkirim").length;

  useEffect(() => setStatuses({}), [period]);

  function notify(message: string, kind: ToastKind = "success") {
    setNotice({ message, kind });
  }

  function statusFor(employeeId: string, hasRecord: boolean, hasChatId: boolean): SendStatus {
    return statuses[employeeId] ?? (!hasRecord ? "Draft" : !hasChatId ? "Belum Linked" : "Siap Kirim");
  }

  async function sendRecord(employeeId: string, record: PayrollRecord, chatId: string) {
    const node = slipRefs.current[employeeId];
    if (!node) throw new Error("Komponen slip belum siap dirender.");
    setStatuses((current) => ({ ...current, [employeeId]: "Mengirim..." }));
    const image = await toPng(node, { width: 760, height: Math.max(1040, node.scrollHeight), pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
    const blob = await (await fetch(image)).blob();
    if (blob.size > 4 * 1024 * 1024) throw new Error("Ukuran PNG melebihi batas aman 4 MB untuk Vercel Functions.");
    const filename = `Slip_Gaji_${safeFilePart(record.employeeSnapshot.name)}_${period}.png`;
    const body = new FormData();
    body.append("file", blob, filename);
    body.append("chatId", chatId);
    body.append("employeeName", record.employeeSnapshot.name);
    body.append("period", formatPeriod(period));
    const response = await fetch("/api/telegram/send-slip", { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Telegram API error (${response.status})`);
    setStatuses((current) => ({ ...current, [employeeId]: "Terkirim" }));
  }

  async function sendOne(employeeId: string) {
    const row = rows.find((item) => item.employee.id === employeeId);
    if (!row?.record || !row.employee.telegramChatId) {
      notify("Slip belum disimpan atau Telegram Chat ID belum diisi.", "error");
      return;
    }
    try {
      await sendRecord(employeeId, row.record, row.employee.telegramChatId);
      notify(`Slip ${row.employee.name} berhasil dikirim ke Telegram.`);
    } catch (error) {
      setStatuses((current) => ({ ...current, [employeeId]: "Gagal" }));
      notify(`Gagal mengirim ${row.employee.name}: ${error instanceof Error ? error.message : "Kesalahan tidak diketahui"}`, "error");
    }
  }

  async function sendBatch() {
    const queue = rows.filter(({ employee, record }) => !!record && !!employee.telegramChatId);
    if (!queue.length) {
      notify("Belum ada slip tersimpan dengan Telegram Chat ID yang terisi.", "error");
      return;
    }
    setProgress({ done: 0, total: queue.length, running: true });
    let success = 0;
    for (let index = 0; index < queue.length; index++) {
      const { employee, record } = queue[index];
      try {
        await sendRecord(employee.id, record!, employee.telegramChatId);
        success++;
      } catch (error) {
        setStatuses((current) => ({ ...current, [employee.id]: "Gagal" }));
        notify(`Gagal mengirim ${employee.name}: ${error instanceof Error ? error.message : "Kesalahan tidak diketahui"}`, "error");
      }
      setProgress({ done: index + 1, total: queue.length, running: true });
      if (index < queue.length - 1) await wait(400);
    }
    setProgress((current) => ({ ...current, running: false }));
    notify(`Batch selesai: ${success} dari ${queue.length} slip berhasil dikirim.`, success === queue.length ? "success" : "info");
  }

  function importWorkbook(data: PayrollWorkbookData, mode: ImportMode, importedRecords: PayrollWorkbookData["records"]) {
    importMaster(data.employees, data.settings, data.paymentRules, mode === "replace");
    replacePeriodPayrolls(data.period, importedRecords);
    markExported(data.period);
    setPeriod(data.period);
    setStatuses({});
    setProgress({ done: 0, total: 0, running: false });
  }

  async function copyAccount(account: string) {
    try {
      await navigator.clipboard.writeText(account);
      notify("Nomor rekening berhasil disalin.");
    } catch {
      notify("Browser tidak mengizinkan penyalinan otomatis.", "error");
    }
  }

  function statusStyle(status: SendStatus) {
    if (status === "Terkirim") return "bg-emerald-50 text-emerald-800";
    if (status === "Gagal") return "bg-rose-50 text-rose-800";
    if (status === "Mengirim...") return "bg-sky-50 text-sky-800";
    if (status === "Siap Kirim") return "bg-amber-50 text-amber-900";
    return "bg-slate-100 text-slate-700";
  }

  return (
    <div className="space-y-8">
      {notice && <Toast message={notice.message} kind={notice.kind} onClose={() => setNotice(null)} />}

      <div className="flex flex-col justify-between gap-5 2xl:flex-row 2xl:items-end">
        <div><p className="text-[13px] font-extrabold uppercase tracking-[.18em] text-orange-600">Distribution Center</p><h1 className="mt-2 text-[34px] font-black leading-tight tracking-tight text-slate-950">Pengiriman & Rekap Transfer</h1><p className="mt-2 text-[16px] text-slate-600">Periksa slip tersimpan, rekening transfer, dan status distribusi Telegram.</p></div>
        <div className="flex flex-wrap items-center gap-3"><label className="flex min-h-[54px] items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 shadow-sm"><span className="text-[12px] font-extrabold uppercase tracking-wider text-slate-500">Periode</span><input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="bg-transparent text-[16px] font-extrabold outline-none" /></label><span className={`inline-flex min-h-[48px] items-center rounded-xl px-4 py-3 text-[13px] font-extrabold ${needsBackup ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{needsBackup ? "Perlu Backup" : "Arsip Tersimpan"}</span></div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"><div className="flex items-center justify-between"><p className="text-[14px] font-bold text-slate-600">Total Karyawan</p><span className="rounded-xl bg-slate-100 p-3 text-slate-700"><Users size={22} /></span></div><p className="mt-3 text-[34px] font-black tabular-nums text-slate-950">{rows.length}</p><p className="mt-1 text-[13px] text-slate-500">Karyawan pada master data</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"><div className="flex items-center justify-between"><p className="text-[14px] font-bold text-slate-600">Slip Tersimpan</p><span className="rounded-xl bg-sky-50 p-3 text-sky-700"><CheckCircle2 size={22} /></span></div><p className="mt-3 text-[34px] font-black tabular-nums text-slate-950">{records.length}</p><p className="mt-1 text-[13px] text-slate-500">Slip pada periode aktif</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft"><div className="flex items-center justify-between"><p className="text-[14px] font-bold text-slate-600">Siap Dikirim</p><span className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><Send size={22} /></span></div><p className="mt-3 text-[34px] font-black tabular-nums text-slate-950">{readyCount}</p><p className="mt-1 text-[13px] text-slate-500">{sentCount} sudah terkirim pada sesi ini</p></div>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-soft sm:p-7">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div><div className="flex items-center gap-3"><span className="rounded-xl bg-white/10 p-3"><Send size={23} /></span><div><h2 className="text-[21px] font-extrabold">Batch Telegram · {formatPeriod(period)}</h2><p className="mt-1 text-[14px] text-slate-300">Pengiriman otomatis secara berurutan dengan jeda 400 ms antar karyawan.</p></div></div></div>
          <button disabled={progress.running || readyCount === 0} onClick={sendBatch} className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-[15px] font-extrabold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"><Send size={19} /> {progress.running ? "Mengirim Batch..." : "Kirim Semua ke Telegram"}</button>
        </div>
        {progress.total > 0 && <div className="mt-7"><div className="mb-2 flex justify-between gap-3 text-[13px] font-bold text-slate-200"><span>{progress.running ? "Proses pengiriman sedang berjalan" : "Proses pengiriman selesai"}</span><span className="tabular-nums">{progress.done} / {progress.total}</span></div><div className="h-3 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-400 transition-all duration-300" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div></div>}
        <p className="mt-4 text-[13px] text-slate-400">Browser harus tetap terbuka selama batch berlangsung. Slip dikirim sebagai dokumen PNG agar kualitas tetap tajam.</p>
      </section>

      <WorkbookTransfer
        period={period}
        employees={state.employees}
        settings={state.settings}
        paymentRules={state.paymentRules}
        records={records}
        onImport={importWorkbook}
        onExported={() => markExported(period)}
        onNotice={notify}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-6 sm:flex-row sm:items-center"><div><h2 className="text-[20px] font-extrabold text-slate-950">Rekap Karyawan & Status Pengiriman</h2><p className="mt-1 text-[14px] text-slate-600">Nomor rekening ditampilkan hanya untuk keperluan transfer bendahara.</p></div><div className="flex items-center gap-2 text-[13px] font-semibold text-slate-500"><Wallet size={19} /> {records.length} slip untuk periode ini</div></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1360px] text-left">
            <thead className="bg-slate-50 text-[12px] font-extrabold uppercase tracking-[.1em] text-slate-500"><tr><th className="px-6 py-4">Karyawan</th><th className="px-5 py-4">Total Paid Hours</th><th className="px-5 py-4">Total To Be Paid</th><th className="px-5 py-4">Rekening BNI</th><th className="px-5 py-4">Telegram Chat ID</th><th className="px-5 py-4">Status</th><th className="px-6 py-4 text-right">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100 text-[14px]">
              {rows.map(({ employee, record }) => {
                const status = statusFor(employee.id, !!record, !!employee.telegramChatId);
                return <tr key={employee.id} className="transition hover:bg-slate-50/80">
                  <td className="px-6 py-5"><p className="font-extrabold text-slate-900">{employee.name}</p><p className="mt-1 text-[13px] text-slate-500">{employee.eic || "-"} <span className="mx-1 text-slate-300">·</span> {employee.position}</p></td>
                  <td className="px-5 py-5 tabular-nums text-slate-700">{record ? formatNumber(record.totalPaidHours) : "-"}</td>
                  <td className="px-5 py-5 font-extrabold tabular-nums text-slate-900">{record ? `Rp ${formatMoney(record.totalToBePaid)}` : "-"}</td>
                  <td className="px-5 py-5"><div className="flex items-center gap-2"><span className="text-slate-700">{employee.bankName} · {employee.bankAccountNumber || "-"}</span>{employee.bankAccountNumber && <button onClick={() => void copyAccount(employee.bankAccountNumber)} title="Salin rekening" aria-label={`Salin rekening ${employee.name}`} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"><Copy size={17} /></button>}</div></td>
                  <td className="px-5 py-5 tabular-nums text-slate-600">{employee.telegramChatId || "-"}</td>
                  <td className="px-5 py-5"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-extrabold ${statusStyle(status)}`}>{status === "Mengirim..." && <Clock3 size={14} />}{status}</span></td>
                  <td className="px-6 py-5 text-right"><button disabled={!record || !employee.telegramChatId || progress.running || status === "Mengirim..."} onClick={() => void sendOne(employee.id)} className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-[13px] font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"><Send size={16} /> Kirim</button></td>
                </tr>;
              })}
              {rows.length === 0 && <tr><td colSpan={7} className="px-6 py-16 text-center text-[15px] text-slate-500">Belum ada master karyawan.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-6 py-4 text-[13px] text-slate-500">Geser tabel ke samping untuk melihat semua kolom jika layar tidak cukup lebar.</div>
      </section>

      <div aria-hidden="true" className="pointer-events-none fixed left-[-12000px] top-0 w-[760px] opacity-0">{rows.filter((row): row is { employee: typeof row.employee; record: PayrollRecord } => !!row.record).map(({ employee, record }) => <div key={employee.id} ref={(node) => { slipRefs.current[employee.id] = node; }} style={{ width: 760, minWidth: 760 }}><SlipCard record={record} /></div>)}</div>
    </div>
  );
}
