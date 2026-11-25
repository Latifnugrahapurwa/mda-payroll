import type { Employee, GlobalSettings, PayrollComputed, PayrollInput, PayrollRecord } from "./types";

export function calculatePayroll(input: PayrollInput, settings: GlobalSettings): PayrollComputed {
  const totalPaidHours = input.workHours + input.compensationHours + input.rstHours - input.afkHours;
  const ratio = settings.standardMonthlyHours > 0 ? totalPaidHours / settings.standardMonthlyHours : 0;
  const basedPayoutAmount = totalPaidHours * input.salaryPerHour;
  const transportAllowance = input.transportAllowanceOverride ?? settings.monthlyTransportAllowanceBase * ratio;
  const mealAllowance = input.mealAllowanceOverride ?? settings.monthlyMealAllowanceBase * ratio;
  const subTotal = basedPayoutAmount + input.positionalPayoutAmount + transportAllowance + mealAllowance + input.bonus;
  const mdaFees = input.mdaFeesOverride ?? (settings.mdaFeesPercentage / 100) * subTotal;
  const totalToBePaid = subTotal - (input.loanInstallment + mdaFees);

  return { totalPaidHours, basedPayoutAmount, transportAllowance, mealAllowance, subTotal, mdaFees, totalToBePaid };
}

export function makePayrollRecord(employee: Employee, period: string, input: PayrollInput, settings: GlobalSettings): PayrollRecord {
  return {
    ...input,
    ...calculatePayroll(input, settings),
    id: `${period}_${employee.id}`,
    employeeId: employee.id,
    employeeSnapshot: {
      eic: employee.eic,
      name: employee.name,
      position: employee.position,
      bankName: employee.bankName,
      bankAccountNumber: employee.bankAccountNumber,
    },
    period,
    updatedAt: new Date().toISOString(),
  };
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0);
}

export function formatPeriod(period: string): string {
  if (!/^\d{4}-\d{2}$/.test(period)) return period;
  const [year, month] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function escapeCsv(value: unknown): string {
  const raw = String(value ?? "");
  const text = typeof value === "string" && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replace(/"/g, '""')}"`;
}

export function safeFilePart(value: string): string {
  return value.normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "Karyawan";
}

export function isPayrollRecord(value: unknown): value is PayrollRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<PayrollRecord>;
  return typeof row.id === "string" && typeof row.employeeId === "string" && typeof row.period === "string" && !!row.employeeSnapshot && typeof row.totalToBePaid === "number";
}
