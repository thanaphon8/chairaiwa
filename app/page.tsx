"use client";

import { useState, useEffect } from "react";
import DashboardCard from "./components/DashboardCard";
import DaysRemainingCard from "./components/DaysRemainingCard";
import AddTransactionForm from "./components/AddTransactionForm";
import TransactionHistory, { Transaction } from "./components/TransactionHistory";

const CATEGORIES = [
  { id: "อาหาร", label: "อาหาร/เครื่องดื่ม", image: "/img/food.png" },
  { id: "เดินทาง", label: "เดินทาง", image: "/img/taxi.png" },
  { id: "ช้อปปิ้ง", label: "ช้อปปิ้ง", image: "/img/shopping.png" },
  { id: "ที่พัก", label: "ค่าที่พัก/น้ำไฟ", image: "/img/home.png" },
  { id: "ความบันเทิง", label: "ความบันเทิง", image: "/img/entertainment.png" },
  { id: "อื่นๆ", label: "อื่นๆ", image: "/img/more.png" },
];

export default function Home() {
  const [balance, setBalance] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // ฟังก์ชันเล่นเสียงเมื่อบันทึกสำเร็จ
  const playSuccessSound = () => {
    try {
      const audio = new Audio("/sound/shine.mp3");
      audio.play().catch((err) => {
        console.log("Audio play blocked/failed:", err);
      });
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  // ดึงข้อมูลจาก Google Sheet
  const fetchTransactions = async () => {
    try {
      const res = await fetch("/api/transactions", { cache: "no-store" });
      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        const formattedTx: Transaction[] = result.data.map(
          (item: any, index: number) => {
            const isIncome = item.type === "รายรับ";
            return {
              id: Number(item.id) || index + 1,
              type: isIncome ? "income" : "expense",
              amount: Number(item.amount) || 0,
              category: item.category || "-",
              note: item.note || "",
              imageUrl: item.imageUrl || item.image || item.fileUrl || null,
              date: String(item.date || "").trim(),
            };
          }
        );

        const reversedTx = [...formattedTx].reverse();
        setTransactions(reversedTx);

        // คำนวณสรุปยอด
        let inc = 0;
        let exp = 0;
        formattedTx.forEach((tx) => {
          if (tx.type === "income") inc += tx.amount;
          else exp += tx.amount;
        });

        setTotalIncome(inc);
        setTotalExpense(exp);
        setBalance(inc - exp);
      }
    } catch (error) {
      console.error("ไม่สามารถดึงข้อมูลรายการได้:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  // ฟังก์ชันทำงานหลังบันทึกสำเร็จ (ดึงข้อมูลใหม่ + เล่นเสียง)
  const handleSuccess = () => {
    playSuccessSound();
    fetchTransactions();
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans p-0 sm:p-8 select-none">
      <main className="w-full max-w-3xl mx-auto space-y-4 sm:space-y-6">
        {/* ส่วนที่ 1: แสดงสรุปยอดเงิน/รายรับ-รายจ่าย */}
        <DashboardCard
          balance={balance}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
        />

        {/* ส่วนคาดการณ์จำนวนวันที่ใช้เงินได้ */}
        <DaysRemainingCard
          balance={balance}
          transactions={transactions}
        />

        {/* ส่วนที่ 2: ฟอร์มเพิ่มรายการใหม่ */}
        <AddTransactionForm
          categories={CATEGORIES}
          onSuccess={handleSuccess}
        />

        {/* ส่วนที่ 3: ประวัติการใช้จ่าย */}
        <TransactionHistory
          transactions={transactions}
          initialLoading={initialLoading}
          categories={CATEGORIES}
        />
      </main>
    </div>
  );
}