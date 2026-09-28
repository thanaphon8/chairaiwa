"use client";

import { useMemo } from "react";
import { Transaction } from "./TransactionHistory";

type DaysRemainingCardProps = {
  balance: number;
  transactions: Transaction[];
};

export default function DaysRemainingCard({
  balance,
  transactions,
}: DaysRemainingCardProps) {
  // คำนวณการคาดการณ์จำนวนวัน
  const projection = useMemo(() => {
    // กรองเอาเฉพาะรายการที่เป็น "รายจ่าย" (expense)
    const expenses = transactions.filter((tx) => tx.type === "expense");

    if (expenses.length === 0 || balance <= 0) {
      return {
        avgDailyExpense: 0,
        daysRemaining: balance <= 0 ? 0 : Infinity,
        daysAnalyzed: 0,
      };
    }

    // หาวันที่ของรายการใช้จ่ายเพื่อคำนวณช่วงเวลา
    const dates = expenses
      .map((tx) => {
        const datePart = tx.date.split(/[T\s]+/)[0];
        if (datePart.includes("/")) {
          const [d, m, y] = datePart.split("/");
          const year = Number(y) > 2500 ? Number(y) - 543 : Number(y);
          return new Date(year, Number(m) - 1, Number(d)).getTime();
        }
        return new Date(datePart).getTime();
      })
      .filter((time) => !isNaN(time));

    if (dates.length === 0) {
      return { avgDailyExpense: 0, daysRemaining: 0, daysAnalyzed: 0 };
    }

    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);

    // จำนวนวันรวมที่บันทึกข้อมูล (อย่างน้อย 1 วัน)
    const diffTime = Math.abs(maxDate - minDate);
    const daysAnalyzed = Math.max(
      1,
      Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    );

    // รวมรายจ่ายทั้งหมด
    const totalExpenseAmount = expenses.reduce((sum, tx) => sum + tx.amount, 0);

    // ค่าใช้จ่ายเฉลี่ยต่อวัน
    const avgDailyExpense = totalExpenseAmount / daysAnalyzed;

    // คำนวณจำนวนวันที่คาดว่าจะใช้ได้
    const daysRemaining =
      avgDailyExpense > 0 ? Math.floor(balance / avgDailyExpense) : 0;

    return {
      avgDailyExpense,
      daysRemaining,
      daysAnalyzed,
    };
  }, [balance, transactions]);

  if (balance <= 0) return null;

  return (
    /* บนมือถือใช้ rounded-none เพื่อให้เป็นมุมเหลี่ยมชิดขอบจอพอดี ส่วน sm: ขึ้นไปใช้ rounded-3xl */
    <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white rounded-none sm:rounded-3xl p-5 sm:p-6 shadow-lg border-y sm:border border-zinc-700/50">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            คาดการณ์เงินคงเหลือใช้ได้อีกประมาณ
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-amber-400">
              {projection.daysRemaining === Infinity
                ? "∞"
                : projection.daysRemaining.toLocaleString()}
            </span>
            <span className="text-lg font-bold text-zinc-300">วัน</span>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-zinc-400">ใช้จ่ายเฉลี่ย</p>
          <p className="text-sm sm:text-base font-bold text-red-400">
            ~฿{Math.round(projection.avgDailyExpense).toLocaleString()} / วัน
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            (คำนวณจาก {projection.daysAnalyzed} วันที่มีบันทึก)
          </p>
        </div>
      </div>
    </div>
  );
}