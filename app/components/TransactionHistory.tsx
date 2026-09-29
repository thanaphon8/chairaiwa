"use client";

import { useState, useMemo } from "react";
import Image from "next/image";

export type Transaction = {
  id: number;
  type: "income" | "expense";
  amount: number;
  category: string;
  note: string;
  imageUrl: string | null;
  date: string;
};

type CategoryOption = {
  id: string;
  label: string;
  image: string;
};

type TransactionHistoryProps = {
  transactions: Transaction[];
  initialLoading: boolean;
  categories: CategoryOption[];
};

type GroupSummary = {
  label: string;
  items: Transaction[];
  totalDailyIncome: number;
  totalDailyExpense: number;
};

export default function TransactionHistory({
  transactions,
  initialLoading,
  categories,
}: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const extractDateOnly = (rawStr: string) => {
    if (!rawStr) return "ไม่ระบุวันที่";
    const parts = rawStr.split(/[T\s]+/);
    return parts[0].trim();
  };

  const extractTimeOnly = (rawStr: string) => {
    if (!rawStr) return "";
    const timeMatch = rawStr.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, "0");
      const minutes = timeMatch[2];
      return `${hours}:${minutes} น.`;
    }
    return "";
  };

  const getCategoryInfo = (cat: string) => {
    const found = categories.find((c) => c.id === cat);
    return found ? found : { id: cat, label: cat, image: "/img/more.png" };
  };

  // Filter
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.note.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        filterCategory === "all" ? true : tx.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchTerm, filterCategory]);

  // Grouping + Calculate Daily Summary
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: GroupSummary } = {};

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const yearCE = now.getFullYear();
    const yearBE = yearCE + 543;

    const todayFormats = [
      `${yearCE}-${month}-${day}`,
      `${day}/${month}/${yearBE}`,
      `${day}/${month}/${yearCE}`,
      `${day}/${month}/${String(yearBE).slice(-2)}`,
      `${day}/${month}/${String(yearCE).slice(-2)}`,
    ];

    filteredTransactions.forEach((tx) => {
      const cleanDate = extractDateOnly(tx.date);
      const isToday = todayFormats.includes(cleanDate);

      const groupKey = cleanDate || "unknown";
      let displayLabel = cleanDate;

      if (isToday) {
        displayLabel = `วันนี้ (${cleanDate})`;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          label: displayLabel,
          items: [],
          totalDailyIncome: 0,
          totalDailyExpense: 0,
        };
      }

      groups[groupKey].items.push(tx);

      // คำนวณยอดรวมรายวัน
      if (tx.type === "income") {
        groups[groupKey].totalDailyIncome += tx.amount;
      } else {
        groups[groupKey].totalDailyExpense += tx.amount;
      }
    });

    return groups;
  }, [filteredTransactions]);

  return (
    <div className="bg-white rounded-none sm:rounded-3xl p-5 sm:p-8 shadow-sm border-y sm:border border-gray-100">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h3 className="text-lg sm:text-xl font-bold text-gray-800">
          ประวัติการใช้จ่าย
        </h3>

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="ค้นหา..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 sm:flex-none border border-gray-200 rounded-full px-4 py-1.5 text-base outline-none focus:ring-2 focus:ring-zinc-900 bg-gray-50"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-200 rounded-full px-4 py-1.5 text-base outline-none focus:ring-2 focus:ring-zinc-900 bg-gray-50"
          >
            <option value="all">ทุกหมวดหมู่</option>
            <option value="อาหาร">อาหาร</option>
            <option value="เดินทาง">เดินทาง</option>
            <option value="ช้อปปิ้ง">ช้อปปิ้ง</option>
            <option value="ที่พัก">ที่พัก</option>
            <option value="ความบันเทิง">ความบันเทิง</option>
            <option value="รายรับ">รายรับ</option>
            <option value="อื่นๆ">อื่นๆ</option>
          </select>
        </div>
      </div>

      {initialLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 bg-gray-100 animate-pulse rounded-3xl"
            ></div>
          ))}
        </div>
      ) : Object.keys(groupedTransactions).length === 0 ? (
        <p className="text-center text-gray-400 py-8 text-sm">
          ไม่พบรายการบันทึก
        </p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTransactions).map(([dateKey, group]) => (
            <div key={dateKey} className="space-y-3">
              {/* หัวข้อวันที่ + สรุปยอดรวมประจำวัน */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                <span className="bg-gray-100 text-gray-700 font-semibold px-3 py-1 rounded-full text-xs shadow-sm border border-gray-200">
                  {group.label}
                </span>

                <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
                  {group.totalDailyIncome > 0 && (
                    <span className="text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                      +฿{group.totalDailyIncome.toLocaleString()}
                    </span>
                  )}
                  {group.totalDailyExpense > 0 && (
                    <span className="text-red-500 bg-red-50 px-2.5 py-0.5 rounded-md border border-red-100">
                      -฿{group.totalDailyExpense.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* รายการธุรกรรมย่อยในวันนั้น */}
              <div className="space-y-3">
                {group.items.map((tx) => {
                  const timeStr = extractTimeOnly(tx.date);
                  const catInfo = getCategoryInfo(tx.category);
                  const isIncome = tx.type === "income";
                  const titleText = tx.note.trim() ? tx.note : tx.category;

                  return (
                    <div
                      key={tx.id}
                      className={`relative overflow-hidden rounded-[28px] p-3 sm:p-4 flex justify-between items-center transition shadow-sm ${
                        isIncome ? "bg-emerald-50/80" : "bg-red-50/80"
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 pr-2 min-w-0">
                        {tx.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => setSelectedImage(tx.imageUrl)}
                            className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden group focus:outline-none shadow-sm"
                            title="คลิกเพื่อดูรูปใหญ่"
                          >
                            <Image
                              src={tx.imageUrl}
                              alt="Receipt"
                              fill
                              unoptimized
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          </button>
                        ) : null}

                        <div className="flex flex-col justify-center space-y-1 py-1">
                          <h4 className="font-extrabold text-gray-900 text-base sm:text-xl tracking-tight line-clamp-1">
                            {titleText}
                          </h4>

                          {timeStr && (
                            <p className="text-gray-400 text-xs sm:text-sm font-medium">
                              {timeStr}
                            </p>
                          )}

                          <p
                            className={`font-black text-xl sm:text-2xl pt-1 ${
                              isIncome ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {isIncome ? "+" : "-"}฿{tx.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end justify-between h-24 sm:h-28 shrink-0 pl-2">
                        <div className="relative w-12 h-12 sm:w-16 sm:h-16">
                          <Image
                            src={isIncome ? "/img/more.png" : catInfo.image}
                            alt={catInfo.label}
                            fill
                            className="object-contain"
                          />
                        </div>

                        <div className="bg-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-sm border border-gray-100/60">
                          <span className="text-xs sm:text-sm font-bold text-gray-800 whitespace-nowrap">
                            {isIncome ? "รายรับ" : catInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal ดูรูปใบเสร็จขนาดใหญ่ */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-3xl p-4 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full w-8 h-8 flex items-center justify-center font-bold z-10"
            >
              ✕
            </button>
            <div className="relative h-96 w-full mt-2">
              <Image
                src={selectedImage}
                alt="Receipt Full"
                fill
                unoptimized
                className="object-contain rounded-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}