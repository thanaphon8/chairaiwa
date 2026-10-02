"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

type CategoryOption = {
  id: string;
  label: string;
  image: string;
};

// รายการที่เพิ่งบันทึกสำเร็จ (ส่งให้หน้าแม่เอาไปแสดงทันที ไม่ต้องรอดึงข้อมูลทั้งชีตใหม่)
export type NewTransaction = {
  type: "income" | "expense";
  amount: number;
  category: string;
  note: string;
  imageUrl: string | null;
  date: string;
};

type AddTransactionFormProps = {
  categories?: CategoryOption[];
  onSuccess: (tx: NewTransaction) => void | Promise<void>;
};

const PRESETS_BY_CATEGORY: Record<string, string[]> = {
  อาหาร: [
    "กะเพราหมูกรอบ",
    "ข้าวมันไก่",
    "ก๋วยเตี๋ยว",
    "ข้าวไข่เจียว",
    "กาแฟสด",
    "ชาไทย",
    "หมูกระทะ",
    "ของกิน 7-Eleven",
  ],
  เดินทาง: [
    "ไปทำงาน",
    "กลับบ้าน",
    "ค่าน้ำมัน",
    "ค่าทางด่วน",
    "เติมบัตร BTS/MRT",
    "ค่า Grab/Bolt",
    "ค่าวินมอเตอร์ไซค์",
    "ค่าจอดรถ",
  ],
  ช้อปปิ้ง: [
    "เสื้อผ้า",
    "รองเท้า",
    "ของใช้ในบ้าน",
    "เครื่องสำอาง",
    "ของ Shopee/Lazada",
    "หนังสือ",
  ],
  ที่พัก: ["ค่าเช่าห้อง", "ค่าน้ำ", "ค่าไฟ", "ค่าส่วนกลาง", "ค่าแก๊ส"],
  ความบันเทิง: [
    "ค่าอินเทอร์เน็ต",
    "ตั๋วหนัง",
    "เติมเกม",
    "Netflix / Spotify",
    "สังสรรค์ / ปาร์ตี้",
    "คอนเสิร์ต",
    "บอร์ดเกม",
  ],
  อื่นๆ: [
    "ทำบุญ / บริจาค",
    "ซื้อของให้พ่อแม่",
    "ค่ารักษาพยาบาล",
    "ค่ายา",
    "ฝากธนาคาร",
  ],
};

// ย่อรูปก่อนอัพโหลด (กันไฟล์ใหญ่เกินลิมิต Vercel 4.5MB / Apps Script)
async function compressImage(
  file: File,
  maxSize = 1600,
  quality = 0.8
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file; // ถ้าย่อไม่ได้ ใช้ไฟล์เดิม
  }
}

// ================= อ่านจำนวนเงินจากสลีป (OCR ในเบราว์เซอร์) =================
// ใช้ tesseract.js: ประมวลผลบนเครื่องผู้ใช้ รูปไม่ถูกส่งไปที่ไหนเพื่อการอ่านนี้
// ครั้งแรกจะดาวน์โหลดโมเดลภาษา (ไม่กี่ MB) แล้วเบราว์เซอร์จำไว้ ครั้งต่อไปเร็วขึ้น

let ocrWorkerPromise: Promise<import("tesseract.js").Worker> | null = null;

async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const { createWorker, PSM } = await import("tesseract.js");
      const worker = await createWorker("eng");
      // สลีปมีข้อความกระจายหลายจุด โหมด sparse อ่านได้ดีกว่า
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      return worker;
    })().catch((err) => {
      ocrWorkerPromise = null; // โหลดไม่สำเร็จ ให้ลองใหม่ได้ครั้งหน้า
      throw err;
    });
  }
  return ocrWorkerPromise;
}

