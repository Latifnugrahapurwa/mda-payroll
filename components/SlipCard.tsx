import type { PayrollRecord } from "@/lib/types";
import { formatMoney, formatNumber, formatPeriod } from "@/lib/payroll";

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-4 border-b border-slate-100 py-[11px] ${strong ? "font-extrabold text-slate-950" : "text-slate-700"}`}>
      <span className="min-w-0 text-[15px] leading-snug">{label}</span>
      <span className="shrink-0 text-right text-[15px] leading-snug tabular-nums">{value}</span>
    </div>
  );
}

function SlipSectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 border-b-2 border-slate-300 pb-2.5 text-[15px] font-black uppercase tracking-[.12em] text-slate-950">{children}</h3>;
}

export function SlipCard({ record, className = "" }: { record: PayrollRecord; className?: string }) {
  const employee = record.employeeSnapshot;

  return (
    <article className={`slip-card relative mx-auto flex min-h-[1040px] w-full max-w-[760px] flex-col bg-white px-8 py-10 text-slate-950 sm:px-11 sm:py-12 ${className}`}>
      <div className="absolute left-0 top-0 h-2.5 w-full bg-gradient-to-r from-red-600 via-orange-400 to-yellow-400" />

      <header className="flex items-start justify-between gap-5 border-b-[3px] border-slate-950 pb-7 pt-2">
        <div className="min-w-0">
          <p className="text-[26px] font-black uppercase leading-[1.08] tracking-tight">Melanesia Digital</p>
          <p className="text-[26px] font-black uppercase leading-[1.08] tracking-tight">Advertisement</p>
          <p className="mt-3 text-[13px] font-bold uppercase tracking-[.25em] text-slate-500">Salary Slip</p>
        </div>
        <div className="max-w-[190px] shrink-0 rounded-xl bg-slate-950 px-4 py-3.5 text-right text-white">
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-slate-300">Periode</p>
          <p className="mt-1.5 text-[16px] font-extrabold leading-snug">{formatPeriod(record.period)}</p>
        </div>
      </header>

      <section className="mt-7">
        <h3 className="mb-4 text-[15px] font-black uppercase tracking-[.14em]">Employee Details</h3>
        <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-x-5 gap-y-2.5 text-[16px]">
          <span className="text-slate-500">EIC</span><b className="break-words">{employee.eic || "-"}</b>
          <span className="text-slate-500">Name</span><b className="break-words">{employee.name}</b>
          <span className="text-slate-500">Position</span><b className="break-words">{employee.position}</b>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-2 gap-7">
        <section className="min-w-0">
          <SlipSectionTitle>Attendance Data</SlipSectionTitle>
          <Line label="Attend (Days)" value={formatNumber(record.attend)} />
          <Line label="Sick Leave" value={formatNumber(record.sickLeave)} />
          <Line label="Absence" value={formatNumber(record.absence)} />
          <Line label="Leave Permitted" value={formatNumber(record.leavePermitted)} />
          <Line label="AFK Count" value={formatNumber(record.afkCount)} />
          <Line label="AFK Hours" value={formatNumber(record.afkHours)} />
        </section>
        <section className="min-w-0">
          <SlipSectionTitle>Payment Rules</SlipSectionTitle>
          <Line label="Salary / Hour" value={`Rp ${formatMoney(record.salaryPerHour)}`} />
          <Line label="Work Hours" value={formatNumber(record.workHours)} />
          <Line label="Compensation Hours" value={formatNumber(record.compensationHours)} />
          <Line label="RST Hours" value={formatNumber(record.rstHours)} />
          <div className="mt-3 rounded-xl bg-slate-100 px-4 py-3.5">
            <div className="flex items-center justify-between gap-3 text-[15px] font-black"><span>Total Paid Hours</span><span className="tabular-nums">{formatNumber(record.totalPaidHours)}</span></div>
          </div>
        </section>
      </div>

      <section className="mt-8">
        <SlipSectionTitle>Income Details</SlipSectionTitle>
        <Line label="Based Payout Amount" value={`Rp ${formatMoney(record.basedPayoutAmount)}`} />
        <Line label="Positional Payout Amount" value={`Rp ${formatMoney(record.positionalPayoutAmount)}`} />
        <Line label="Transport Allowance" value={`Rp ${formatMoney(record.transportAllowance)}`} />
        <Line label="Meal Allowance" value={`Rp ${formatMoney(record.mealAllowance)}`} />
        <Line label="Bonus" value={`Rp ${formatMoney(record.bonus)}`} />
        <div className="mt-3 rounded-xl bg-emerald-50 px-4">
          <Line label="Sub Total" value={`Rp ${formatMoney(record.subTotal)}`} strong />
        </div>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-7">
        <div className="min-w-0">
          <SlipSectionTitle>Deduction Details</SlipSectionTitle>
          <Line label="Loan Installment" value={`Rp ${formatMoney(record.loanInstallment)}`} />
          <Line label="MDA Fees" value={`Rp ${formatMoney(record.mdaFees)}`} />
        </div>
        <div className="min-w-0">
          <SlipSectionTitle>Bonus Notes</SlipSectionTitle>
          <div className="min-h-[108px] rounded-xl bg-slate-50 p-4 text-[15px]">
            <p className="font-bold">Performance: {formatNumber(record.performanceBonusPercentage)}%</p>
            <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed text-slate-600">{record.bonusNotes || "-"}</p>
          </div>
        </div>
      </section>

      <footer className="mt-auto pt-9">
        <div className="rounded-2xl bg-slate-950 px-7 py-7 text-white">
          <p className="text-[13px] font-bold uppercase tracking-[.2em] text-slate-300">Total To Be Paid</p>
          <p className="mt-3 break-words text-[34px] font-black leading-tight tracking-tight tabular-nums">Rp {formatMoney(record.totalToBePaid)}</p>
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-white/15 pt-4 text-[11px] font-semibold uppercase tracking-[.13em] text-slate-300">
            <span>Melanesia Digital Advertisement</span><span>MDA Payroll</span>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] text-slate-400">Dokumen elektronik · Nomor rekening tidak ditampilkan pada slip gaji</p>
      </footer>
    </article>
  );
}
