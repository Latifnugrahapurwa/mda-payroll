"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppState, Employee, GlobalSettings, PayrollRecord } from "./types";
import { DEFAULT_SETTINGS } from "./types";

const STORAGE_KEY = "mda-payroll-v1";
const initialState: AppState = { employees: [], settings: DEFAULT_SETTINGS, payrolls: [], lastExportedAt: {} };

function sanitizeSettings(input?: Partial<GlobalSettings> & { telegramBotToken?: unknown }): GlobalSettings {
  const { telegramBotToken: _legacyToken, ...safeSettings } = input ?? {};
  return { ...DEFAULT_SETTINGS, ...safeSettings };
}

type StoreContextValue = {
  state: AppState;
  loaded: boolean;
  setEmployees: (employees: Employee[]) => void;
  saveSettings: (settings: GlobalSettings) => void;
  savePayroll: (record: PayrollRecord) => void;
  replacePeriodPayrolls: (period: string, records: PayrollRecord[]) => void;
  markExported: (period: string) => void;
  importMaster: (employees: Employee[], settings?: Partial<GlobalSettings>, replace?: boolean) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function PayrollStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        setState({
          employees: Array.isArray(parsed.employees) ? parsed.employees : [],
          settings: sanitizeSettings(parsed.settings as (Partial<GlobalSettings> & { telegramBotToken?: unknown }) | undefined),
          payrolls: Array.isArray(parsed.payrolls) ? parsed.payrolls : [],
          lastExportedAt: parsed.lastExportedAt ?? {},
        });
      }
    } catch {
      console.error("Data MDA tidak dapat dibaca dari localStorage.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, loaded]);

  const value = useMemo<StoreContextValue>(() => ({
    state,
    loaded,
    setEmployees: (employees) => setState((s) => ({ ...s, employees })),
    saveSettings: (settings) => setState((s) => ({ ...s, settings: sanitizeSettings(settings) })),
    savePayroll: (record) => setState((s) => ({ ...s, payrolls: [...s.payrolls.filter((p) => p.id !== record.id), record] })),
    replacePeriodPayrolls: (period, records) => setState((s) => ({ ...s, payrolls: [...s.payrolls.filter((p) => p.period !== period), ...records] })),
    markExported: (period) => setState((s) => ({ ...s, lastExportedAt: { ...s.lastExportedAt, [period]: new Date().toISOString() } })),
    importMaster: (employees, settings, replace = false) => setState((s) => ({
      ...s,
      employees: replace ? employees : mergeEmployees(s.employees, employees),
      settings: sanitizeSettings({ ...s.settings, ...(settings ?? {}) } as Partial<GlobalSettings> & { telegramBotToken?: unknown }),
    })),
  }), [state, loaded]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function mergeEmployees(existing: Employee[], incoming: Employee[]): Employee[] {
  const merged = [...existing];
  for (const employee of incoming) {
    const key = employee.eic.trim().toLowerCase();
    const index = merged.findIndex((item) => (key && item.eic.trim().toLowerCase() === key) || item.name.trim().toLowerCase() === employee.name.trim().toLowerCase());
    if (index >= 0) merged[index] = { ...merged[index], ...employee, id: merged[index].id };
    else merged.push(employee);
  }
  return merged;
}

export function usePayrollStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("usePayrollStore must be used inside PayrollStoreProvider");
  return context;
}
