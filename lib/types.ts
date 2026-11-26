export type PaymentRule = {
  id: string;
  name: string;
  description: string;
  standardMonthlyHours: number;
  monthlyTransportAllowanceBase: number;
  monthlyMealAllowanceBase: number;
  mdaFeesPercentage: number;
  defaultWorkHours: number;
  defaultCompensationHours: number;
  defaultRstHours: number;
};

export type Employee = {
  id: string;
  eic: string;
  name: string;
  position: string;
  salaryPerHour: number;
  positionalPayoutDefault: number;
  paymentRuleId: string;
  bankName: string;
  bankAccountNumber: string;
  telegramChatId: string;
};

export type GlobalSettings = {
  standardMonthlyHours: number;
  monthlyTransportAllowanceBase: number;
  monthlyMealAllowanceBase: number;
  mdaFeesPercentage: number;
};

export type PayrollInput = {
  attend: number;
  sickLeave: number;
  absence: number;
  leavePermitted: number;
  afkCount: number;
  afkHours: number;
  afkAutoEnabled: boolean;
  salaryPerHour: number;
  workHours: number;
  compensationHours: number;
  rstHours: number;
  positionalPayoutAmount: number;
  transportAllowanceOverride: number | null;
  mealAllowanceOverride: number | null;
  performanceBonusPercentage: number;
  bonus: number;
  bonusNotes: string;
  loanInstallment: number;
  mdaFeesOverride: number | null;
};

export type PayrollComputed = {
  totalPaidHours: number;
  basedPayoutAmount: number;
  transportAllowance: number;
  mealAllowance: number;
  subTotal: number;
  mdaFees: number;
  totalToBePaid: number;
};

export type EmployeeSnapshot = Pick<Employee, "eic" | "name" | "position" | "bankName" | "bankAccountNumber">;

export type PayrollRecord = PayrollInput & PayrollComputed & {
  id: string;
  employeeId: string;
  employeeSnapshot: EmployeeSnapshot;
  paymentRuleSnapshot: PaymentRule;
  period: string;
  updatedAt: string;
};

export type AppState = {
  employees: Employee[];
  settings: GlobalSettings;
  paymentRules: PaymentRule[];
  payrolls: PayrollRecord[];
  lastExportedAt: Record<string, string>;
};

export const DEFAULT_SETTINGS: GlobalSettings = {
  standardMonthlyHours: 200,
  monthlyTransportAllowanceBase: 400000,
  monthlyMealAllowanceBase: 500000,
  mdaFeesPercentage: 5,
};

export function createDefaultPaymentRule(settings: GlobalSettings = DEFAULT_SETTINGS): PaymentRule {
  return {
    id: "default",
    name: "Default Rules",
    description: "Aturan pembayaran awal. Nama dan seluruh nilai dapat diubah.",
    standardMonthlyHours: settings.standardMonthlyHours,
    monthlyTransportAllowanceBase: settings.monthlyTransportAllowanceBase,
    monthlyMealAllowanceBase: settings.monthlyMealAllowanceBase,
    mdaFeesPercentage: settings.mdaFeesPercentage,
    defaultWorkHours: 0,
    defaultCompensationHours: 0,
    defaultRstHours: 0,
  };
}

export const EMPTY_PAYROLL_INPUT: PayrollInput = {
  attend: 0,
  sickLeave: 0,
  absence: 0,
  leavePermitted: 0,
  afkCount: 0,
  afkHours: 0,
  afkAutoEnabled: false,
  salaryPerHour: 0,
  workHours: 0,
  compensationHours: 0,
  rstHours: 0,
  positionalPayoutAmount: 0,
  transportAllowanceOverride: null,
  mealAllowanceOverride: null,
  performanceBonusPercentage: 0,
  bonus: 0,
  bonusNotes: "",
  loanInstallment: 0,
  mdaFeesOverride: null,
};
