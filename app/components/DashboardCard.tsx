type DashboardCardProps = {
  balance?: number;
  totalIncome?: number;
  totalExpense?: number;
};

export default function DashboardCard({
  balance = 0,
  totalIncome = 0,
  totalExpense = 0,
}: DashboardCardProps) {
  return (
    <div className="w-full bg-[#18181b] rounded-none p-4 sm:p-8 shadow-lg mb-0">
      {/* โลโก้ และ Title */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          Chai Rai Wa
        </h1>
        <p className="text-xs sm:text-base text-gray-400 font-medium">
          บันทึกรายรับ-รายจ่ายง่ายๆ (จ่ายไรวะ)
        </p>
      </div>

      {/* 👛 กระเป๋าสตางค์สีน้ำตาลเข้ม */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4A2E1F] via-[#362115] to-[#24140C] border border-[#5C3D2E]/40 p-5 sm:p-8 shadow-2xl">
        {/* แสงสะท้อนและ Texture หนัง */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-[#8C5A3C]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#8C5A3C_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

        {/* ตะเข็บเย็บกระเป๋า */}
        <div className="absolute inset-2 border border-dashed border-[#8C5A3C]/30 rounded-xl pointer-events-none" />

        {/* กระดุมล็อกกระเป๋าด้านขวา */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center w-8 h-14 bg-[#2B180F] border border-[#5C3D2E] rounded-l-xl shadow-md">
          <div className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] border border-amber-600" />
        </div>

        <div className="relative z-10">
          {/* ยอดเงินคงเหลือสุทธิ */}
          <div className="mb-5 sm:mb-6">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#D4B595]/80">
              ยอดเงินคงเหลือสุทธิ
            </span>
            <div className="text-3xl sm:text-6xl font-extrabold text-emerald-400 mt-1 tracking-tight drop-shadow-md">
              ฿{balance.toLocaleString()}
            </div>
          </div>

          {/* เส้นแบ่ง */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#8C5A3C]/30 to-transparent my-3 sm:my-5" />

          {/* รายรับ / รายจ่าย */}
          <div className="grid grid-cols-2 gap-4 sm:gap-8 pt-1">
            {/* รายรับ */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shrink-0">
                <span className="text-base sm:text-lg font-bold">↓</span>
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] sm:text-sm font-medium text-[#D4B595]/70 truncate">
                  รายรับทั้งหมด
                </span>
                <span className="text-xs sm:text-xl font-bold text-emerald-400 truncate block">
                  +฿{totalIncome.toLocaleString()}
                </span>
              </div>
            </div>

            {/* รายจ่าย */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-950/80 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-sm shrink-0">
                <span className="text-base sm:text-lg font-bold">↑</span>
              </div>
              <div className="min-w-0">
                <span className="block text-[11px] sm:text-sm font-medium text-[#D4B595]/70 truncate">
                  รายจ่ายทั้งหมด
                </span>
                <span className="text-xs sm:text-xl font-bold text-rose-400 truncate block">
                  -฿{totalExpense.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}