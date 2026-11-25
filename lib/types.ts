export type Employee = {
  id: string;
  eic: string;
  name: string;
  position: string;
  salaryPerHour: number;
  positionalPayoutDefault: number;
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
  period: string;
  updatedAt: string;
};

export type AppState = {
  employees: Employee[];
  settings: GlobalSettings;
  payrolls: PayrollRecord[];
  lastExportedAt: Record<string, string>;
};

export const DEFAULT_SETTINGS: GlobalSettings = {
  standardMonthlyHours: 200,
  monthlyTransportAllowanceBase: 400000,
  monthlyMealAllowanceBase: 500000,
  mdaFeesPercentage: 5,
};

export const EMPTY_PAYROLL_INPUT: PayrollInput = {
  attend: 0,
  sickLeave: 0,
  absence: 0,
  leavePermitted: 0,
  afkCount: 0,
  afkHours: 0,
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
