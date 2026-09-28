"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";

type Transaction = {
  id: number;
  type: "income" | "expense";
  amount: number;
  category: string;
  note: string;
  imageUrl: string | null;
  date: string;
};

// รายการหมวดหมู่พร้อมรูปภาพจาก public/img/
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
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Modal Image Preview
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Form State
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>("อาหาร");
  const [note, setNote] = useState<string>("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Loading State
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // 🛷 Slide to Submit State & Ref
  const [sliderPosition, setSliderPosition] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const sliderTrackRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // 🔄 1. ดึงข้อมูลจาก Google Sheet
  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions', { cache: 'no-store' });
      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        const formattedTx: Transaction[] = result.data.map((item: any, index: number) => {
          const isIncome = item.type === "รายรับ";
          return {
            id: Number(item.id) || index + 1,
            type: isIncome ? "income" : "expense",
            amount: Number(item.amount) || 0,
            category: item.category || "-",
            note: item.note || "",
            imageUrl: item.imageUrl || item.image || item.fileUrl || null,
            // รับค่า String วันที่และเวลาจาก Google Sheet โดยตรงแบบไม่ตัดแต่งหรือแปลง Date
            date: String(item.date || "").trim(),
          };
        });

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

  useEffect(() => {
    fetchTransactions();
  }, []);

  // 📝 2. บันทึกข้อมูล
  const submitData = async () => {
    if (!amount || isNaN(Number(amount))) {
      alert("กรุณาระบุจำนวนเงินให้ถูกต้อง");
      setSliderPosition(0);
      return;
    }

    // สร้างข้อความวันที่และเวลาไทยส่งไปบันทึก
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const yBE = now.getFullYear() + 543;
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    const formattedDateStr = `${d}/${m}/${yBE} ${hh}:${mm}:${ss}`;
    const txCategory = type === "income" ? "รายรับ" : category;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("date", formattedDateStr);
      formData.append("type", type === "income" ? "รายรับ" : "รายจ่าย");
      formData.append("category", txCategory);
      formData.append("amount", amount);
      formData.append("note", note);

      if (imageFile) {
        formData.append("file", imageFile);
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!result.success) {
        alert("เกิดข้อผิดพลาดในการบันทึก: " + result.error);
        setLoading(false);
        setSliderPosition(0);
        return;
      }

      await fetchTransactions();

      // เคลียร์ฟอร์ม
      setAmount("");
      setNote("");
      setImageFile(null);

    } catch (error) {
      console.error(error);
      alert("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
      setSliderPosition(0);
    }
  };

  // 📱 ระบบลาก Slide to Submit
  const getMaxDrag = () => {
    if (!sliderTrackRef.current) return 0;
    const trackWidth = sliderTrackRef.current.clientWidth;
    const handleWidth = 56;
    return trackWidth - handleWidth - 8;
  };

  const handleStart = (clientX: number) => {
    if (loading) return;
    setIsDragging(true);
    dragStartXRef.current = clientX - sliderPosition;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || loading) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const maxDrag = getMaxDrag();
      let newX = clientX - dragStartXRef.current;
      if (newX < 0) newX = 0;
      if (newX > maxDrag) newX = maxDrag;
      setSliderPosition(newX);
    });
  };

  const handleEnd = () => {
    if (!isDragging || loading) return;
    setIsDragging(false);
    const maxDrag = getMaxDrag();

    if (sliderPosition >= maxDrag * 0.85) {
      setSliderPosition(maxDrag);
      submitData();
    } else {
      setSliderPosition(0);
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onTouchEnd = () => handleEnd();

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove, { passive: true });
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("touchend", onTouchEnd);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDragging, sliderPosition]);

  // 🔍 กรองข้อมูลตามการค้นหาและหมวดหมู่
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch = tx.note.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            tx.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "all" ? true : tx.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchTerm, filterCategory]);

  // 🛠️ 1. สกัดวันที่จากข้อความ Sheet ตรงๆ (เอาส่วนแรกก่อนเว้นวรรค หรือคั่น T)
  const extractDateOnly = (rawStr: string) => {
    if (!rawStr) return "ไม่ระบุวันที่";
    const parts = rawStr.split(/[T\s]+/);
    return parts[0].trim();
  };

  // ⏰ 2. สกัดเวลาจากข้อความ Sheet ตรงๆ (ค้นหาชุดตัวเลข HH:mm ที่ปรากฏในข้อความ)
  const extractTimeOnly = (rawStr: string) => {
    if (!rawStr) return "";

    // ค้นหาแพตเทิร์นเวลา ตัวเลข 1-2 หลัก คั่นด้วย : และตัวเลข 2 หลัก (เช่น 13:30 หรือ 08:05)
    const timeMatch = rawStr.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, "0");
      const minutes = timeMatch[2];
      return `${hours}:${minutes} น.`;
    }

    return "";
  };

  // 📅 จัดกลุ่มรายการตาม String วันที่จาก Google Sheet
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: { label: string; items: Transaction[] } } = {};

    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const yearCE = now.getFullYear();
    const yearBE = yearCE + 543;

    // รูปแบบวันที่ของวันนี้ทุกประเภท เพื่อเทียบป้าย "วันนี้"
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
        };
      }

      groups[groupKey].items.push(tx);
    });

    return groups;
  }, [filteredTransactions]);

  const getCategoryImg = (cat: string) => {
    const found = CATEGORIES.find((c) => c.id === cat);
    return found ? found.image : "/img/more.png";
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans p-0 sm:p-8 select-none">
      <main className="w-full max-w-3xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Header & Dashboard Card */}
        <div className="px-4 pt-4 sm:p-0">
          <div className="bg-zinc-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">💸 Chai Rai Wa</h1>
                <p className="text-zinc-400 text-xs sm:text-sm mt-1">บันทึกรายรับ-รายจ่ายง่ายๆ (จ่ายไรวะ)</p>
              </div>
            </div>

            {/* สรุปยอดเงิน */}
            <div className="bg-zinc-800/80 backdrop-blur border border-zinc-700/50 p-5 sm:p-6 rounded-2xl">
              <p className="text-xs sm:text-sm font-medium text-zinc-400 mb-1">ยอดเงินคงเหลือสุทธิ</p>
              <h2 className={`text-3xl sm:text-5xl font-black ${balance < 0 ? "text-red-400" : "text-green-400"}`}>
                ฿{balance.toLocaleString()}
              </h2>

              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-zinc-700/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold shrink-0">
                    ↓
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">รายรับทั้งหมด</p>
                    <p className="text-base sm:text-lg font-bold text-green-400">+฿{totalIncome.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold shrink-0">
                    ↑
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">รายจ่ายทั้งหมด</p>
                    <p className="text-base sm:text-lg font-bold text-red-400">-฿{totalExpense.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-none sm:rounded-3xl p-5 sm:p-8 shadow-sm border-y sm:border border-gray-100">
          <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-5 text-gray-800">เพิ่มรายการใหม่</h3>
          
          <div className="space-y-5">
            {/* สลับ รายรับ / รายจ่าย */}
            <div className="flex p-1 bg-gray-100 rounded-full gap-1">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`flex-1 py-3 rounded-full font-semibold text-sm transition-all ${type === "expense" ? "bg-red-500 text-white shadow-md" : "text-gray-500 hover:text-gray-800"}`}
              >
                รายจ่าย (-)
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`flex-1 py-3 rounded-full font-semibold text-sm transition-all ${type === "income" ? "bg-green-500 text-white shadow-md" : "text-gray-500 hover:text-gray-800"}`}
              >
                รายรับ (+)
              </button>
            </div>

            {/* หมวดหมู่ */}
            {type === "expense" && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">หมวดหมู่</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 py-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className="flex flex-col items-center justify-center group focus:outline-none"
                      >
                        <div className={`relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center transition-all duration-200 ${
                          isSelected ? "scale-110 drop-shadow-md" : "opacity-60 hover:opacity-100 hover:scale-105"
                        }`}>
                          <Image
                            src={cat.image}
                            alt={cat.label}
                            fill
                            className="object-contain p-1"
                          />
                          
                          {isSelected && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[11px] font-bold shadow-md border-2 border-white">
                              ✓
                            </span>
                          )}
                        </div>

                        <span className={`text-xs mt-2 text-center font-medium transition-colors ${
                          isSelected ? "text-zinc-900 font-bold" : "text-gray-500"
                        }`}>
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ช่องกรอกจำนวนเงิน */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">จำนวนเงิน</label>
              <div className="relative flex items-center">
                <span className="absolute left-5 text-xl font-extrabold text-gray-400 select-none">
                  ฿
                </span>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-full py-3.5 pl-11 pr-5 focus:ring-2 focus:ring-zinc-900 outline-none bg-gray-50 text-gray-900 font-bold text-base sm:text-2xl"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* ช่องบันทึกช่วยจำ */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">บันทึกช่วยจำ</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-gray-200 rounded-full px-5 py-3.5 focus:ring-2 focus:ring-zinc-900 outline-none bg-gray-50 text-gray-900 text-base"
                placeholder="เช่น ข้าวกะเพราหมูกรอบ, เติมบัตรแรบบิท"
              />
            </div>

            {/* ช่องแนบไฟล์ */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">แนบรูปภาพใบเสร็จ</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-200 rounded-full px-4 py-2 text-base text-gray-500 bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800"
              />
            </div>

            {/* 🛷 ปุ่ม Slide to Submit */}
            <div className="pt-2">
              <div
                ref={sliderTrackRef}
                style={{ touchAction: "none" }}
                className="relative w-full h-16 bg-zinc-900 rounded-full p-1 flex items-center overflow-hidden shadow-lg select-none cursor-pointer"
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs sm:text-sm font-semibold tracking-wider text-zinc-400 animate-pulse">
                    {loading ? "กำลังบันทึกข้อมูล..." : "slide to save  ➔"}
                  </span>
                </div>

                <div
                  className="absolute left-0 top-0 bottom-0 bg-zinc-800/90 rounded-full pointer-events-none"
                  style={{ width: `${sliderPosition + 60}px` }}
                />

                <div
                  onMouseDown={(e) => handleStart(e.clientX)}
                  onTouchStart={(e) => handleStart(e.touches[0].clientX)}
                  className={`relative z-10 w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing will-change-transform ${
                    isDragging ? "" : "transition-transform duration-300 ease-out"
                  }`}
                  style={{ transform: `translate3d(${sliderPosition}px, 0, 0)` }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-zinc-900 text-xl font-black">➔</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* History Section */}
        <div className="bg-white rounded-none sm:rounded-3xl p-5 sm:p-8 shadow-sm border-y sm:border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800">ประวัติการใช้จ่าย</h3>

            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="🔍 ค้นหา..."
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
                <div key={n} className="h-16 bg-gray-100 animate-pulse rounded-2xl"></div>
              ))}
            </div>
          ) : Object.keys(groupedTransactions).length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">ไม่พบรายการบันทึก</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTransactions).map(([dateKey, group]) => (
                <div key={dateKey} className="space-y-3">
                  {/* หัวข้อแสดงกลุ่มวันที่ */}
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-100 text-gray-700 font-semibold px-3 py-1 rounded-full text-xs shadow-sm border border-gray-200">
                      📅 {group.label}
                    </span>
                    <div className="h-[1px] bg-gray-100 flex-1"></div>
                  </div>

                  {/* รายการใช้จ่ายในวันนั้นๆ */}
                  <div className="space-y-3">
                    {group.items.map((tx) => {
                      const timeStr = extractTimeOnly(tx.date);

                      return (
                        <div key={tx.id} className="p-3.5 sm:p-4 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition flex items-center justify-between border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center p-2 border border-gray-100 shrink-0">
                              {tx.type === "income" ? (
                                <span className="text-xl">💵</span>
                              ) : (
                                <div className="relative w-full h-full">
                                  <Image
                                    src={getCategoryImg(tx.category)}
                                    alt={tx.category}
                                    fill
                                    className="object-contain"
                                  />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 text-xs sm:text-sm">
                                {tx.category} {tx.note && <span className="text-gray-500 font-normal">({tx.note})</span>}
                              </p>
                              {/* ⏰ เวลาที่ดึงจากตัวเลขข้อความบน Sheet โดยตรง */}
                              {timeStr && (
                                <p className="text-[11px] text-gray-400 mt-0.5 font-medium flex items-center gap-1">
                                  <span>🕒</span> {timeStr}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right flex items-center gap-2.5 sm:gap-3">
                            {tx.imageUrl ? (
                              <button
                                type="button"
                                onClick={() => setSelectedImage(tx.imageUrl)}
                                className="relative group focus:outline-none shrink-0"
                                title="คลิกเพื่อดูรูปภาพขยายใหญ่"
                              >
                                <Image 
                                  src={tx.imageUrl} 
                                  alt="Receipt" 
                                  width={40} 
                                  height={40} 
                                  unoptimized
                                  className="rounded-xl object-cover h-10 w-10 sm:h-11 sm:w-11 border border-gray-200 group-hover:scale-105 transition shadow-sm" 
                                />
                              </button>
                            ) : null}

                            <span className={`font-extrabold text-sm sm:text-base whitespace-nowrap ${tx.type === "income" ? "text-green-600" : "text-red-500"}`}>
                              {tx.type === "income" ? "+" : "-"}฿{tx.amount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Modal Preview ดูรูปใบเสร็จขนาดใหญ่ */}
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