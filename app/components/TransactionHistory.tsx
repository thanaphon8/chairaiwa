"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
  dateText: string;
  items: Transaction[];
  totalDailyIncome: number;
  totalDailyExpense: number;
};

const ITEMS_PER_PAGE = 10;
const INCOME_FILTER = "รายรับ";

const fmt = (n: number) =>
  Math.abs(n).toLocaleString("th-TH", { maximumFractionDigits: 2 });

// ---------- helpers (pure) ----------

const extractDateOnly = (rawStr: string) => {
  if (!rawStr) return "ไม่ระบุวันที่";
  return rawStr.split(/[T\s]+/)[0].trim();
};

const extractTimeOnly = (rawStr: string) => {
  if (!rawStr) return "";
  const m = rawStr.match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]} น.` : "";
};

const isValidImageUrl = (url: string | null | undefined) => {
  if (!url) return false;
  const clean = url.trim();
  return clean !== "" && clean !== "null" && clean !== "undefined";
};

// รูปแบบวันที่ที่อาจพบใน Sheet (ค.ศ./พ.ศ. ปีเต็ม/ย่อ)
const dateFormats = (d: Date) => {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const ce = d.getFullYear();
  const be = ce + 543;
  return [
    `${ce}-${month}-${day}`,
    `${day}/${month}/${be}`,
    `${day}/${month}/${ce}`,
    `${day}/${month}/${String(be).slice(-2)}`,
    `${day}/${month}/${String(ce).slice(-2)}`,
  ];
};

// ---------- component ----------

export default function TransactionHistory({
  transactions = [],
  initialLoading = false,
  categories = [],
}: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const getCategoryInfo = (cat: string) => {
    const found = categories.find((c) => c.id === cat || c.label === cat);
    return found ?? { id: cat, label: cat, image: "/img/more.png" };
  };

  // ล็อกการเลื่อนพื้นหลัง + ปิด modal ด้วย Esc
  useEffect(() => {
    if (!selectedImage) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedImage(null);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedImage]);

  // กรองรายการ (ค้นหาจากบันทึก + ชื่อหมวดหมู่)
  const filteredTransactions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return transactions.filter((tx) => {
      const label = getCategoryInfo(tx.category).label;
      const matchesSearch =
        !q ||
        (tx.note || "").toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        label.toLowerCase().includes(q);
      const matchesCategory =
        filterCategory === "all" ? true : tx.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, searchTerm, filterCategory, categories]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)
  );

  // เปลี่ยนตัวกรอง/คำค้น -> กลับหน้า 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory]);

  // ถ้าจำนวนหน้าลดลง (เช่น ข้อมูลรีเฟรช) ไม่ให้ค้างอยู่หน้าที่ไม่มีอยู่จริง
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  // ยอดรวมรายวัน: รวมจากทุกรายการที่ผ่านตัวกรอง ข้ามทุกหน้า
  // (วันที่มีรายการเยอะจนถูกแบ่งไปหลายหน้า จะยังเห็นยอดรวมทั้งวันตรงหัววัน)
  const dailyTotals = useMemo(() => {
    const totals = new Map<string, { income: number; expense: number }>();
    filteredTransactions.forEach((tx) => {
      const key = extractDateOnly(tx.date);
      const t = totals.get(key) ?? { income: 0, expense: 0 };
      if (tx.type === "income") t.income += tx.amount;
      else t.expense += tx.amount;
      totals.set(key, t);
    });
    return totals;
  }, [filteredTransactions]);

  // จัดกลุ่มตามวันที่ (วันนี้ / เมื่อวาน / วันที่)
  const groupedTransactions = useMemo(() => {
    const groups = new Map<string, GroupSummary>();

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const todayFormats = dateFormats(now);
    const yesterdayFormats = dateFormats(yesterday);

    paginatedTransactions.forEach((tx) => {
      const dateText = extractDateOnly(tx.date);

      let label = dateText;
      if (todayFormats.includes(dateText)) label = "วันนี้";
      else if (yesterdayFormats.includes(dateText)) label = "เมื่อวาน";

      let group = groups.get(dateText);
      if (!group) {
        group = {
          label,
          dateText,
          items: [],
          totalDailyIncome: dailyTotals.get(dateText)?.income ?? 0,
          totalDailyExpense: dailyTotals.get(dateText)?.expense ?? 0,
        };
        groups.set(dateText, group);
      }

      group.items.push(tx);
    });

    return Array.from(groups.entries());
  }, [paginatedTransactions, dailyTotals]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const markImageFailed = (id: number) => {
    setFailedImages((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const hasAnyTransactions = transactions.length > 0;
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5C38C9] focus-visible:ring-offset-2";

  return (
    <div
      ref={containerRef}
      className="-mx-4 bg-white px-5 py-6 sm:mx-0 sm:rounded-3xl sm:border sm:border-gray-100 sm:p-8 sm:shadow-sm"
    >
      {/* Header */}
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-zinc-900 sm:text-xl">
          ประวัติการใช้จ่าย
        </h3>
        <p className="shrink-0 text-xs text-zinc-500">
          {filteredTransactions.length} รายการ
        </p>
      </div>

      {/* ค้นหา (16px ป้องกัน iOS ซูมเองตอนโฟกัส) */}
      <input
        type="search"
        placeholder="ค้นหารายการ"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mt-4 h-11 w-full rounded-full bg-zinc-100 px-5 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-[#5C38C9]"
      />

      {/* ตัวกรองหมวดหมู่: เลื่อนแนวนอนด้วยนิ้วโป้งได้ */}
      <div
        role="tablist"
        aria-label="กรองตามหมวดหมู่"
        className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {[
          { id: "all", label: "ทั้งหมด" },
          ...categories.map((c) => ({ id: c.id, label: c.label })),
          { id: INCOME_FILTER, label: "รายรับ" },
        ].map((opt) => {
          const active = filterCategory === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilterCategory(opt.id)}
              className={`h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium transition ${focusRing} ${
                active
                  ? "bg-[#5C38C9] text-white"
                  : "bg-zinc-100 text-zinc-600 active:bg-zinc-200"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="mt-6">
        {initialLoading ? (
          <div className="space-y-4" aria-busy="true">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-zinc-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/2 animate-pulse rounded bg-zinc-100" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100" />
                </div>
                <div className="h-4 w-16 animate-pulse rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        ) : groupedTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm font-medium text-zinc-700">
              {hasAnyTransactions ? "ไม่พบรายการที่ตรงกัน" : "ยังไม่มีรายการ"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {hasAnyTransactions
                ? "ลองเปลี่ยนคำค้นหาหรือหมวดหมู่"
                : "เพิ่มรายการแรกได้ที่ฟอร์มด้านบน"}
            </p>
          </div>
        ) : (
          <div className="space-y-7">
            {groupedTransactions.map(([dateKey, group]) => (
              <section key={dateKey}>
                {/* หัววัน + ยอดรวมของวัน */}
                <div className="flex items-baseline justify-between gap-3 border-b border-zinc-100 pb-2">
                  <h4 className="min-w-0 truncate whitespace-nowrap text-sm font-semibold text-zinc-900">
                    {group.label}
                    {group.label !== group.dateText && (
                      <span className="ml-2 text-xs font-normal text-zinc-500">
                        {group.dateText}
                      </span>
                    )}
                  </h4>

                  <div className="flex shrink-0 items-baseline gap-3 whitespace-nowrap text-xs font-medium tabular-nums">
                    {group.totalDailyIncome > 0 && (
                      <span className="text-emerald-600">
                        +฿{fmt(group.totalDailyIncome)}
                      </span>
                    )}
                    {group.totalDailyExpense > 0 && (
                      <span className="text-zinc-500">
                        -฿{fmt(group.totalDailyExpense)}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="divide-y divide-zinc-100">
                  {group.items.map((tx) => {
                    const timeStr = extractTimeOnly(tx.date);
                    const catInfo = getCategoryInfo(tx.category);
                    const isIncome = tx.type === "income";
                    const hasNote = !!tx.note?.trim();
                    const titleText = hasNote
                      ? tx.note
                      : isIncome
                      ? "รายรับ"
                      : catInfo.label;
                    const hasImage = isValidImageUrl(tx.imageUrl);
                    const imageFailed = failedImages.has(tx.id);

                    return (
                      <li key={tx.id} className="flex items-center gap-3 py-3.5 lg:gap-4 lg:py-4 lg:transition-colors lg:hover:bg-zinc-50/70">
                        {/* ไอคอนหมวดหมู่ */}
                        <div className="relative h-11 w-11 shrink-0 rounded-full bg-[#5C38C9]/10 lg:h-12 lg:w-12">
                          <Image
                            src={isIncome ? "/img/income.png" : catInfo.image}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-contain p-2"
                          />
                        </div>

                        {/* ชื่อรายการ */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-medium text-zinc-900 lg:text-base">
                            {titleText}
                          </p>
                          <p className="mt-0.5 flex gap-2 text-xs text-zinc-500">
                            {hasNote && (
                              <span className="truncate">
                                {isIncome ? "รายรับ" : catInfo.label}
                              </span>
                            )}
                            {timeStr && (
                              <span className="shrink-0">{timeStr}</span>
                            )}
                          </p>
                        </div>

                        {/* จำนวนเงิน */}
                        <p
                          className={`shrink-0 text-base font-semibold tabular-nums lg:text-lg ${
                            isIncome ? "text-emerald-600" : "text-zinc-900"
                          }`}
                        >
                          {isIncome ? "+" : "-"}฿{fmt(tx.amount)}
                        </p>

                        {/* รูปใบเสร็จ */}
                        {hasImage &&
                          (imageFailed ? (
                            <div
                              title="โหลดรูปไม่สำเร็จ"
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400 lg:h-14 lg:w-14"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.8}
                                viewBox="0 0 24 24"
                                aria-label="โหลดรูปไม่สำเร็จ"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedImage(tx.imageUrl)}
                              aria-label="ดูรูปใบเสร็จ"
                              className={`h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-zinc-100 lg:h-14 lg:w-14 lg:cursor-pointer ${focusRing}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={tx.imageUrl!}
                                alt="ใบเสร็จ"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={() => markImageFailed(tx.id)}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ))}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            {/* Pagination: กะทัดรัด ไม่ล้นจอเมื่อมีหลายหน้า */}
            {totalPages > 1 && (
              <nav
                aria-label="เปลี่ยนหน้า"
                className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-5"
              >
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`h-11 rounded-full border border-zinc-200 px-5 text-sm font-medium text-zinc-700 transition active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                >
                  ย้อนกลับ
                </button>

                <p className="text-sm text-zinc-500 tabular-nums">
                  หน้า <span className="font-semibold text-zinc-900">{currentPage}</span>{" "}
                  จาก {totalPages}
                </p>

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`h-11 rounded-full bg-[#5C38C9] px-5 text-sm font-medium text-white transition active:bg-[#4b2ca8] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
                >
                  ถัดไป
                </button>
              </nav>
            )}
          </div>
        )}
      </div>

      {/* Modal ดูรูปใบเสร็จขนาดใหญ่ */}
      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="รูปใบเสร็จ"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            aria-label="ปิด"
            className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-lg text-white backdrop-blur-md transition active:bg-white/30"
          >
            ✕
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedImage}
            alt="รูปใบเสร็จ"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85dvh] max-w-full rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}