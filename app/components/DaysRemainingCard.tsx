type DaysRemainingCardProps = {
  balance: number;
  transactions: any[];
};

export default function DaysRemainingCard({
  balance = 0,
  transactions = [],
}: DaysRemainingCardProps) {
  // ตัวอย่างคำนวณวันเฉลี่ยการใช้จ่าย
  const expenseTxs = transactions.filter((t) => t.type === "expense");
  const uniqueDates = new Set(
    expenseTxs.map((t) => t.date?.split(" ")[0] || t.date)
  ).size;

  const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
  const avgExpensePerDay =
    uniqueDates > 0 ? Math.round(totalExpense / uniqueDates) : 0;
  const daysRemaining =
    avgExpensePerDay > 0 ? Math.floor(balance / avgExpensePerDay) : 0;

  return (
    <div className="w-full bg-[#18181b] rounded-none border-t border-zinc-800/80 p-4 sm:p-8 shadow-lg">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs sm:text-base font-medium text-gray-300">
            คาดการณ์เงินคงเหลือใช้ได้อีกประมาณ
          </p>
          <p className="text-3xl sm:text-5xl font-black text-amber-400 mt-2">
            {daysRemaining > 0 ? daysRemaining : 0}{" "}
            <span className="text-base sm:text-2xl font-bold text-white">วัน</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs sm:text-base font-medium text-gray-300">ใช้จ่ายเฉลี่ย</p>
          <p className="text-sm sm:text-2xl font-bold text-rose-400 mt-1">
            ~฿{avgExpensePerDay.toLocaleString()} / วัน
          </p>
          <p className="text-[10px] sm:text-sm text-gray-500 mt-0.5">
            (คำนวณจาก {uniqueDates} วันที่มีบันทึก)
          </p>
        </div>
      </div>
    </div>
  );
}