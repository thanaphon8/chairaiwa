"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

type CategoryOption = {
  id: string;
  label: string;
  image: string;
};

type AddTransactionFormProps = {
  categories: CategoryOption[];
  onSuccess: () => Promise<void>;
};

export default function AddTransactionForm({
  categories,
  onSuccess,
}: AddTransactionFormProps) {
  // Form State
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>("อาหาร");
  const [note, setNote] = useState<string>("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Loading State
  const [loading, setLoading] = useState<boolean>(false);

  // Slider State & Ref
  const [sliderPosition, setSliderPosition] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const sliderTrackRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Ref สำหรับ File Input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle File Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setFilePreview(objectUrl);
    }
  };

  // Remove Selected File
  const handleRemoveFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setImageFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Submit Data
  const submitData = async () => {
    if (!amount || isNaN(Number(amount))) {
      alert("กรุณาระบุจำนวนเงินให้ถูกต้อง");
      setSliderPosition(0);
      return;
    }

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

      const res = await fetch("/api/transactions", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!result.success) {
        alert("เกิดข้อผิดพลาดในการบันทึก: " + result.error);
        setLoading(false);
        setSliderPosition(0);
        return;
      }

      await onSuccess();

      // Clear Form
      setAmount("");
      setNote("");
      handleRemoveFile();
    } catch (error) {
      console.error(error);
      alert("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
      setSliderPosition(0);
    }
  };

  // Slider Logic
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

  return (
    <div className="bg-white rounded-none sm:rounded-3xl p-5 sm:p-8 shadow-sm border-y sm:border border-gray-100">
      <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-5 text-gray-800">
        เพิ่มรายการใหม่
      </h3>

      <div className="space-y-5">
        {/* สลับ รายรับ / รายจ่าย */}
        <div className="flex p-1 bg-gray-100 rounded-full gap-1">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 py-3 rounded-full font-semibold text-sm transition-all ${
              type === "expense"
                ? "bg-red-500 text-white shadow-md"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            รายจ่าย (-)
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 py-3 rounded-full font-semibold text-sm transition-all ${
              type === "income"
                ? "bg-green-500 text-white shadow-md"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            รายรับ (+)
          </button>
        </div>

        {/* เลือกหมวดหมู่ */}
        {type === "expense" && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              หมวดหมู่
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 py-2">
              {categories.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className="flex flex-col items-center justify-center group focus:outline-none"
                  >
                    <div
                      className={`relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center transition-all duration-200 ${
                        isSelected
                          ? "scale-110 drop-shadow-md"
                          : "opacity-60 hover:opacity-100 hover:scale-105"
                      }`}
                    >
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

                    <span
                      className={`text-xs mt-2 text-center font-medium transition-colors ${
                        isSelected ? "text-zinc-900 font-bold" : "text-gray-500"
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* จำนวนเงิน */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            จำนวนเงิน
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-5 text-xl font-extrabold text-gray-400 select-none">
              ฿
            </span>
            <input
              type="number"
              step="any"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()} /* 👈 ป้องกันการหมุนลูกกลิ้งเมาส์แล้วเพิ่ม-ลดตัวเลข */
              className="w-full border border-gray-200 rounded-full py-3.5 pl-11 pr-5 focus:ring-2 focus:ring-zinc-900 outline-none bg-gray-50 text-gray-900 font-bold text-base sm:text-2xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* บันทึกช่วยจำ */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            บันทึกช่วยจำ
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-gray-200 rounded-full px-5 py-3.5 focus:ring-2 focus:ring-zinc-900 outline-none bg-gray-50 text-gray-900 text-base"
            placeholder="เช่น ข้าวกะเพราหมูกรอบ, เติมบัตรแรบบิท"
          />
        </div>

        {/* แนบรูปภาพใบเสร็จ */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            แนบรูปภาพใบเสร็จ
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!filePreview ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 hover:border-zinc-900 rounded-2xl py-3.5 px-4 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>เลือกรูปภาพใบเสร็จ</span>
            </button>
          ) : (
            <div className="mt-2 relative inline-block">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-zinc-900 shadow-md bg-gray-100">
                <Image
                  src={filePreview}
                  alt="Preview"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-md transition"
                title="ลบรูปภาพนี้"
              >
                ✕
              </button>
              <p className="text-[11px] text-gray-500 mt-1 font-medium text-center">
                รูปที่เลือกแล้ว
              </p>
            </div>
          )}
        </div>

        {/* ปุ่ม Slide to Submit */}
        <div className="pt-2">
          <div
            ref={sliderTrackRef}
            style={{ touchAction: "none" }}
            className="relative w-full h-16 bg-zinc-900 rounded-full p-1 flex items-center overflow-hidden shadow-lg select-none cursor-pointer"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs sm:text-sm font-semibold tracking-wider text-zinc-400 animate-pulse">
                {loading ? "กำลังบันทึกข้อมูล..." : "slide to save ➔"}
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
  );
}