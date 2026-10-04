# ClassMate AI — backend ready, frontend กากๆ

## Setup (5 นาที)
1. `cp .env.example .env.local` ใส่ค่า Supabase + `GEMINI_API_KEY` (server เท่านั้น ห้าม NEXT_PUBLIC)
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
- Key อยู่ server env เท่านั้น (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- Client ใช้ anon key ผ่าน cookie session, Context เก็บแค่ชื่อ/email
- RLS per `user_id`, vector search กรอง `match_user` เสมอ

## ให้เพื่อน frontend
- หน้ากากๆ อยู่ที่ `app/login|upload|chat|quiz` เขียนทับได้เลย
- ใช้ `useAuth()` จาก `components/AuthProvider.tsx` โชว์ชื่อ
- ห้ามเรียก Gemini ตรง ให้ยิง `/api/*` เท่านั้น
