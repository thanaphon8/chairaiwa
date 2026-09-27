import { NextResponse } from 'next/server';

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

    return NextResponse.json({ success: true, imageUrl: result.imageUrl });
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

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error("API GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}