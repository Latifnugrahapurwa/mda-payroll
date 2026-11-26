import type { Employee, GlobalSettings, PaymentRule, PayrollRecord } from "./types";
import { createDefaultPaymentRule } from "./types";
import { calculatePayroll } from "./payroll";

export type PayrollWorkbookData = {
  period: string;
  exportedAt: string;
  employees: Employee[];
  settings: GlobalSettings;
  paymentRules: PaymentRule[];
  records: PayrollRecord[];
};

export type ImportMode = "merge" | "replace";

type Column = { key: string; header: string; width: number; hidden?: boolean; numFmt?: string };

const CURRENCY_FORMAT = '#,##0.00;[Red]-#,##0.00';
const NUMBER_FORMAT = '#,##0.00;[Red]-#,##0.00';
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function addTableSheet(
  workbook: import("exceljs").Workbook,
  name: string,
  title: string,
  subtitle: string,
  columns: Column[],
  rows: Record<string, unknown>[],
) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 4, topLeftCell: "A5" }] });
  sheet.columns = columns.map(({ key, width, hidden }) => ({ key, width, hidden }));
  sheet.addRow([title]);
  sheet.mergeCells(1, 1, 1, columns.length);
  sheet.addRow([subtitle]);
  sheet.mergeCells(2, 1, 2, columns.length);
  sheet.addRow([]);
  sheet.addRow(columns.map((column) => column.header));

  rows.forEach((row) => sheet.addRow(columns.map((column) => row[column.key] ?? null)));

  const titleCell = sheet.getCell(1, 1);
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111827" } };
  titleCell.font = { name: "Aptos Display", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  sheet.getRow(1).height = 32;

  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  subtitleCell.font = { name: "Aptos", size: 10, color: { argb: "FF475569" }, italic: true };
  subtitleCell.alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(2).height = 25;

  const header = sheet.getRow(4);
  header.height = 36;
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF15A23" } };
    cell.font = { name: "Aptos", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: "FFCBD5E1" } } };
  });

  columns.forEach((column, index) => {
    const excelColumn = sheet.getColumn(index + 1);
    if (column.hidden) excelColumn.hidden = true;
    if (column.numFmt) excelColumn.numFmt = column.numFmt;
    if (column.key.toLowerCase().includes("rekening") || column.key.toLowerCase().includes("chatid") || column.key === "eic") {
      excelColumn.numFmt = "@";
    }
  });

  for (let rowNumber = 5; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    row.height = 23;
    row.eachCell((cell) => {
      cell.font = { name: "Aptos", size: 10, color: { argb: "FF1E293B" } };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } } };
      if (rowNumber % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    });
  }

  if (rows.length) {
    const firstVisibleColumn = Math.max(1, columns.findIndex((column) => !column.hidden) + 1);
    sheet.autoFilter = { from: { row: 4, column: firstVisibleColumn }, to: { row: 4, column: columns.length } };
  }
  sheet.views = [{ state: "frozen", ySplit: 4, topLeftCell: "A5" }];
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return sheet;
}

function employeeColumns(): Column[] {
  return [
    { key: "id", header: "ID Internal", width: 38, hidden: true },
    { key: "eic", header: "EIC", width: 16 },
    { key: "name", header: "Nama Lengkap", width: 28 },
    { key: "position", header: "Jabatan", width: 24 },
    { key: "salaryPerHour", header: "Tarif per Jam (Rp)", width: 19, numFmt: CURRENCY_FORMAT },
    { key: "positionalPayoutDefault", header: "Tunjangan Jabatan Default (Rp)", width: 25, numFmt: CURRENCY_FORMAT },
    { key: "bankName", header: "Bank", width: 12 },
    { key: "bankAccountNumber", header: "Nomor Rekening (Internal)", width: 24 },
    { key: "telegramChatId", header: "Telegram Chat ID", width: 20 },
    { key: "paymentRuleId", header: "Payment Rule ID (Internal)", width: 38, hidden: true },
    { key: "paymentRuleName", header: "Payment Rules", width: 24 },
  ];
}

