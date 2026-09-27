"use client";

import { useState, useEffect, useMemo } from "react";
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

  // 🔄 1. ดึงข้อมูลจาก Google Sheet
  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
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
            imageUrl: item.imageUrl || null,
            date: item.date || "",
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

  // 📝 2. ฟังก์ชันบันทึกข้อมูลใหม่
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return alert("กรุณาระบุจำนวนเงินให้ถูกต้อง");

    const dateStr = new Date().toLocaleString("th-TH");
    const txCategory = type === "income" ? "รายรับ" : category;

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("date", dateStr);
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
    }
  };

  // 🔍 กรองข้อมูลตามการค้นหาและหมวดหมู่
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch = tx.note.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            tx.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "all" ? true : tx.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [transactions, searchTerm, filterCategory]);

  // ไอคอนหมวดหมู่
  const getCategoryIcon = (cat: string, txType: string) => {
    if (txType === "income") return "💵";
    switch (cat) {
      case "อาหาร": return "🍔";
      case "เดินทาง": return "🚗";
      case "ช้อปปิ้ง": return "🛍️";
      case "ที่พัก": return "🏠";
      default: return "💸";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans p-4 sm:p-8">
      <main className="max-w-3xl mx-auto space-y-6">
        
        {/* Header & Dashboard Card */}
        <div className="bg-zinc-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">💸 Chai Rai Wa</h1>
              <p className="text-zinc-400 text-sm mt-1">บันทึกรายรับ-รายจ่ายง่ายๆ (จ่ายไรวะ)</p>
            </div>
          </div>

          {/* สรุปยอดเงิน */}
          <div className="bg-zinc-800/80 backdrop-blur border border-zinc-700/50 p-6 rounded-2xl">
            <p className="text-sm font-medium text-zinc-400 mb-1">ยอดเงินคงเหลือสุทธิ</p>
            <h2 className={`text-4xl sm:text-5xl font-black ${balance < 0 ? "text-red-400" : "text-green-400"}`}>
              ฿{balance.toLocaleString()}
            </h2>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-zinc-700/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold">
                  ↓
                </div>
                <div>
                  <p className="text-xs text-zinc-400">รายรับทั้งหมด</p>
                  <p className="text-lg font-bold text-green-400">+฿{totalIncome.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
                  ↑
                </div>
                <div>
                  <p className="text-xs text-zinc-400">รายจ่ายทั้งหมด</p>
                  <p className="text-lg font-bold text-red-400">-฿{totalExpense.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold mb-5 text-gray-800">เพิ่มรายการใหม่</h3>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* สลับ รายรับ / รายจ่าย */}
            <div className="flex p-1 bg-gray-100 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${type === "expense" ? "bg-red-500 text-white shadow-md" : "text-gray-500 hover:text-gray-800"}`}
              >
                รายจ่าย (-)
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${type === "income" ? "bg-green-500 text-white shadow-md" : "text-gray-500 hover:text-gray-800"}`}
              >
                รายรับ (+)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">จำนวนเงิน (บาท)</label>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-zinc-900 outline-none bg-gray-50 text-gray-900 font-semibold text-lg"
                  placeholder="0.00"
                  required
                />
              </div>

              {type === "expense" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">หมวดหมู่</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-zinc-900 outline-none bg-gray-50 text-gray-900 font-medium"
                  >
                    <option value="อาหาร">🍔 อาหาร/เครื่องดื่ม</option>
                    <option value="เดินทาง">🚗 ค่าเดินทาง (BTS/MRT/วิน)</option>
                    <option value="ช้อปปิ้ง">🛍️ ช้อปปิ้ง</option>
                    <option value="ที่พัก">🏠 ค่าที่พัก/น้ำไฟ</option>
                    <option value="อื่นๆ">📦 อื่นๆ</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">บันทึกช่วยจำ</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-zinc-900 outline-none bg-gray-50 text-gray-900 text-sm"
                placeholder="เช่น ข้าวกะเพราหมูกรอบ, เติมบัตรแรบบิท"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">แนบรูปภาพใบเสร็จ</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-200 rounded-xl p-2 text-xs text-gray-500 bg-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white font-bold py-3.5 rounded-2xl hover:bg-zinc-800 transition shadow-lg disabled:bg-gray-400"
            >
              {loading ? "กำลังบันทึกลง Google Sheet..." : "บันทึกข้อมูล"}
            </button>
          </form>
        </div>

        {/* History Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <h3 className="text-xl font-bold text-gray-800">ประวัติการใช้จ่าย</h3>

            {/* ช่องค้นหา & ตัวกรอง */}
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="🔍 ค้นหา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-zinc-900 bg-gray-50"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-zinc-900 bg-gray-50"
              >
                <option value="all">ทุกหมวดหมู่</option>
                <option value="อาหาร">อาหาร</option>
                <option value="เดินทาง">เดินทาง</option>
                <option value="ช้อปปิ้ง">ช้อปปิ้ง</option>
                <option value="ที่พัก">ที่พัก</option>
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
          ) : filteredTransactions.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">ไม่พบรายการบันทึก</p>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="p-4 rounded-2xl bg-gray-50 hover:bg-gray-100/80 transition flex items-center justify-between border border-gray-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl border border-gray-100">
                      {getCategoryIcon(tx.category, tx.type)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">
                        {tx.category} {tx.note && <span className="text-gray-500 font-normal">({tx.note})</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{tx.date}</p>
                    </div>
                  </div>
                  
                  <div className="text-right flex items-center gap-3">
                    {tx.imageUrl && (
                      <button
                        onClick={() => setSelectedImage(tx.imageUrl)}
                        className="relative group focus:outline-none"
                      >
                        <Image 
                          src={tx.imageUrl} 
                          alt="Receipt" 
                          width={40} 
                          height={40} 
                          unoptimized
                          className="rounded-xl object-cover h-10 w-10 border border-gray-200 group-hover:scale-105 transition shadow-sm" 
                        />
                      </button>
                    )}
                    <span className={`font-extrabold text-base ${tx.type === "income" ? "text-green-600" : "text-red-500"}`}>
                      {tx.type === "income" ? "+" : "-"}฿{tx.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* 🖼️ Modal Preview ดูรูปใบเสร็จขนาดใหญ่ */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-lg w-full bg-white rounded-3xl p-4 overflow-hidden shadow-2xl">
            <button 
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