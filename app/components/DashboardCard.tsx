"use client";

type DashboardCardProps = {
  balance: number;
  totalIncome: number;
  totalExpense: number;
};

export default function DashboardCard({
  balance,
  totalIncome,
  totalExpense,
}: DashboardCardProps) {
  return (
    <div className="px-4 pt-4 sm:p-0">
      <div className="bg-zinc-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Chai Rai Wa
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1">
              บันทึกรายรับ-รายจ่ายง่ายๆ (จ่ายไรวะ)
            </p>
          </div>
        </div>

        {/* สรุปยอดเงิน */}
        <div className="bg-zinc-800/80 backdrop-blur border border-zinc-700/50 p-5 sm:p-6 rounded-2xl">
          <p className="text-xs sm:text-sm font-medium text-zinc-400 mb-1">
            ยอดเงินคงเหลือสุทธิ
          </p>
          <h2
            className={`text-3xl sm:text-5xl font-black ${
              balance < 0 ? "text-red-400" : "text-green-400"
            }`}
          >
            ฿{balance.toLocaleString()}
          </h2>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-zinc-700/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold shrink-0">
                ↓
              </div>
              <div>
                <p className="text-xs text-zinc-400">รายรับทั้งหมด</p>
                <p className="text-base sm:text-lg font-bold text-green-400">
                  +฿{totalIncome.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold shrink-0">
                ↑
              </div>
              <div>
                <p className="text-xs text-zinc-400">รายจ่ายทั้งหมด</p>
                <p className="text-base sm:text-lg font-bold text-red-400">
                  -฿{totalExpense.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}