// หาจำนวนเงินจากข้อความที่อ่านได้
// สลีปโอนเงินแสดงจำนวนเงินเป็นตัวเลข 2 ทศนิยม เช่น 1,000.00
function extractAmountFromText(text: string): number | null {
  const numberRe = /(\d{1,3}(?:,\d{3})+|\d+)\.\d{2}(?!\d)/g;
  const keywordRe = /(amount|baht|thb|บาท|จำนวน)/i;

  let keywordHit: number | null = null;
  const all: number[] = [];

  for (const line of text.split(/\r?\n/)) {
    const matches = line.match(numberRe);
    if (!matches) continue;
    for (const m of matches) {
      const n = parseFloat(m.replace(/,/g, ""));
      if (!isFinite(n) || n <= 0) continue; // ข้ามค่าธรรมเนียม 0.00
      all.push(n);
      if (keywordHit === null && keywordRe.test(line)) keywordHit = n;
    }
  }

  if (keywordHit !== null) return keywordHit; // บรรทัดที่มีคำว่า จำนวน/Amount/THB/Baht
  if (all.length > 0) return Math.max(...all); // ไม่เจอคำสำคัญ ใช้ค่าที่มากที่สุด
  return null;
}

async function readAmountFromImage(file: File): Promise<number | null> {
  // ย่อรูปใหญ่ๆ ก่อน (อ่านเร็วขึ้น กินเมมโมรี่น้อยลง บนมือถือ)
  const prepared = await compressImage(file, 1800, 0.92);
  const worker = await getOcrWorker();

  const result = await Promise.race([
    worker.recognize(prepared),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("OCR timeout")), 45000)
    ),
  ]);

  return extractAmountFromText(result.data.text || "");
}

