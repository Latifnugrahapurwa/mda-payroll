"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastKind = "success" | "error" | "info";

export function Toast({ message, kind = "success", onClose }: { message: string; kind?: ToastKind; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 5500);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  const styles = {
    success: "border-emerald-300 bg-emerald-50 text-emerald-950",
    error: "border-rose-300 bg-rose-50 text-rose-950",
    info: "border-sky-300 bg-sky-50 text-sky-950",
  }[kind];
  const Icon = kind === "success" ? CheckCircle2 : kind === "error" ? AlertCircle : Info;

  return (
    <div role={kind === "error" ? "alert" : "status"} aria-live="polite" className={`fixed right-5 top-20 z-[120] flex w-[min(520px,calc(100vw-2.5rem))] items-start gap-3 rounded-2xl border p-5 shadow-2xl ${styles}`}>
      <Icon className="mt-0.5 shrink-0" size={24} />
      <p className="flex-1 text-[15px] font-semibold leading-relaxed">{message}</p>
      <button onClick={onClose} aria-label="Tutup notifikasi" className="rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"><X size={19} /></button>
    </div>
  );
}
