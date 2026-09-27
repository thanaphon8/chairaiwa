import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { Readable } from 'stream';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';

    let date = '';
    let type = '';
    let category = '';
    let amount = 0;
    let note = '';
    let file: File | null = null;

    // 1. ตรวจสอบชนิดข้อมูลที่ส่งมาจากหน้าเว็บ (รองรับทั้ง FormData และ JSON)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      date = (formData.get('date') as string) || '';
      type = (formData.get('type') as string) || '';
      category = (formData.get('category') as string) || '';
      amount = Number(formData.get('amount')) || 0;
      note = (formData.get('note') as string) || '';
      file = formData.get('file') as File | null;
    } else {
      const json = await req.json();
      date = json.date || '';
      type = json.type || '';
      category = json.category || '';
      amount = Number(json.amount) || 0;
      note = json.note || '';
    }

    // 2. ยืนยันตัวตนกับ Google API
    let rawPrivateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    const privateKey = rawPrivateKey.replace(/^"(.*)"$/, '$1').replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
      ],
    });

    let imageUrl = '';

    // 3. ถ้ามีการแนบรูปภาพมา ให้อัปโหลดลง Google Drive
    if (file && file.size > 0) {
      const drive = google.drive({ version: 'v3', auth });
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);

      const driveResponse = await drive.files.create({
        requestBody: {
          name: `receipt_${Date.now()}_${file.name}`,
          parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : [],
        },
        media: {
          mimeType: file.type,
          body: stream,
        },
        fields: 'id, webViewLink',
      });

      const fileId = driveResponse.data.id;
      imageUrl = driveResponse.data.webViewLink || '';

      // เปิดสิทธิ์ให้ทุกคนที่มีลิงก์สามารถเปิดดูรูปใบเสร็จได้ (ไม่ติด Permission Denied)
      if (fileId) {
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      }
    }

    // 4. บันทึกข้อมูลลง Google Sheet (Column A ถึง F)
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'Sheet1!A:F',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [date, type, category, amount, note, imageUrl]
        ],
      },
    });

    return NextResponse.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}