type TransactionLike = {
  type: string;
  amount: number;
  date?: string;
};

type DashboardCardProps = {
  balance?: number;
  totalIncome?: number;
  totalExpense?: number;
  transactions?: TransactionLike[];
};

const fmt = (n: number) =>
  Math.abs(n).toLocaleString("th-TH", { maximumFractionDigits: 2 });

export default function DashboardCard({
  balance = 0,
  totalIncome = 0,
  totalExpense = 0,
  transactions = [],
}: DashboardCardProps) {
  const isNegative = balance < 0;

  // สัดส่วนรายจ่ายเทียบกับรายรับ (0-100)
  const spentPercent =
    totalIncome > 0
      ? Math.min(100, Math.round((totalExpense / totalIncome) * 100))
      : 0;

  // ---- คาดการณ์จำนวนวันที่เงินเหลือพอใช้ ----
  const expenseTxs = transactions.filter((t) => t.type === "expense");

  // นับจำนวนวันที่มีการใช้จ่าย (ตัดเวลาออก รองรับทั้ง "dd/mm/yyyy hh:mm" และ ISO)
  const uniqueDates = new Set(
    expenseTxs.map((t) => (t.date ? t.date.split(/[T\s]+/)[0] : ""))
  ).size;

  const expenseSum = expenseTxs.reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0
  );

  const avgExpensePerDay =
    uniqueDates > 0 ? Math.round(expenseSum / uniqueDates) : 0;

  const hasData = avgExpensePerDay > 0;
  const daysRemaining = hasData
    ? Math.max(0, Math.floor(balance / avgExpensePerDay))
    : 0;

  return (
    <section className="w-full bg-[#5C38C9] px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-6 sm:px-10 sm:pt-12 sm:pb-12 lg:bg-transparent lg:px-10 lg:pb-0 lg:pt-8">
      {/* จอคอม (lg): จำกัดความกว้างให้ตรงกับเนื้อหาด้านล่าง */}
      <div className="mx-auto w-full lg:max-w-[67rem] lg:rounded-3xl lg:bg-[#5C38C9] lg:p-10 lg:shadow-lg lg:shadow-[#5C38C9]/25">
        {/* Brand */}
        <header className="flex items-baseline justify-between gap-3">
          <h1 className="text-base sm:text-xl lg:text-2xl font-semibold text-white tracking-tight">
            Chai Rai Wa
          </h1>
          <p className="truncate text-xs sm:text-sm text-white/75">จ่ายไรวะ</p>
        </header>

        {/* มือถือ: เรียงลงมา / จอคอม: 3 คอลัมน์ในแถวเดียว */}
        <div className="lg:mt-12 lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-x-10">
          {/* คอลัมน์ 1: ยอดคงเหลือ + สัดส่วนการใช้จ่าย */}
          <div className="min-w-0 lg:col-span-5 lg:flex lg:flex-col lg:justify-center">
            <div className="mt-6 sm:mt-12 lg:mt-0">
              <p className="text-sm text-white/80 lg:text-base">ยอดเงินคงเหลือ</p>
              <p
                className={`mt-1 flex items-baseline gap-1.5 whitespace-nowrap font-light tabular-nums tracking-tight ${
                  isNegative ? "text-rose-200" : "text-white"
                }`}
              >
                <span className="text-2xl sm:text-4xl text-[#F3E2C3]">
                  {isNegative ? "-฿" : "฿"}
                </span>
                {/* ขนาดปรับตามความกว้างจอ กันตัวเลขยาวล้นบนมือถือ */}
                <span className="text-[clamp(2.25rem,12.5vw,4.5rem)] leading-none lg:text-[3.25rem] xl:text-[3.5rem]">
                  {fmt(balance)}
                </span>
              </p>
            </div>

            <div className="mt-6 sm:mt-10 lg:mt-8">
              <div
                role="img"
                aria-label={`ใช้จ่ายไปแล้ว ${spentPercent}% ของรายรับ`}
                className="relative h-px w-full bg-white/25"
              >
                <div
                  className={`absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full transition-all duration-500 ${
                    spentPercent >= 100 ? "bg-rose-300" : "bg-[#F3E2C3]"
                  }`}
                  style={{ width: `${spentPercent}%` }}
                />
              </div>
              <p className="mt-2.5 text-xs text-white/75 lg:text-sm">
                {totalIncome > 0
                  ? `ใช้ไปแล้ว ${spentPercent}% ของรายรับ`
                  : "ยังไม่มีรายรับในบันทึก"}
              </p>
            </div>
          </div>

          {/* คอลัมน์ 2: รายรับ / รายจ่าย (จอคอมเรียงแนวตั้ง มีเส้นคั่นซ้าย) */}
          <dl className="mt-5 grid grid-cols-2 gap-4 sm:mt-8 sm:gap-10 lg:col-span-3 lg:mt-0 lg:grid-cols-1 lg:content-center lg:gap-8 lg:border-l lg:border-white/20 lg:pl-10">
            <div className="min-w-0">
              <dt className="flex items-center gap-2 text-xs sm:text-sm text-white/80 lg:text-base">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                รายรับ
              </dt>
              <dd className="mt-1 truncate text-lg sm:text-2xl font-medium text-white tabular-nums lg:mt-2 lg:text-3xl">
                ฿{fmt(totalIncome)}
              </dd>
            </div>

            <div className="min-w-0">
              <dt className="flex items-center gap-2 text-xs sm:text-sm text-white/80 lg:text-base">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-300" />
                รายจ่าย
              </dt>
              <dd className="mt-1 truncate text-lg sm:text-2xl font-medium text-white tabular-nums lg:mt-2 lg:text-3xl">
                ฿{fmt(totalExpense)}
              </dd>
            </div>
          </dl>

          {/* คอลัมน์ 3: คาดการณ์จำนวนวันที่เงินเหลือพอใช้ */}
          <div className="mt-6 flex items-end justify-between gap-4 border-t border-white/20 pt-5 sm:mt-10 sm:pt-8 lg:col-span-4 lg:mt-0 lg:flex-col lg:items-start lg:justify-center lg:gap-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div className="min-w-0">
              <p className="text-sm text-white/80 lg:text-base">ใช้ได้อีกประมาณ</p>
              <p className="mt-1 flex items-baseline gap-1.5 tabular-nums">
                <span className="text-5xl sm:text-7xl font-light leading-none text-white lg:text-6xl">
                  {hasData ? daysRemaining.toLocaleString("th-TH") : "–"}
                </span>
                <span className="text-base sm:text-xl text-[#F3E2C3]">วัน</span>
              </p>
            </div>

            <div className="shrink-0 text-right lg:text-left">
              <p className="text-xs sm:text-sm text-white/80">เฉลี่ยต่อวัน</p>
              <p className="mt-1 text-lg sm:text-2xl font-medium text-white tabular-nums">
                ฿{avgExpensePerDay.toLocaleString("th-TH")}
              </p>
              <p className="mt-0.5 text-xs text-white/75">
                จาก <span className="text-white tabular-nums">{uniqueDates}</span>{" "}
                วัน
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}