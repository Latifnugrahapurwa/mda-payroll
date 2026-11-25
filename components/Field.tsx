"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block min-w-0 space-y-2.5">
      <span className="block text-[15px] font-semibold text-slate-800">{label}</span>
      {children}
      {hint && <span className="block text-[13px] leading-relaxed text-slate-500">{hint}</span>}
    </label>
  );
}

const controlClass = "min-h-[52px] w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[16px] leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-slate-700 focus:ring-4 focus:ring-slate-200/80 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 read-only:bg-slate-50";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${props.className ?? ""}`} />;
}

export function NumberInput({ value, onValueChange, min = 0, showZero = false, ...props }: {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  showZero?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "min" | "inputMode">) {
  const toDisplay = (number: number) => number === 0 && !showZero ? "" : String(number ?? "");
  const [draft, setDraft] = useState(() => toDisplay(value));
  const lastValue = useRef(value);
  const pendingValue = useRef<number | null>(null);

  useEffect(() => {
    if (value !== lastValue.current) {
      lastValue.current = value;
      if (pendingValue.current !== value) setDraft(toDisplay(value));
      pendingValue.current = null;
    }
  }, [value, showZero]);

  function change(next: string) {
    const normalized = next.replace(",", ".");
    if (!/^\d*\.?\d*$/.test(normalized)) return;
    setDraft(next);
    if (normalized !== "" && normalized !== ".") {
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) {
        const nextValue = Math.max(min, parsed);
        pendingValue.current = nextValue;
        onValueChange(nextValue);
      }
    } else {
      pendingValue.current = null;
    }
  }

  function commit() {
    const normalized = draft.replace(",", ".");
    const parsed = normalized === "" || normalized === "." ? min : Number(normalized);
    const next = Number.isFinite(parsed) ? Math.max(min, parsed) : min;
    setDraft(toDisplay(next));
    pendingValue.current = next;
    onValueChange(next);
  }

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      value={draft}
      placeholder={props.placeholder ?? "0"}
      onChange={(event) => change(event.target.value)}
      onBlur={commit}
      className={`${controlClass} tabular-nums ${props.className ?? ""}`}
    />
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClass} ${props.className ?? ""}`} />;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-[16px] font-extrabold uppercase tracking-[.09em] text-slate-900">{children}</h3>
      {aside}
    </div>
  );
}
