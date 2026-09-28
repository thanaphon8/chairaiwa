import { NextResponse } from 'next/server';

// 💡 Helper Function: แปลง Google Drive Link ให้เป็น Direct Link สำหรับแสดงรูปภาพ
function formatGoogleDriveUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;

  // ตรวจจับ File ID ของ Google Drive จาก URL รูปแบบต่างๆ
  const driveRegex = /(?:id=|\/d\/|\/file\/d\/)([a-zA-Z0-9_-]+)/;
  const match = url.match(driveRegex);

  if (match && match[1]) {
    // ใช้ CDN ของ Google (lh3.googleusercontent.com) เพื่อโหลดรูปภาพได้รวดเร็วและไม่ติดปัญหาการแสดงผล
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }

  return url; // หากเป็น URL ทั่วไปอยู่แล้วให้ส่งกลับค่าเดิม
}

// 1. POST: รับข้อมูลจากหน้าเว็บ แล้วส่งไปบันทึกลง Google Sheet / Drive
export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let date = '';
    let type = '';
    let category = '';
    let amount = 0;
    let note = '';
    let fileBase64 = '';
    let fileName = '';
    let fileType = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      date = (formData.get('date') as string) || '';
      type = (formData.get('type') as string) || '';
      category = (formData.get('category') as string) || '';
      amount = Number(formData.get('amount')) || 0;
      note = (formData.get('note') as string) || '';

      const file = formData.get('file') as File | null;
      if (file && file.size > 0) {
        fileName = file.name;
        fileType = file.type;
        const arrayBuffer = await file.arrayBuffer();
        fileBase64 = Buffer.from(arrayBuffer).toString('base64');
      }
    } else {
      const json = await req.json();
      date = json.date || '';
      type = json.type || '';
      category = json.category || '';
      amount = Number(json.amount) || 0;
      note = json.note || '';
    }

    const GAS_WEB_APP_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';

    if (!GAS_WEB_APP_URL) {
      throw new Error('ยังไม่ได้ระบุ GOOGLE_APPS_SCRIPT_URL ในไฟล์ .env.local');
    }

    // ส่งข้อมูลไปยัง Google Apps Script แบบ text/plain
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      redirect: 'follow',
      body: JSON.stringify({
        date,
        type,
        category,
        amount,
        note,
        fileBase64,
        fileName,
        fileType,
      }),
    });

    const responseText = await response.text();

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Google Apps Script Error Response:", responseText);
      throw new Error("Google Apps Script ตอบกลับข้อมูลที่ไม่ถูกต้อง (โปรดตรวจสอบการ Deploy สิทธิ์ 'Anyone')");
    }

    if (!result.success) {
      throw new Error(result.error || 'บันทึกข้อมูลไม่สำเร็จ');
    }

    // แปลง URL รูปภาพก่อนส่งกลับหน้าบ้าน
    const formattedImageUrl = formatGoogleDriveUrl(result.imageUrl || result.image || result.fileUrl);

    return NextResponse.json({ success: true, imageUrl: formattedImageUrl });
  } catch (error: any) {
    console.error("API POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 2. GET: ดึงรายการทั้งหมดจาก Google Sheet กลับมาแสดงผลบนหน้าเว็บ
export async function GET() {
  try {
    const GAS_WEB_APP_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';

    if (!GAS_WEB_APP_URL) {
      throw new Error('ยังไม่ได้ระบุ GOOGLE_APPS_SCRIPT_URL ในไฟล์ .env.local');
    }

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store', // เพื่อให้ได้ข้อมูลล่าสุดเสมอ ไม่จำแคชเก่า
    });

    const responseText = await response.text();

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error("Google Apps Script Error Response:", responseText);
      throw new Error("Google Apps Script ตอบกลับข้อมูลที่ไม่ถูกต้อง");
    }

    if (!result.success) {
      throw new Error(result.error || 'ดึงข้อมูลไม่สำเร็จ');
    }

    // 🔄 แปลง URL รูปภาพของทุกรายการใน data ให้เป็น Direct Link
    const formattedData = Array.isArray(result.data)
      ? result.data.map((item: any) => {
          const rawUrl = item.imageUrl || item.image || item.fileUrl || item.file_url || null;
          return {
            ...item,
            imageUrl: formatGoogleDriveUrl(rawUrl),
          };
        })
      : [];

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error: any) {
    console.error("API GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}