function payrollColumns(): Column[] {
  return [
    { key: "id", header: "Record ID", width: 36, hidden: true },
    { key: "employeeId", header: "Employee ID Internal", width: 36, hidden: true },
    { key: "period", header: "Periode", width: 14 },
    { key: "eic", header: "EIC", width: 15 },
    { key: "name", header: "Nama Lengkap", width: 25 },
    { key: "position", header: "Jabatan", width: 22 },
    { key: "attend", header: "Attend (Hari)", width: 14, numFmt: NUMBER_FORMAT },
    { key: "sickLeave", header: "Sick Leave", width: 13, numFmt: NUMBER_FORMAT },
    { key: "absence", header: "Absence", width: 13, numFmt: NUMBER_FORMAT },
    { key: "leavePermitted", header: "Leave Permitted", width: 16, numFmt: NUMBER_FORMAT },
    { key: "afkCount", header: "AFK Count", width: 12, numFmt: NUMBER_FORMAT },
    { key: "afkHours", header: "AFK Hours", width: 13, numFmt: NUMBER_FORMAT },
    { key: "afkAutoEnabled", header: "AFK Auto Calculation", width: 20 },
    { key: "paymentRuleSnapshotJson", header: "Payment Rule Snapshot (Internal)", width: 42, hidden: true },
    { key: "salaryPerHour", header: "Salary per Hour (Rp)", width: 19, numFmt: CURRENCY_FORMAT },
    { key: "workHours", header: "Work Hours", width: 13, numFmt: NUMBER_FORMAT },
    { key: "compensationHours", header: "Compensation Hours", width: 19, numFmt: NUMBER_FORMAT },
    { key: "rstHours", header: "RST Hours", width: 13, numFmt: NUMBER_FORMAT },
    { key: "totalPaidHours", header: "Total Paid Hours", width: 16, numFmt: NUMBER_FORMAT },
    { key: "positionalPayoutAmount", header: "Positional Payout (Rp)", width: 21, numFmt: CURRENCY_FORMAT },
    { key: "transportAllowanceOverride", header: "Transport Override (Rp)", width: 22, numFmt: CURRENCY_FORMAT },
    { key: "transportAllowance", header: "Transport Allowance (Rp)", width: 23, numFmt: CURRENCY_FORMAT },
    { key: "mealAllowanceOverride", header: "Meal Override (Rp)", width: 20, numFmt: CURRENCY_FORMAT },
    { key: "mealAllowance", header: "Meal Allowance (Rp)", width: 21, numFmt: CURRENCY_FORMAT },
    { key: "performanceBonusPercentage", header: "Performance Bonus (%)", width: 20, numFmt: "0.00" },
    { key: "bonus", header: "Bonus (Rp)", width: 16, numFmt: CURRENCY_FORMAT },
    { key: "bonusNotes", header: "Bonus Notes", width: 32 },
    { key: "basedPayoutAmount", header: "Based Payout (Rp)", width: 19, numFmt: CURRENCY_FORMAT },
    { key: "subTotal", header: "Sub Total (Rp)", width: 18, numFmt: CURRENCY_FORMAT },
    { key: "loanInstallment", header: "Loan Installment (Rp)", width: 21, numFmt: CURRENCY_FORMAT },
    { key: "mdaFeesOverride", header: "MDA Fees Override (Rp)", width: 22, numFmt: CURRENCY_FORMAT },
    { key: "mdaFees", header: "MDA Fees (Rp)", width: 17, numFmt: CURRENCY_FORMAT },
    { key: "totalToBePaid", header: "Total To Be Paid (Rp)", width: 22, numFmt: CURRENCY_FORMAT },
    { key: "bankName", header: "Bank", width: 12 },
    { key: "bankAccountNumber", header: "Nomor Rekening (Internal)", width: 24 },
    { key: "updatedAt", header: "Updated At", width: 25 },
  ];
}

