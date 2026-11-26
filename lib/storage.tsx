"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppState, Employee, GlobalSettings, PaymentRule, PayrollRecord } from "./types";
import { createDefaultPaymentRule, DEFAULT_SETTINGS } from "./types";

const STORAGE_KEY = "mda-payroll-v1";
const initialState: AppState = {
  employees: [],
  settings: DEFAULT_SETTINGS,
  paymentRules: [createDefaultPaymentRule()],
  payrolls: [],
  lastExportedAt: {},
};

function sanitizeSettings(input?: Partial<GlobalSettings> & { telegramBotToken?: unknown }): GlobalSettings {
  const { telegramBotToken: _legacyToken, ...safeSettings } = input ?? {};
  return { ...DEFAULT_SETTINGS, ...safeSettings };
}

function normalizePaymentRule(rule: Partial<PaymentRule>, fallback: PaymentRule): PaymentRule {
  return {
    id: typeof rule.id === "string" && rule.id ? rule.id : crypto.randomUUID(),
    name: typeof rule.name === "string" && rule.name.trim() ? rule.name.trim() : fallback.name,
    description: typeof rule.description === "string" ? rule.description : "",
    standardMonthlyHours: Number.isFinite(rule.standardMonthlyHours) && Number(rule.standardMonthlyHours) > 0 ? Number(rule.standardMonthlyHours) : fallback.standardMonthlyHours,
    monthlyTransportAllowanceBase: Number.isFinite(rule.monthlyTransportAllowanceBase) ? Number(rule.monthlyTransportAllowanceBase) : fallback.monthlyTransportAllowanceBase,
    monthlyMealAllowanceBase: Number.isFinite(rule.monthlyMealAllowanceBase) ? Number(rule.monthlyMealAllowanceBase) : fallback.monthlyMealAllowanceBase,
    mdaFeesPercentage: Number.isFinite(rule.mdaFeesPercentage) ? Number(rule.mdaFeesPercentage) : fallback.mdaFeesPercentage,
    defaultWorkHours: Number.isFinite(rule.defaultWorkHours) ? Number(rule.defaultWorkHours) : 0,
    defaultCompensationHours: Number.isFinite(rule.defaultCompensationHours) ? Number(rule.defaultCompensationHours) : 0,
    defaultRstHours: Number.isFinite(rule.defaultRstHours) ? Number(rule.defaultRstHours) : 0,
  };
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

function mergePaymentRules(existing: PaymentRule[], incoming: PaymentRule[]) {
  const merged = [...existing];
  const idMap = new Map<string, string>();
  for (const rule of incoming) {
    const index = merged.findIndex((item) =>
      item.id === rule.id || item.name.trim().toLowerCase() === rule.name.trim().toLowerCase(),
    );
    if (index >= 0) {
      const id = merged[index].id;
      merged[index] = { ...rule, id };
      idMap.set(rule.id, id);
    } else {
      merged.push(rule);
      idMap.set(rule.id, rule.id);
    }
  }
  return { rules: merged, idMap };
}

type StoreContextValue = {
  state: AppState;
  loaded: boolean;
  setEmployees: (employees: Employee[]) => void;
  saveSettings: (settings: GlobalSettings) => void;
  savePaymentRules: (rules: PaymentRule[]) => void;
  savePayroll: (record: PayrollRecord) => void;
  replacePeriodPayrolls: (period: string, records: PayrollRecord[]) => void;
  markExported: (period: string) => void;
  importMaster: (employees: Employee[], settings: Partial<GlobalSettings>, rules: PaymentRule[], replace?: boolean) => void;
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
        const settings = sanitizeSettings(parsed.settings as (Partial<GlobalSettings> & { telegramBotToken?: unknown }) | undefined);
        const fallbackRule = createDefaultPaymentRule(settings);
        const paymentRules = Array.isArray(parsed.paymentRules) && parsed.paymentRules.length
          ? parsed.paymentRules.map((rule) => normalizePaymentRule(rule, fallbackRule))
          : [fallbackRule];
        const defaultRule = paymentRules[0];
        const employees = (Array.isArray(parsed.employees) ? parsed.employees : []).map((employee) => ({
          ...employee,
          paymentRuleId: employee.paymentRuleId || defaultRule.id,
        }));
        const payrolls = (Array.isArray(parsed.payrolls) ? parsed.payrolls : []).map((record) => ({
          ...record,
          afkAutoEnabled: record.afkAutoEnabled ?? false,
          paymentRuleSnapshot: record.paymentRuleSnapshot
            ? normalizePaymentRule(record.paymentRuleSnapshot, fallbackRule)
            : fallbackRule,
        }));
        setState({
          employees,
          settings,
          paymentRules,
          payrolls,
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
    savePaymentRules: (rules) => setState((s) => ({ ...s, paymentRules: rules })),
    savePayroll: (record) => setState((s) => ({ ...s, payrolls: [...s.payrolls.filter((p) => p.id !== record.id), record] })),
    replacePeriodPayrolls: (period, records) => setState((s) => ({ ...s, payrolls: [...s.payrolls.filter((p) => p.period !== period), ...records] })),
    markExported: (period) => setState((s) => ({ ...s, lastExportedAt: { ...s.lastExportedAt, [period]: new Date().toISOString() } })),
    importMaster: (employees, settings, rules, replace = false) => setState((s) => {
      const incomingRules = rules.length ? rules : [createDefaultPaymentRule(sanitizeSettings(settings))];
      const merged = replace ? { rules: incomingRules, idMap: new Map(incomingRules.map((rule) => [rule.id, rule.id])) } : mergePaymentRules(s.paymentRules, incomingRules);
      const mappedEmployees = employees.map((employee) => ({
        ...employee,
        paymentRuleId: merged.idMap.get(employee.paymentRuleId) ?? employee.paymentRuleId,
      }));
      return {
        ...s,
        employees: replace ? mappedEmployees : mergeEmployees(s.employees, mappedEmployees),
        settings: sanitizeSettings({ ...s.settings, ...(settings ?? {}) }),
        paymentRules: merged.rules,
      };
    }),
  }), [state, loaded]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function usePayrollStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("usePayrollStore must be used inside PayrollStoreProvider");
  return context;
}
