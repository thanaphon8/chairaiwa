"use client";

import { useState } from "react";
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // State สำหรับฟอร์ม
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>("อาหาร");
  const [note, setNote] = useState<string>("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // State สถานะกำลังบันทึก
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return alert("กรุณาระบุจำนวนเงินให้ถูกต้อง");

    const numAmount = Number(amount);
    const dateStr = new Date().toLocaleString("th-TH");
    const txCategory = type === "income" ? "รายรับ" : category;

    setLoading(true);

    try {
      // 1. ส่งข้อมูลไปบันทึกลง Google Sheet ผ่าน API
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          type: type === "income" ? "รายรับ" : "รายจ่าย",
          category: txCategory,
          amount: numAmount,
          note: note,
        }),
      });

      const result = await res.json();

      if (!result.success) {
        alert("เกิดข้อผิดพลาดในการบันทึกลง Google Sheet: " + result.error);
        setLoading(false);
        return;
      }

      // 2. เมื่อบันทึกลง Sheet สำเร็จ ให้คำนวณยอดเงินและอัปเดตประวัติหน้าเว็บ
      if (type === "income") {
        setBalance((prev) => prev + numAmount);
      } else {
        setBalance((prev) => prev - numAmount);
      }

      const newTx: Transaction = {
        id: Date.now(),
        type,
        amount: numAmount,
        category: txCategory,
        note,
        imageUrl: imageFile ? URL.createObjectURL(imageFile) : null,
        date: dateStr,
      };

      setTransactions([newTx, ...transactions]);

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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-4 sm:p-8">
      <main className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-zinc-900 text-white p-8 text-center">
          <h1 className="text-4xl font-bold mb-2">💸 Chai Rai Wa</h1>
          <p className="text-zinc-400">แอปบันทึกรายรับ-รายจ่าย (จ่ายไรว่ะ)</p>
          
          <div className="mt-6 bg-zinc-800 p-4 rounded-xl inline-block min-w-[250px]">
            <p className="text-sm text-zinc-400 mb-1">ยอดเงินคงเหลือ</p>
            <h2 className={`text-4xl font-bold ${balance < 0 ? "text-red-400" : "text-green-400"}`}>
              ฿{balance.toLocaleString()}
            </h2>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-8 border-b border-gray-100">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">เพิ่มรายการใหม่</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`flex-1 py-2 rounded-lg font-medium transition ${type === "expense" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                รายจ่าย (-)
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`flex-1 py-2 rounded-lg font-medium transition ${type === "income" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                รายรับ (+)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">จำนวนเงิน (บาท)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-zinc-900 outline-none bg-white text-black"
                  placeholder="0.00"
                  required
                />
              </div>

              {type === "expense" && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">หมวดหมู่</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-zinc-900 outline-none bg-white text-black"
                  >
                    <option value="อาหาร">🍜 อาหาร/เครื่องดื่ม</option>
                    <option value="เดินทาง">🚇 ค่าเดินทาง (BTS/MRT/วิน)</option>
                    <option value="ช้อปปิ้ง">🛍️ ช้อปปิ้ง</option>
                    <option value="ที่พัก">🏠 ค่าที่พัก/น้ำไฟ</option>
                    <option value="อื่นๆ">✨ อื่นๆ</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">บันทึกช่วยจำ (ซื้ออะไรมา?)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-zinc-900 outline-none bg-white text-black"
                placeholder="เช่น ข้าวกะเพราหมูกรอบ, เติมบัตรแรบบิท"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">แนบรูปภาพ (ใบเสร็จ/ของที่ซื้อ)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white font-semibold py-3 rounded-lg hover:bg-zinc-800 transition shadow-md disabled:bg-gray-400"
            >
              {loading ? "กำลังบันทึกลง Google Sheet..." : "บันทึกข้อมูล"}
            </button>
          </form>
        </div>

        {/* History Section */}
        <div className="p-8 bg-gray-50">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">ประวัติการใช้จ่าย</h3>
          {transactions.length === 0 ? (
            <p className="text-center text-gray-500 py-4">ยังไม่มีรายการบัญชี เริ่มต้นบันทึกเลย!</p>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${tx.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                      {tx.type === "income" ? "💵" : "💸"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{tx.category} {tx.note && <span className="text-gray-500 text-sm font-normal">({tx.note})</span>}</p>
                      <p className="text-xs text-gray-400">{tx.date}</p>
                    </div>
                  </div>
                  
                  <div className="text-right flex items-center gap-4">
                    {tx.imageUrl && (
                      <Image src={tx.imageUrl} alt="Receipt" width={40} height={40} className="rounded-md object-cover h-10 w-10 border border-gray-200" />
                    )}
                    <span className={`font-bold ${tx.type === "income" ? "text-green-500" : "text-red-500"}`}>
                      {tx.type === "income" ? "+" : "-"}฿{tx.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}