export async function exportPayrollWorkbook(data: PayrollWorkbookData) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Melanesia Digital Advertisement";
  workbook.subject = `Master karyawan dan rekap payroll ${data.period}`;
  workbook.title = `MDA Payroll ${data.period}`;
  workbook.created = new Date(data.exportedAt);

  addTableSheet(workbook, "Petunjuk", "MELANESIA DIGITAL ADVERTISEMENT", "File ekspor dan pemulihan data MDA Payroll. Jangan ubah nama sheet atau judul kolom jika file akan diimpor kembali.", [
    { key: "key", header: "Key", width: 24, hidden: true },
    { key: "label", header: "Informasi", width: 30 },
    { key: "value", header: "Nilai", width: 42 },
  ], [
    { key: "format", label: "Format File", value: "MDA-PAYROLL-XLSX" },
    { key: "schemaVersion", label: "Schema Version", value: 2 },
    { key: "period", label: "Periode Payroll", value: data.period },
    { key: "exportedAt", label: "Diekspor Pada", value: data.exportedAt },
    { key: "contents", label: "Isi File", value: "Master karyawan, pengaturan global, Payment Rules, ringkasan dan detail payroll periode terpilih." },
    { key: "importRule", label: "Aturan Import", value: "Master dapat digabung atau ditimpa. Payroll untuk periode di file akan diganti; periode lain tetap dipertahankan." },
    { key: "security", label: "Data Sensitif", value: "File ini dapat memuat rekening bank dan Telegram Chat ID. Simpan di lokasi privat." },
  ]);

  const total = (key: keyof PayrollRecord) => data.records.reduce((sum, record) => sum + (typeof record[key] === "number" ? record[key] as number : 0), 0);
  const summarySheet = addTableSheet(workbook, "Ringkasan Bulanan", `RINGKASAN PENGGAJIAN · ${data.period}`, "Ringkasan periode terpilih. Nilai berasal dari slip yang telah disimpan.", [
    { key: "metric", header: "Indikator", width: 34 },
    { key: "value", header: "Nilai", width: 24, numFmt: NUMBER_FORMAT },
    { key: "note", header: "Keterangan", width: 62 },
  ], [
    { metric: "Periode", value: data.period, note: "Periode payroll pada file ini." },
    { metric: "Total Master Karyawan", value: data.employees.length, note: "Jumlah karyawan pada master saat ekspor." },
    { metric: "Jumlah Slip Tersimpan", value: data.records.length, note: "Slip payroll yang tersimpan untuk periode ini." },
    { metric: "Total Attend (Hari)", value: total("attend"), note: "Akumulasi hari hadir dari seluruh slip tersimpan." },
    { metric: "Total Paid Hours", value: total("totalPaidHours"), note: "Akumulasi jam dibayar." },
    { metric: "Total Sub Total (Rp)", value: total("subTotal"), note: "Akumulasi pendapatan sebelum potongan." },
    { metric: "Total Loan Installment (Rp)", value: total("loanInstallment"), note: "Akumulasi cicilan/potongan pinjaman." },
    { metric: "Total MDA Fees (Rp)", value: total("mdaFees"), note: "Akumulasi biaya MDA." },
    { metric: "TOTAL TRANSFER (Rp)", value: total("totalToBePaid"), note: "Total bersih yang perlu dibayarkan kepada karyawan." },
  ]);
  const transferRow = summarySheet.getRow(summarySheet.rowCount);
  transferRow.height = 30;
  transferRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
    cell.font = { name: "Aptos", size: 11, bold: true, color: { argb: "FF14532D" } };
    cell.border = { top: { style: "medium", color: { argb: "FF86EFAC" } } };
  });

  addTableSheet(workbook, "Master Karyawan", "MASTER DATA KARYAWAN", "Seluruh data karyawan. Nomor rekening dan Telegram Chat ID merupakan informasi internal bendahara.", employeeColumns(), data.employees.map((employee) => ({
    ...employee,
    paymentRuleName: data.paymentRules.find((rule) => rule.id === employee.paymentRuleId)?.name ?? "",
  })));

  addTableSheet(workbook, "Payment Rules", "PROFIL PAYMENT RULES", "Daftar profil aturan pembayaran yang dibuat pengguna. ID internal dipakai saat import.", [
    { key: "id", header: "ID Internal", width: 38, hidden: true },
    { key: "name", header: "Nama Payment Rules", width: 28 },
    { key: "description", header: "Deskripsi", width: 38 },
    { key: "standardMonthlyHours", header: "Standard Monthly Hours", width: 22, numFmt: NUMBER_FORMAT },
    { key: "monthlyTransportAllowanceBase", header: "Transport Base (Rp)", width: 21, numFmt: CURRENCY_FORMAT },
    { key: "monthlyMealAllowanceBase", header: "Meal Base (Rp)", width: 19, numFmt: CURRENCY_FORMAT },
    { key: "mdaFeesPercentage", header: "MDA Fees (%)", width: 16, numFmt: "0.00" },
    { key: "defaultWorkHours", header: "Default Work Hours", width: 19, numFmt: NUMBER_FORMAT },
    { key: "defaultCompensationHours", header: "Default Compensation Hours", width: 25, numFmt: NUMBER_FORMAT },
    { key: "defaultRstHours", header: "Default RST Hours", width: 18, numFmt: NUMBER_FORMAT },
  ], data.paymentRules.map((rule) => ({ ...rule })));

  addTableSheet(workbook, "Pengaturan Global", "PENGATURAN GLOBAL", "Parameter tarif yang menjadi dasar kalkulasi payroll.", [
    { key: "key", header: "Key", width: 38, hidden: true },
    { key: "label", header: "Parameter", width: 40 },
    { key: "value", header: "Nilai", width: 22, numFmt: NUMBER_FORMAT },
    { key: "description", header: "Keterangan", width: 60 },
  ], [
    { key: "standardMonthlyHours", label: "Standard Monthly Hours", value: data.settings.standardMonthlyHours, description: "Jumlah jam kerja standar per bulan." },
    { key: "monthlyTransportAllowanceBase", label: "Monthly Transport Allowance Base (Rp)", value: data.settings.monthlyTransportAllowanceBase, description: "Nilai dasar tunjangan transport bulanan." },
    { key: "monthlyMealAllowanceBase", label: "Monthly Meal Allowance Base (Rp)", value: data.settings.monthlyMealAllowanceBase, description: "Nilai dasar tunjangan makan bulanan." },
    { key: "mdaFeesPercentage", label: "MDA Fees Percentage (%)", value: data.settings.mdaFeesPercentage, description: "Persentase biaya MDA dari Sub Total." },
  ]);

  const payrollRows = data.records.map((record) => ({
    ...record,
    afkAutoEnabled: record.afkAutoEnabled ? "Ya" : "Tidak",
    paymentRuleSnapshotJson: JSON.stringify(record.paymentRuleSnapshot),
    eic: record.employeeSnapshot.eic,
    name: record.employeeSnapshot.name,
    position: record.employeeSnapshot.position,
    bankName: record.employeeSnapshot.bankName,
    bankAccountNumber: record.employeeSnapshot.bankAccountNumber,
  }));
  addTableSheet(workbook, "Rekap Penggajian", `REKAP PENGGAJIAN · ${data.period}`, "Data lengkap per slip. Kolom ID internal disembunyikan dan dipakai saat proses import.", payrollColumns(), payrollRows);

  addTableSheet(workbook, "Detail Kehadiran", `DETAIL KEHADIRAN · ${data.period}`, "Rincian hari kehadiran dan jam kerja per karyawan.", [
    { key: "eic", header: "EIC", width: 16 },
    { key: "name", header: "Nama Lengkap", width: 26 },
    { key: "position", header: "Jabatan", width: 22 },
    { key: "attend", header: "Attend (Hari)", width: 15, numFmt: NUMBER_FORMAT },
    { key: "sickLeave", header: "Sick Leave", width: 14, numFmt: NUMBER_FORMAT },
    { key: "absence", header: "Absence", width: 14, numFmt: NUMBER_FORMAT },
    { key: "leavePermitted", header: "Leave Permitted", width: 17, numFmt: NUMBER_FORMAT },
    { key: "afkCount", header: "AFK Count", width: 13, numFmt: NUMBER_FORMAT },
    { key: "afkHours", header: "AFK Hours", width: 13, numFmt: NUMBER_FORMAT },
    { key: "afkAutoLabel", header: "AFK Auto Calculation", width: 20 },
    { key: "workHours", header: "Work Hours", width: 14, numFmt: NUMBER_FORMAT },
    { key: "compensationHours", header: "Compensation Hours", width: 20, numFmt: NUMBER_FORMAT },
    { key: "rstHours", header: "RST Hours", width: 14, numFmt: NUMBER_FORMAT },
    { key: "totalPaidHours", header: "Total Paid Hours", width: 17, numFmt: NUMBER_FORMAT },
  ], data.records.map((record) => ({ ...record, afkAutoLabel: record.afkAutoEnabled ? "Ya" : "Tidak", ...record.employeeSnapshot })));

  addTableSheet(workbook, "Detail Pembayaran", `DETAIL PEMBAYARAN · ${data.period}`, "Rincian pendapatan, tunjangan, bonus, potongan dan nilai transfer. Rekening hanya untuk kebutuhan internal.", [
    { key: "eic", header: "EIC", width: 16 },
    { key: "name", header: "Nama Lengkap", width: 26 },
    { key: "salaryPerHour", header: "Salary per Hour (Rp)", width: 20, numFmt: CURRENCY_FORMAT },
    { key: "basedPayoutAmount", header: "Based Payout (Rp)", width: 20, numFmt: CURRENCY_FORMAT },
    { key: "positionalPayoutAmount", header: "Positional Payout (Rp)", width: 22, numFmt: CURRENCY_FORMAT },
    { key: "transportAllowance", header: "Transport (Rp)", width: 18, numFmt: CURRENCY_FORMAT },
    { key: "mealAllowance", header: "Meal (Rp)", width: 18, numFmt: CURRENCY_FORMAT },
    { key: "performanceBonusPercentage", header: "Performance Bonus (%)", width: 21, numFmt: "0.00" },
    { key: "bonus", header: "Bonus (Rp)", width: 17, numFmt: CURRENCY_FORMAT },
    { key: "bonusNotes", header: "Bonus Notes", width: 32 },
    { key: "subTotal", header: "Sub Total (Rp)", width: 19, numFmt: CURRENCY_FORMAT },
    { key: "loanInstallment", header: "Loan Installment (Rp)", width: 22, numFmt: CURRENCY_FORMAT },
    { key: "mdaFees", header: "MDA Fees (Rp)", width: 18, numFmt: CURRENCY_FORMAT },
    { key: "totalToBePaid", header: "Total To Be Paid (Rp)", width: 23, numFmt: CURRENCY_FORMAT },
    { key: "bankName", header: "Bank", width: 12 },
    { key: "bankAccountNumber", header: "Nomor Rekening (Internal)", width: 24 },
  ], payrollRows);

  const bytes = await workbook.xlsx.writeBuffer();
  const blob = new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `MDA_Payroll_Export_${data.period}_${data.exportedAt.slice(0, 10)}.xlsx`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function cellValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    if ("formula" in item || "sharedFormula" in item) throw new Error("File import tidak boleh berisi formula Excel. Gunakan file ekspor asli MDA Payroll.");
    if ("text" in item) return item.text;
    if ("richText" in item && Array.isArray(item.richText)) return item.richText.map((part) => (part as { text?: string }).text ?? "").join("");
  }
  return value;
}

