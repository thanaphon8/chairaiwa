"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import DashboardCard from "./components/DashboardCard";
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestIdRef = useRef<number>(0);

  // เตรียมเสียงล่วงหน้า + ปลดล็อกการเล่นเสียงบนมือถือ (iOS/Android บล็อกเสียงที่ไม่ได้เริ่มจากการแตะ)
  useEffect(() => {
    const audio = new Audio("/sound/shine.mp3");
    audio.preload = "auto";
    audioRef.current = audio;

    const unlock = () => {
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("mousedown", unlock);
    };

    window.addEventListener("touchstart", unlock, { passive: true });
    window.addEventListener("mousedown", unlock);

    return () => {
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("mousedown", unlock);
    };
  }, []);

  const playSuccessSound = () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.currentTime = 0;
      audio.play().catch((err) => {
        console.log("Audio play blocked/failed:", err);
      });
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  // ดึงข้อมูลจาก Google Sheet
  const fetchTransactions = useCallback(async () => {
    const myRequestId = ++requestIdRef.current;

    try {
      const res = await fetch("/api/transactions", { cache: "no-store" });
      const result = await res.json();

      // ถ้ามีคำขอใหม่กว่าเริ่มไปแล้ว ทิ้งผลลัพธ์เก่า (กันข้อมูลเก่าเขียนทับข้อมูลใหม่)
      if (myRequestId !== requestIdRef.current) return;

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

        // รายการล่าสุดขึ้นก่อน
        setTransactions([...formattedTx].reverse());

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
      if (myRequestId === requestIdRef.current) {
        setInitialLoading(false);
      }
    }
  }, []);

  // หลังบันทึกสำเร็จ: ดึงข้อมูลใหม่ให้เสร็จก่อน แล้วค่อยเล่นเสียง
  // (ต้อง return Promise เพราะฟอร์ม await onSuccess() อยู่)
  const handleSuccess = async () => {
    await fetchTransactions();
    playSuccessSound();
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    // เอา select-none ออกจาก root: บน iOS Safari อาจทำให้พิมพ์ในช่อง input ไม่ได้
    <div className="min-h-screen bg-gray-100 text-gray-900 p-0">
      <main className="w-full">
        {/* การ์ดสรุปยอด + คาดการณ์วันคงเหลือ (รวมเป็นการ์ดเดียว) */}
        <DashboardCard
          balance={balance}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          transactions={transactions}
        />

        {/* ส่วนฟอร์มและประวัติการใช้จ่าย */}
        {/* มือถือ/แท็บเล็ต: เรียงลงมา  |  จอคอม (lg): 2 คอลัมน์ ฟอร์มซ้าย ประวัติขวา */}
        <div className="mx-auto mt-4 flex w-full max-w-6xl flex-col gap-4 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:mt-6 sm:gap-6 sm:px-8 lg:mt-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8 lg:px-10 lg:pb-14">
          <div className="lg:col-span-5">
            <AddTransactionForm
              categories={CATEGORIES}
              onSuccess={handleSuccess}
            />
          </div>

          <div className="min-w-0 lg:col-span-7">
            <TransactionHistory
              transactions={transactions}
              initialLoading={initialLoading}
              categories={CATEGORIES}
            />
          </div>
        </div>
      </main>
    </div>
  );
}