const formatOcrAmount = (n: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(2);

export default function AddTransactionForm({
  categories = [],
  onSuccess,
}: AddTransactionFormProps) {
  // Form State
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>(categories[0]?.id || "อาหาร");
  const [note, setNote] = useState<string>("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // สถานะการอ่านจำนวนเงินจากสลีป
  const [ocrStatus, setOcrStatus] = useState<
    "idle" | "reading" | "done" | "fail"
  >("idle");
  const [ocrAmount, setOcrAmount] = useState<number | null>(null);
  const ocrTokenRef = useRef<number>(0); // กันผลลัพธ์ของรูปเก่ามาทับ
  const autoFilledRef = useRef<boolean>(false); // จำนวนเงินปัจจุบันมาจาก OCR หรือไม่

  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.id === category)) {
      setCategory(categories[0].id);
    }
  }, [categories, category]);

  const amountRef = useRef<string>("");
  amountRef.current = amount;

  const noteRef = useRef<string>("");
  noteRef.current = note;

  const [showNotePresets, setShowNotePresets] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const submittingRef = useRef<boolean>(false); // กันกดซ้ำ

  const [sliderPosition, setSliderPosition] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const sliderTrackRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef<number>(0);
  const currentSliderPosRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setFilePreview(objectUrl);
      runOcr(file);
    }
  };

  // อ่านจำนวนเงินจากรูป แล้วใส่ช่องจำนวนเงินให้ (เฉพาะตอนช่องว่าง หรือค่าเดิมมาจาก OCR)
  // ไม่เขียนทับตัวเลขที่ผู้ใช้พิมพ์เอง
  const runOcr = async (file: File) => {
    const token = ++ocrTokenRef.current;
    setOcrStatus("reading");

    try {
      const value = await readAmountFromImage(file);
      if (token !== ocrTokenRef.current) return; // ผู้ใช้เปลี่ยน/ลบรูปไปแล้ว

      if (value === null) {
        setOcrStatus("fail");
        return;
      }

      if (amountRef.current.trim() === "" || autoFilledRef.current) {
        setAmount(formatOcrAmount(value));
        autoFilledRef.current = true;
        setOcrAmount(value);
        setOcrStatus("done");
      } else {
        setOcrStatus("idle"); // ผู้ใช้กรอกเองไว้แล้ว ไม่ยุ่ง
      }
    } catch (err) {
      console.error("OCR error:", err);
      if (token === ocrTokenRef.current) setOcrStatus("fail");
    }
  };

  const handleRemoveFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setImageFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // ยกเลิกการอ่านที่ค้างอยู่ และล้างตัวเลขที่ OCR ใส่ให้ (ถ้าผู้ใช้ยังไม่ได้แก้เอง)
    ocrTokenRef.current++;
    setOcrStatus("idle");
    setOcrAmount(null);
    if (autoFilledRef.current) {
      setAmount("");
      autoFilledRef.current = false;
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    val = val.replace(/[^0-9.,]/g, "");
    autoFilledRef.current = false; // ผู้ใช้แก้เอง -> ถือเป็นค่าของผู้ใช้
    setAmount(val);
  };

  const handleSelectPreset = (preset: string) => {
    setNote(preset);
    noteRef.current = preset;
  };

  const resetSlider = () => {
    setSliderPosition(0);
    currentSliderPosRef.current = 0;
  };

  const submitData = async () => {
    if (submittingRef.current) return;

    const currentAmountStr = (amountRef.current || "")
      .replace(/,/g, ".")
      .trim();
    const numericAmount = parseFloat(currentAmountStr);
    const currentNote = noteRef.current || "";

    if (!currentAmountStr || isNaN(numericAmount) || numericAmount <= 0) {
      alert("กรุณาระบุจำนวนเงินให้ถูกต้อง (ต้องเป็นตัวเลขที่มากกว่า 0)");
      resetSlider();
      amountInputRef.current?.focus();
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

    submittingRef.current = true;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("date", formattedDateStr);
      formData.append("type", type === "income" ? "รายรับ" : "รายจ่าย");
      formData.append("category", txCategory);
      formData.append("amount", String(numericAmount));
      formData.append("note", currentNote);

      if (imageFile) {
        const compressed = await compressImage(imageFile);
        formData.append("file", compressed, compressed.name);
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        body: formData,
      });

      let result: { success: boolean; error?: string; imageUrl?: string | null };
      try {
        result = await res.json();
      } catch {
        alert(
          `เซิร์ฟเวอร์ตอบกลับผิดรูปแบบ (HTTP ${res.status}) อาจเป็นเพราะไฟล์รูปใหญ่เกินไป`
        );
        return;
      }

      if (!result.success) {
        alert("เกิดข้อผิดพลาดในการบันทึก: " + result.error);
        return;
      }

      await onSuccess({
        type,
        amount: numericAmount,
        category: txCategory,
        note: currentNote,
        imageUrl: result.imageUrl ?? null,
        date: formattedDateStr,
      });

      setAmount("");
      setNote("");
      noteRef.current = "";
      setShowNotePresets(false);
      handleRemoveFile();
    } catch (error) {
      console.error(error);
      alert("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      submittingRef.current = false;
      setLoading(false);
      resetSlider();
    }
  };

  // ✅ FIX หลัก: เก็บ submitData เวอร์ชันล่าสุดไว้ใน ref
  // เดิม handleEnd ถูก memo ด้วย [getMaxDrag] เท่านั้น ทำให้เรียก submitData
  // ของ render แรกเสมอ -> imageFile = null, type = "expense", category = ค่าเริ่มต้น
  // (รูปจึงไม่ถูกส่งไปตอน slide to save)
  const submitRef = useRef(submitData);
  submitRef.current = submitData;

  const getMaxDrag = useCallback(() => {
    if (!sliderTrackRef.current) return 0;
    const trackWidth = sliderTrackRef.current.clientWidth;
    const handleWidth = 56;
    const max = trackWidth - handleWidth - 8;
    return max > 0 ? max : 0;
  }, []);

  const handleStart = (clientX: number) => {
    if (loading) return;
    setIsDragging(true);
    dragStartXRef.current = clientX - currentSliderPosRef.current;
  };

  const handleMove = useCallback(
    (clientX: number) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        const maxDrag = getMaxDrag();
        let newX = clientX - dragStartXRef.current;
        if (newX < 0) newX = 0;
        if (newX > maxDrag) newX = maxDrag;
        currentSliderPosRef.current = newX;
        setSliderPosition(newX);
      });
    },
    [getMaxDrag]
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    const maxDrag = getMaxDrag();

    if (maxDrag > 0 && currentSliderPosRef.current >= maxDrag * 0.85) {
      setSliderPosition(maxDrag);
      currentSliderPosRef.current = maxDrag;
      submitRef.current(); // ใช้เวอร์ชันล่าสุดเสมอ
    } else {
      resetSlider();
    }
  }, [getMaxDrag]);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onTouchEnd = () => handleEnd();

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDragging, handleMove, handleEnd]);

  const currentCategoryObj = categories.find((c) => c.id === category);
  const currentCategoryLabel = currentCategoryObj?.label || category;

  const activePresets =
    type === "expense"
      ? PRESETS_BY_CATEGORY[currentCategoryLabel] ||
        PRESETS_BY_CATEGORY[category] ||
        []
      : ["เงินเดือน", "กดเงินสด", "โบนัส", "ขายของ", "ได้รับคืน", "ดอกเบี้ย", "อื่นๆ"];

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5C38C9] focus-visible:ring-offset-2";

  return (
    <div className="-mx-4 bg-white px-5 py-6 sm:mx-0 sm:rounded-3xl sm:border sm:border-gray-100 sm:p-8 sm:shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-900 sm:text-xl">
        เพิ่มรายการใหม่
      </h3>

      <div className="mt-5 space-y-6">
        {/* สลับ รายจ่าย / รายรับ */}
        <div
          role="tablist"
          aria-label="ประเภทรายการ"
          className="grid grid-cols-2 gap-1 rounded-full bg-zinc-100 p-1"
        >
          {(
            [
              { value: "expense", label: "รายจ่าย" },
              { value: "income", label: "รายรับ" },
            ] as const
          ).map((opt) => {
            const active = type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setType(opt.value)}
                className={`h-11 rounded-full text-sm font-semibold transition ${focusRing} ${
                  active
                    ? "bg-[#5C38C9] text-white shadow-sm"
                    : "text-zinc-600 active:bg-zinc-200 lg:hover:bg-zinc-200"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* เลือกหมวดหมู่ */}
        {type === "expense" && (
          <div>
            <p className="mb-2.5 text-sm font-medium text-zinc-700">หมวดหมู่</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3">
              {categories?.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 transition ${focusRing} ${
                      isSelected
                        ? "bg-[#5C38C9]/10 ring-2 ring-inset ring-[#5C38C9]"
                        : "bg-zinc-50 active:bg-zinc-100 lg:hover:bg-zinc-100"
                    }`}
                  >
                    <div className="relative h-10 w-10 sm:h-12 sm:w-12">
                      <Image
                        src={cat.image}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-contain"
                      />
                    </div>
                    <span
                      className={`line-clamp-2 text-center text-xs leading-snug ${
                        isSelected
                          ? "font-semibold text-[#5C38C9]"
                          : "font-medium text-zinc-600"
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
          <label
            htmlFor="tx-amount"
            className="mb-2.5 block text-sm font-medium text-zinc-700"
          >
            จำนวนเงิน
          </label>
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-5 text-2xl font-light text-[#5C38C9]">
              ฿
            </span>
            <input
              id="tx-amount"
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              className="h-16 w-full rounded-2xl bg-zinc-100 pl-12 pr-16 text-3xl font-semibold tabular-nums text-zinc-900 outline-none transition placeholder:font-normal placeholder:text-zinc-300 focus:bg-white focus:ring-2 focus:ring-[#5C38C9]"
              placeholder="0.00"
              required
            />
            <span className="pointer-events-none absolute right-5 text-sm font-medium text-zinc-400">
              THB
            </span>
          </div>
        </div>

        {/* บันทึกช่วยจำ + ตัวเลือกด่วน */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <label
              htmlFor="tx-note"
              className="text-sm font-medium text-zinc-700"
            >
              บันทึกช่วยจำ
            </label>
            <button
              type="button"
              onClick={() => setShowNotePresets((prev) => !prev)}
              className={`rounded-full px-2 py-1 text-sm font-medium text-[#5C38C9] ${focusRing}`}
            >
              {showNotePresets ? "ซ่อนตัวเลือกด่วน" : "ตัวเลือกด่วน"}
            </button>
          </div>

          <input
            id="tx-note"
            type="text"
            value={note}
            onFocus={() => setShowNotePresets(true)}
            onChange={(e) => {
              setNote(e.target.value);
              noteRef.current = e.target.value;
            }}
            className="h-12 w-full rounded-full bg-zinc-100 px-5 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:bg-white focus:ring-2 focus:ring-[#5C38C9]"
            placeholder="เช่น ข้าวกะเพราหมูกรอบ"
          />

          <div
            className={`grid overflow-hidden transition-all duration-300 ease-out ${
              showNotePresets && activePresets.length > 0
                ? "mt-3 grid-rows-[1fr] opacity-100"
                : "mt-0 grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="min-h-0">
              <div className="flex flex-wrap gap-2">
                {activePresets.map((preset) => {
                  const isSelected = note === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`h-9 rounded-full px-3.5 text-sm font-medium transition ${focusRing} ${
                        isSelected
                          ? "bg-[#5C38C9] text-white"
                          : "bg-zinc-100 text-zinc-700 active:bg-zinc-200 lg:hover:bg-zinc-200"
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* แนบรูปใบเสร็จ */}
        <div>
          <p className="mb-2.5 text-sm font-medium text-zinc-700">
            แนบรูปใบเสร็จ
          </p>

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
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 text-sm font-medium text-zinc-600 transition active:bg-zinc-50 ${focusRing}`}
            >
              <svg
                className="h-5 w-5 text-[#5C38C9]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              เลือกรูปใบเสร็จ
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-zinc-100 p-2.5">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-200">
                <Image
                  src={filePreview}
                  alt="ตัวอย่างรูปใบเสร็จ"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">
                  {imageFile?.name || "รูปใบเสร็จ"}
                </p>
                <p className="text-xs text-zinc-500">แนบรูปแล้ว</p>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className={`h-10 shrink-0 rounded-full px-4 text-sm font-medium text-rose-600 active:bg-rose-50 ${focusRing}`}
              >
                ลบ
              </button>
            </div>
          )}

          {ocrStatus !== "idle" && (
            <p
              role="status"
              className={`mt-2.5 flex items-center gap-2 text-xs ${
                ocrStatus === "done" ? "text-emerald-700" : "text-zinc-500"
              }`}
            >
              {ocrStatus === "reading" && (
                <>
                  <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[#5C38C9] border-t-transparent" />
                  กำลังอ่านจำนวนเงินจากรูป...
                </>
              )}
              {ocrStatus === "done" && ocrAmount !== null && (
                <>
                  ใส่จำนวนเงิน ฿
                  {ocrAmount.toLocaleString("th-TH", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  ให้แล้ว กรุณาตรวจสอบก่อนบันทึก
                </>
              )}
              {ocrStatus === "fail" &&
                "อ่านจำนวนเงินจากรูปไม่ได้ กรอกเองได้เลย"}
            </p>
          )}
        </div>

        {/* เลื่อนเพื่อบันทึก */}
        <div className="pt-1">
          <div
            ref={sliderTrackRef}
            style={{ touchAction: "none" }}
            className="relative flex h-16 w-full cursor-pointer select-none items-center overflow-hidden rounded-full bg-[#5C38C9] p-1 shadow-lg shadow-[#5C38C9]/30"
          >
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium text-white/85">
                {loading ? "กำลังบันทึกข้อมูล..." : "เลื่อนเพื่อบันทึก"}
              </span>
            </div>

            <div
              className="pointer-events-none absolute bottom-0 left-0 top-0 rounded-full bg-white/15"
              style={{ width: `${sliderPosition + 60}px` }}
            />

            <div
              onMouseDown={(e) => handleStart(e.clientX)}
              onTouchStart={(e) => handleStart(e.touches[0].clientX)}
              className={`relative z-10 flex h-14 w-14 cursor-grab items-center justify-center rounded-full bg-white shadow-md will-change-transform active:cursor-grabbing ${
                isDragging ? "" : "transition-transform duration-300 ease-out"
              }`}
              style={{ transform: `translate3d(${sliderPosition}px, 0, 0)` }}
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#5C38C9] border-t-transparent" />
              ) : (
                <span className="text-xl font-black text-[#5C38C9]">➔</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}