function textValue(value: unknown): string {
  const plain = cellValue(value);
  return plain === null || plain === undefined ? "" : String(plain).trim();
}

function numberValue(value: unknown, label: string): number {
  const plain = cellValue(value);
  if (plain === null || plain === undefined || plain === "") return 0;
  const number = typeof plain === "number" ? plain : Number(String(plain).replace(/,/g, ""));
  if (!Number.isFinite(number)) throw new Error(`Nilai angka pada kolom ${label} tidak valid.`);
  return number;
}

function nullableNumber(value: unknown, label: string): number | null {
  const plain = cellValue(value);
  return plain === null || plain === undefined || plain === "" ? null : numberValue(plain, label);
}

function readSheetRows(sheet: import("exceljs").Worksheet) {
  const headers = new Map<string, number>();
  sheet.getRow(4).eachCell((cell, columnNumber) => {
    const header = textValue(cell.value);
    if (header) headers.set(header, columnNumber);
  });
  if (!headers.size) throw new Error(`Header sheet "${sheet.name}" tidak ditemukan.`);

  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 4) return;
    const data: Record<string, unknown> = {};
    headers.forEach((columnNumber, header) => { data[header] = cellValue(row.getCell(columnNumber).value); });
    if (Object.values(data).some((value) => value !== null && value !== undefined && value !== "")) rows.push(data);
  });
  return rows;
}

