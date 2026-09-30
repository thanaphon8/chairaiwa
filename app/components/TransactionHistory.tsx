"use client";

import { useState, useMemo, useEffect } from "react";
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

const ITEMS_PER_PAGE = 10;

export default function TransactionHistory({
  transactions,
  initialLoading,
  categories,
}: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

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
    return found ? found : { id: cat, label: cat, image: "/img/income.png" };
  };

  // ล็อกไม่ให้พื้นหลัง Scroll เมื่อเปิด Modal
  useEffect(() => {
    if (selectedImage) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedImage]);

  // Filter รายการ
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

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory]);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

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

    paginatedTransactions.forEach((tx) => {
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

      if (tx.type === "income") {
        groups[groupKey].totalDailyIncome += tx.amount;
      } else {
        groups[groupKey].totalDailyExpense += tx.amount;
      }
    });

    return groups;
  }, [paginatedTransactions]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="bg-white rounded-none sm:rounded-3xl p-5 sm:p-8 shadow-sm border-y sm:border border-gray-100">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">
            ประวัติการใช้จ่าย
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            พบทั้งหมด {filteredTransactions.length} รายการ
          </p>
        </div>

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
                            src={isIncome ? "/img/income.png" : catInfo.image}
                            alt={catInfo.label}
                            fill
                            sizes="(max-width: 640px) 48px, 64px"
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-xs sm:text-sm font-bold rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ‹ ย้อนกลับ
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => handlePageChange(page)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full text-xs sm:text-sm font-bold transition ${
                        currentPage === page
                          ? "bg-zinc-900 text-white shadow-md"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-xs sm:text-sm font-bold rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ถัดไป ›
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal ดูรูปภาพขนาดใหญ่ */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-6 sm:p-12"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="fixed top-5 right-5 sm:top-8 sm:right-8 bg-white/20 hover:bg-white/40 text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center font-bold text-lg sm:text-xl z-50 backdrop-blur-md transition shadow-lg border border-white/20"
            title="ปิด (Esc)"
          >
            ✕
          </button>

          <div
            className="relative w-full max-w-3xl h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full">
              <Image
                src={selectedImage}
                alt="Receipt Full"
                fill
                unoptimized
                className="object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}