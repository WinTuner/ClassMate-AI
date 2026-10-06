# ClassMate AI

## Setup (5 นาที)
1. `cp .env.example .env.local` ใส่ค่า Supabase + `THAILLM_API_KEY` (+ `GEMINI_API_KEY` สำหรับ embeddings) — server เท่านั้น ห้าม NEXT_PUBLIC ห้าม commit `.env.local`
2. Supabase SQL editor → รัน `supabase/schema.sql`
3. `npm install && npm run dev`

## API (ต้อง login ก่อนทุกเส้น ยกเว้นดูโค้ด)
- `POST /api/ingest` form-data `file:PDF` → validate mime/header/EOF/text → chunk+embed
  - ไฟล์เสียตอบ 400 พร้อม reason ไทย
- `POST /api/chat` `{question, conversation_id?}` → RAG + guardrail threshold → `{answer, citations, conversation_id}`
  - ไม่เจอตอบ `ไม่พบในเอกสารที่อัปโหลด`
- `POST /api/summarize` `{doc_id, pages?, mode}` → `{summary}`
- `POST /api/quiz` `{topic, type, n}` → `{quiz_id, quiz}`
- `GET /api/history` → 20 บทสนทนาล่าสุด + messages
- `DELETE /api/history?id=` → ลบบทสนทนา

## Security
- Key อยู่ server env เท่านั้น (`THAILLM_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- ตอบคำถามด้วย ThaiLLM (OpenAI-compatible, default `Typhoon-S-ThaiLLM-8B-Instruct` 128K) ผ่าน `lib/thaillm.ts` ฝั่ง server เท่านั้น
- Embeddings ยังใช้ Gemini `text-embedding-004` (768-dim ตรง schema) จนกว่า ThaiLLM จะมี embeddings endpoint
- Client ใช้ anon key ผ่าน cookie session, Context เก็บแค่ชื่อ/email
- RLS per `user_id`, vector search กรอง `match_user` เสมอ

## Frontend
- หน้าอยู่ที่ `app/` และใช้ layout/เมนูร่วมจาก `components/AppShell.tsx` กับสไตล์ `app/globals.css`
- ใช้ `useAuth()` จาก `components/AuthProvider.tsx` เพื่อแสดงชื่อผู้ใช้
- ห้ามเรียก ThaiLLM/Gemini จาก browser ให้เรียก `/api/*` เท่านั้น
- หน้า `/documents` และ `/status` อ่านข้อมูลจาก Supabase ฝั่ง server

## Frontend ที่ทำแล้ว
- สร้างหน้าหลัก ClassMate AI พร้อมทางลัดไปยังอัปโหลดเอกสาร แชทถาม AI และสร้างแบบทดสอบ
- เพิ่มแถบนำทางร่วมทุกหน้า แสดงชื่อผู้ใช้จาก `useAuth()` และรองรับหน้าจอมือถือ
- จัดรูปแบบหน้า `/login`, `/upload`, `/chat`, `/quiz`, `/documents` และ `/status` ให้ใช้รูปแบบ UI เดียวกัน
- หน้า `/login` เข้าสู่ระบบด้วย Supabase Auth พร้อมสถานะกำลังเข้าสู่ระบบและข้อความแจ้งข้อผิดพลาด
- หน้า `/upload` เลือกและส่งไฟล์ PDF ไปยัง `POST /api/ingest` พร้อมแสดงสถานะสำเร็จ/ผิดพลาด
- หน้า `/chat` ส่งคำถามไปยัง `POST /api/chat` ต่อบทสนทนาด้วย `conversation_id` และแสดงคำตอบกับ citations
- หน้า `/quiz` สร้างแบบทดสอบปรนัย 5 ข้อผ่าน `POST /api/quiz` และแสดงผลลัพธ์จาก API
- หน้า `/documents` แสดงรายการเอกสารจาก Supabase ฝั่ง server พร้อมสถานะกรณียังไม่เข้าสู่ระบบหรือไม่มีเอกสาร
- หน้า `/status` แสดงสถานะ Supabase และจำนวนเอกสาร บทสนทนา และแบบทดสอบ
- เพิ่มสไตล์ส่วนกลางใน `app/globals.css` โดยคำนึงถึงการใช้งานบนมือถือและการลด motion ตามการตั้งค่าของผู้ใช้