function requireText(row: Record<string, unknown>, key: string, label: string) {
  const value = textValue(row[key]);
  if (!value) throw new Error(`${label} wajib terisi pada file import.`);
  return value;
}

function parsePaymentRules(sheet: import("exceljs").Worksheet): PaymentRule[] {
  const rules = readSheetRows(sheet).map((row, index): PaymentRule => ({
    id: requireText(row, "ID Internal", `ID Payment Rules baris ${index + 5}`),
    name: requireText(row, "Nama Payment Rules", `Nama Payment Rules baris ${index + 5}`),
    description: textValue(row.Deskripsi),
    standardMonthlyHours: numberValue(row["Standard Monthly Hours"], "Standard Monthly Hours"),
    monthlyTransportAllowanceBase: numberValue(row["Transport Base (Rp)"], "Transport Base (Rp)"),
    monthlyMealAllowanceBase: numberValue(row["Meal Base (Rp)"], "Meal Base (Rp)"),
    mdaFeesPercentage: numberValue(row["MDA Fees (%)"], "MDA Fees (%)"),
    defaultWorkHours: numberValue(row["Default Work Hours"], "Default Work Hours"),
    defaultCompensationHours: numberValue(row["Default Compensation Hours"], "Default Compensation Hours"),
    defaultRstHours: numberValue(row["Default RST Hours"], "Default RST Hours"),
  }));
  if (!rules.length) throw new Error("Workbook harus memiliki minimal satu Payment Rules.");
  if (new Set(rules.map((rule) => rule.id)).size !== rules.length) throw new Error("Terdapat ID Payment Rules duplikat.");
  if (new Set(rules.map((rule) => rule.name.trim().toLowerCase())).size !== rules.length) throw new Error("Nama Payment Rules tidak boleh duplikat.");
  if (rules.some((rule) => rule.standardMonthlyHours <= 0 || rule.monthlyTransportAllowanceBase < 0 || rule.monthlyMealAllowanceBase < 0 || rule.mdaFeesPercentage < 0 || rule.defaultWorkHours < 0 || rule.defaultCompensationHours < 0 || rule.defaultRstHours < 0)) {
    throw new Error("Terdapat nilai Payment Rules yang tidak valid atau negatif.");
  }
  return rules;
}

