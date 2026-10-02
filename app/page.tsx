"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import DashboardCard from "./components/DashboardCard";
import AddTransactionForm, {
  NewTransaction,
} from "./components/AddTransactionForm";
import TransactionHistory, { Transaction } from "./components/TransactionHistory";

const CATEGORIES = [
  { id: "อาหาร", label: "อาหาร/เครื่องดื่ม", image: "/img/food.png" },
  { id: "เดินทาง", label: "เดินทาง", image: "/img/taxi.png" },
  { id: "ช้อปปิ้ง", label: "ช้อปปิ้ง", image: "/img/shopping.png" },
  { id: "ที่พัก", label: "ค่าที่พัก/น้ำไฟ", image: "/img/home.png" },
  { id: "ความบันเทิง", label: "ความบันเทิง", image: "/img/entertainment.png" },
  { id: "อื่นๆ", label: "อื่นๆ", image: "/img/more.png" },
];

const CACHE_KEY = "chairaiwa:transactions:v1";

// แปลงข้อมูลจาก Sheet -> Transaction (ล่าสุดขึ้นก่อน)
const mapItems = (data: any[]): Transaction[] =>
  data
    .map((item: any, index: number) => ({
      id: Number(item.id) || index + 1,
      type: (item.type === "รายรับ" ? "income" : "expense") as
        | "income"
        | "expense",
      amount: Number(item.amount) || 0,
      category: item.category || "-",
      note: item.note || "",
      imageUrl: item.imageUrl || item.image || item.fileUrl || null,
      date: String(item.date || "").trim(),
    }))
    .reverse();

const readCache = (): Transaction[] | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Transaction[]) : null;
  } catch {
    return null;
  }
};

const writeCache = (list: Transaction[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    // พื้นที่เต็มหรือถูกบล็อก: ข้ามได้ ไม่กระทบการใช้งาน
  }
};

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestIdRef = useRef<number>(0);
  // รายการที่แสดงบนหน้าจอไปแล้ว แต่ Sheet อาจยังไม่ส่งกลับมา (ใหม่สุดอยู่หน้าสุด)
  const pendingRef = useRef<Transaction[]>([]);
  // จำนวนรายการล่าสุดที่ยืนยันจาก Sheet
  const confirmedCountRef = useRef<number>(0);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // สรุปยอดคำนวณจากรายการที่แสดงอยู่ (รวมรายการที่เพิ่งเพิ่ม)
  const { balance, totalIncome, totalExpense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    transactions.forEach((tx) => {
      if (tx.type === "income") inc += tx.amount;
      else exp += tx.amount;
    });
    return { balance: inc - exp, totalIncome: inc, totalExpense: exp };
  }, [transactions]);

  // เตรียมเสียงล่วงหน้า + ปลดล็อกการเล่นเสียงบนมือถือ
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

  // ดึงข้อมูลจาก Google Sheet (ทำงานเงียบๆ เบื้องหลัง)
  const fetchTransactions = useCallback(async (retriesLeft = 0) => {
    const myRequestId = ++requestIdRef.current;

    try {
      const res = await fetch("/api/transactions", { cache: "no-store" });
      const result = await res.json();

      // มีคำขอใหม่กว่าเริ่มไปแล้ว -> ทิ้งผลเก่า
      if (myRequestId !== requestIdRef.current) return;
      if (!(result.success && Array.isArray(result.data))) return;

      const serverList = mapItems(result.data);
      const pending = pendingRef.current;
      const caughtUp =
        serverList.length >= confirmedCountRef.current + pending.length;

      if (pending.length === 0 || caughtUp) {
        pendingRef.current = [];
        confirmedCountRef.current = serverList.length;
        setTransactions(serverList);
        writeCache(serverList);
      } else {
        // Sheet ยังไม่เห็นรายการที่เพิ่งบันทึก: คงรายการบนหน้าจอไว้ แล้วลองใหม่
        setTransactions([...pending, ...serverList]);
        if (retriesLeft > 0) {
          retryRef.current = setTimeout(
            () => fetchTransactions(retriesLeft - 1),
            2000
          );
        }
      }
    } catch (error) {
      // ถ้ามีข้อมูลจาก cache แสดงอยู่แล้ว ผู้ใช้ยังใช้งานต่อได้
      console.error("ไม่สามารถดึงข้อมูลรายการได้:", error);
    } finally {
      if (myRequestId === requestIdRef.current) {
        setInitialLoading(false);
      }
    }
  }, []);

  // บันทึกสำเร็จ: แสดงรายการใหม่ทันที + เล่นเสียง แล้วค่อยซิงก์กับ Sheet เบื้องหลัง
  const handleSuccess = (tx: NewTransaction) => {
    const optimistic: Transaction = { ...tx, id: -Date.now() };
    pendingRef.current = [optimistic, ...pendingRef.current];
    setTransactions((prev) => [optimistic, ...prev]);
    playSuccessSound();

    if (retryRef.current) clearTimeout(retryRef.current);
    fetchTransactions(3);
  };

  // เปิดแอป: แสดงข้อมูลเดิมจาก cache ทันที แล้วดึงข้อมูลใหม่เบื้องหลัง
  useEffect(() => {
    const cached = readCache();
    if (cached) {
      confirmedCountRef.current = cached.length;
      setTransactions(cached);
      setInitialLoading(false);
    }
    fetchTransactions();

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [fetchTransactions]);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 p-0">
      <main className="w-full">
        {/* การ์ดสรุปยอด + คาดการณ์วันคงเหลือ */}
        <DashboardCard
          balance={balance}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          transactions={transactions}
        />

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