function parseEmployees(sheet: import("exceljs").Worksheet, rules: PaymentRule[]): Employee[] {
  const employees = readSheetRows(sheet).map((row, index) => {
    const employee: Employee = {
      id: requireText(row, "ID Internal", `ID internal karyawan baris ${index + 5}`),
      eic: textValue(row.EIC),
      name: requireText(row, "Nama Lengkap", `Nama karyawan baris ${index + 5}`),
      position: requireText(row, "Jabatan", `Jabatan karyawan baris ${index + 5}`),
      salaryPerHour: numberValue(row["Tarif per Jam (Rp)"], "Tarif per Jam (Rp)"),
      positionalPayoutDefault: numberValue(row["Tunjangan Jabatan Default (Rp)"], "Tunjangan Jabatan Default (Rp)"),
      bankName: textValue(row.Bank) || "BNI",
      bankAccountNumber: textValue(row["Nomor Rekening (Internal)"]),
      telegramChatId: textValue(row["Telegram Chat ID"]),
      paymentRuleId: rules.find((rule) => rule.name.trim().toLowerCase() === textValue(row["Payment Rules"]).toLowerCase())?.id || textValue(row["Payment Rule ID (Internal)"]) || rules[0]?.id || "default",
    };
    if (employee.salaryPerHour < 0 || employee.positionalPayoutDefault < 0) throw new Error(`Tarif atau tunjangan karyawan ${employee.name} tidak boleh negatif.`);
    return employee;
  });
  if (new Set(employees.map((employee) => employee.id)).size !== employees.length) throw new Error("Terdapat ID internal karyawan duplikat pada file.");
  return employees;
}

function parseSettings(sheet: import("exceljs").Worksheet): GlobalSettings {
  const values = new Map<string, number>();
  for (const row of readSheetRows(sheet)) values.set(textValue(row.Key), numberValue(row.Nilai, textValue(row.Parameter)));
  const settings: GlobalSettings = {
    standardMonthlyHours: values.get("standardMonthlyHours") ?? 0,
    monthlyTransportAllowanceBase: values.get("monthlyTransportAllowanceBase") ?? 0,
    monthlyMealAllowanceBase: values.get("monthlyMealAllowanceBase") ?? 0,
    mdaFeesPercentage: values.get("mdaFeesPercentage") ?? 0,
  };
  if (settings.standardMonthlyHours <= 0 || settings.monthlyTransportAllowanceBase < 0 || settings.monthlyMealAllowanceBase < 0 || settings.mdaFeesPercentage < 0) {
    throw new Error("Pengaturan global pada file tidak lengkap atau tidak valid.");
  }
  return settings;
}

function parsePayroll(sheet: import("exceljs").Worksheet, period: string, settings: GlobalSettings, rules: PaymentRule[], employees: Employee[]): PayrollRecord[] {
  const records = readSheetRows(sheet).map((row, index) => {
    const rowPeriod = requireText(row, "Periode", `Periode payroll baris ${index + 5}`);
    if (rowPeriod !== period) throw new Error(`Periode pada baris payroll ${index + 5} tidak sama dengan periode file (${period}).`);
    const snapshot = {
      eic: textValue(row.EIC),
      name: requireText(row, "Nama Lengkap", `Nama payroll baris ${index + 5}`),
      position: requireText(row, "Jabatan", `Jabatan payroll baris ${index + 5}`),
      bankName: textValue(row.Bank) || "BNI",
      bankAccountNumber: textValue(row["Nomor Rekening (Internal)"]),
    };
    const input = {
      attend: numberValue(row["Attend (Hari)"], "Attend (Hari)"),
      sickLeave: numberValue(row["Sick Leave"], "Sick Leave"),
      absence: numberValue(row.Absence, "Absence"),
      leavePermitted: numberValue(row["Leave Permitted"], "Leave Permitted"),
      afkCount: numberValue(row["AFK Count"], "AFK Count"),
      afkHours: numberValue(row["AFK Hours"], "AFK Hours"),
      afkAutoEnabled: textValue(row["AFK Auto Calculation"]).toLowerCase() === "ya" || textValue(row["AFK Auto Calculation"]).toLowerCase() === "true",
      salaryPerHour: numberValue(row["Salary per Hour (Rp)"], "Salary per Hour (Rp)"),
      workHours: numberValue(row["Work Hours"], "Work Hours"),
      compensationHours: numberValue(row["Compensation Hours"], "Compensation Hours"),
      rstHours: numberValue(row["RST Hours"], "RST Hours"),
      positionalPayoutAmount: numberValue(row["Positional Payout (Rp)"], "Positional Payout (Rp)"),
      transportAllowanceOverride: nullableNumber(row["Transport Override (Rp)"], "Transport Override (Rp)"),
      mealAllowanceOverride: nullableNumber(row["Meal Override (Rp)"], "Meal Override (Rp)"),
      performanceBonusPercentage: numberValue(row["Performance Bonus (%)"], "Performance Bonus (%)"),
      bonus: numberValue(row["Bonus (Rp)"], "Bonus (Rp)"),
      bonusNotes: textValue(row["Bonus Notes"]),
      loanInstallment: numberValue(row["Loan Installment (Rp)"], "Loan Installment (Rp)"),
      mdaFeesOverride: nullableNumber(row["MDA Fees Override (Rp)"], "MDA Fees Override (Rp)"),
    };
    const employeeId = requireText(row, "Employee ID Internal", `Employee ID baris ${index + 5}`);
    const linkedEmployee = employees.find((employee) => employee.id === employeeId);
    const fallbackRule = rules.find((rule) => rule.id === linkedEmployee?.paymentRuleId) ?? rules[0] ?? createDefaultPaymentRule(settings);
    let paymentRuleSnapshot = fallbackRule;
    const snapshotJson = textValue(row["Payment Rule Snapshot (Internal)"]);
    if (snapshotJson) {
      try {
        const parsed = JSON.parse(snapshotJson) as PaymentRule;
        const numericValues = [
          parsed?.standardMonthlyHours,
          parsed?.monthlyTransportAllowanceBase,
          parsed?.monthlyMealAllowanceBase,
          parsed?.mdaFeesPercentage,
          parsed?.defaultWorkHours,
          parsed?.defaultCompensationHours,
          parsed?.defaultRstHours,
        ];
        if (!parsed || typeof parsed.id !== "string" || typeof parsed.name !== "string" || numericValues.some((value) => !Number.isFinite(value)) || parsed.standardMonthlyHours <= 0 || numericValues.slice(1).some((value) => Number(value) < 0)) throw new Error();
        paymentRuleSnapshot = parsed;
      } catch {
        throw new Error(`Payment Rule Snapshot pada payroll baris ${index + 5} tidak valid.`);
      }
    }
    const calculationSettings: GlobalSettings = {
      standardMonthlyHours: paymentRuleSnapshot.standardMonthlyHours,
      monthlyTransportAllowanceBase: paymentRuleSnapshot.monthlyTransportAllowanceBase,
      monthlyMealAllowanceBase: paymentRuleSnapshot.monthlyMealAllowanceBase,
      mdaFeesPercentage: paymentRuleSnapshot.mdaFeesPercentage,
    };
    return {
      ...input,
      ...calculatePayroll(input, calculationSettings),
      id: requireText(row, "Record ID", `Record ID baris ${index + 5}`),
      employeeId,
      employeeSnapshot: snapshot,
      paymentRuleSnapshot,
      period,
      updatedAt: textValue(row["Updated At"]) || new Date().toISOString(),
    };
  });
  if (new Set(records.map((record) => record.employeeId)).size !== records.length) throw new Error("Terdapat lebih dari satu slip untuk karyawan yang sama pada periode ini.");
  return records;
}

export async function importPayrollWorkbook(file: File): Promise<PayrollWorkbookData> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Pilih file Excel .xlsx hasil ekspor MDA Payroll.");
  if (file.size > 15 * 1024 * 1024) throw new Error("Ukuran file melebihi batas 15 MB.");
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  if (workbook.worksheets.length > 10 || workbook.worksheets.some((sheet) => sheet.rowCount > 10005 || sheet.columnCount > 50)) {
    throw new Error("Workbook melewati batas jumlah sheet, baris, atau kolom yang diizinkan.");
  }
  const guide = workbook.getWorksheet("Petunjuk");
  const summarySheet = workbook.getWorksheet("Ringkasan Bulanan");
  const employeeSheet = workbook.getWorksheet("Master Karyawan");
  const settingsSheet = workbook.getWorksheet("Pengaturan Global");
  const payrollSheet = workbook.getWorksheet("Rekap Penggajian");
  const attendanceSheet = workbook.getWorksheet("Detail Kehadiran");
  const paymentSheet = workbook.getWorksheet("Detail Pembayaran");
  if (!guide || !summarySheet || !employeeSheet || !settingsSheet || !payrollSheet || !attendanceSheet || !paymentSheet) {
    throw new Error("Workbook tidak lengkap. Gunakan file ekspor MDA Payroll yang berisi sheet standar.");
  }

  const guideRows = readSheetRows(guide);
  const metadata = new Map(guideRows.map((row) => [textValue(row.Informasi), textValue(row.Nilai)]));
  const schemaVersion = metadata.get("Schema Version");
  if (metadata.get("Format File") !== "MDA-PAYROLL-XLSX" || !["1", "2"].includes(schemaVersion ?? "")) {
    throw new Error("Versi atau format workbook tidak dikenali.");
  }
  const period = metadata.get("Periode Payroll") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error("Periode pada workbook tidak valid.");

  const settings = parseSettings(settingsSheet);
  const rulesSheet = workbook.getWorksheet("Payment Rules");
  if (schemaVersion === "2" && !rulesSheet) throw new Error("Sheet Payment Rules tidak ditemukan pada workbook versi 2.");
  const paymentRules = schemaVersion === "2" && rulesSheet
    ? parsePaymentRules(rulesSheet)
    : [createDefaultPaymentRule(settings)];
  const employees = parseEmployees(employeeSheet, paymentRules);
  const records = parsePayroll(payrollSheet, period, settings, paymentRules, employees);
  return {
    period,
    exportedAt: metadata.get("Diekspor Pada") || new Date().toISOString(),
    employees,
    settings,
    paymentRules,
    records,
  };
}

export function remapImportedPayrollRecords(
  records: PayrollRecord[],
  incomingEmployees: Employee[],
  existingEmployees: Employee[],
  mode: ImportMode,
): PayrollRecord[] {
  if (mode === "replace") return records;
  const ids = new Map<string, string>();
  for (const incoming of incomingEmployees) {
    const eic = incoming.eic.trim().toLowerCase();
    const match = existingEmployees.find((employee) =>
      (eic && employee.eic.trim().toLowerCase() === eic) || employee.name.trim().toLowerCase() === incoming.name.trim().toLowerCase(),
    );
    if (match) ids.set(incoming.id, match.id);
  }
  return records.map((record) => {
    const employeeId = ids.get(record.employeeId) ?? record.employeeId;
    return employeeId === record.employeeId ? record : { ...record, employeeId, id: `${record.period}_${employeeId}` };
  });
}
