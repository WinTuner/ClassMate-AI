# Final Project Proposal — ClassMate AI
กลุ่ม: [ชื่อกลุ่ม] · สมาชิก: [ชื่อ-รหัส] , [ชื่อ-รหัส]

## 1. แอปนี้ทำอะไร ใครใช้
ผู้ช่วยเรียนจากเอกสารจริงสำหรับนักศึกษา — อัปโหลดสไลด์/PDF วิชาที่เรียน แล้วถาม AI
ให้ตอบจากเนื้อหาในเอกสารพร้อมแหล่งอ้างอิง (เลขหน้า) และสร้างแบบทดสอบปรนัยทบทวน
แก้ปัญหาอ่านสไลด์กองโตแล้วจับประเด็นไม่ได้ และ AI ทั่วไปตอบนอกเอกสารมั่ว

## 2. หน้าที่จะมี (อย่างน้อย 4 route)
| Route | หน้านี้ทำอะไร |
|---|---|
| / | หน้าแรก — แนะนำแอป + ทางลัดไปอัปโหลด/ถาม AI/ทำแบบทดสอบ |
| /upload | เลือกไฟล์ PDF จากเครื่อง ส่งไปประมวลผล (validate ชนิดไฟล์ก่อนบันทึก) |
| /chat | ถามคำถามจากเอกสาร แสดงคำตอบ + citations (ไม่เก็บประวัติ ถาม-ตอบจบในครั้งเดียว) |
| /quiz | ใส่หัวข้อที่อยากทบทวน ได้แบบทดสอบปรนัย 5 ข้อ กดตอบแล้วดูเฉลย+เหตุผลเป็นข้อๆ |
| /documents | รายการเอกสารที่อัปโหลด (20 รายการล่าสุด) |
| /status | สถานะระบบ — เชื่อม Supabase ได้มั้ย + จำนวนเอกสาร/บทสนทนา/แบบทดสอบ |
| /login · /signup | เข้าสู่ระบบ / สมัครสมาชิก (Supabase Auth) |

## 3. Server หรือ Client — และทำไม
| ส่วนของแอป | Server / Client | เหตุผล |
|---|---|---|
| / หน้าแรก | Server | เนื้อหา static ล้วน ไม่มี state/fetch — render บน server เร็ว + SEO ดี |
| /documents รายการเอกสาร | Server | อ่าน Supabase ด้วย cookie session + RLS ฝั่ง server ปลอดภัยกว่า และข้อมูลเป็นของแต่ละ user ห้าม cache รวม |
| /status สถานะระบบ | Server | ใช้ `SERVICE_ROLE_KEY` ซึ่งห้ามหลุดไป browser + เป็น health-check ต้องสดทุกครั้ง (เลยใช้ SSR `force-dynamic` ไม่ใช้ SSG/ISR) |
| ฟอร์ม /login · /signup | Client | react-hook-form + zod ต้องใช้ state/event ฝั่ง browser และเรียก Supabase Auth จาก browser |
| /chat หน้าแชท | Client | interactive ทั้งหมด (พิมพ์คำถาม โชว์ loading/error) + ยิง `POST /api/chat` (ไม่เก็บประวัติ) |
| /quiz ทำข้อสอบ | Client | state ช้อยส์/คะแนน/เฉลยเป็นข้อๆ อยู่ฝั่ง browser ล้วน + ยิง `POST /api/quiz` |
| /upload อัปโหลด | Client | ต้องอ่าน `File` จาก `<input type=file>` + ส่ง `FormData` ไป `POST /api/ingest` |
| AuthProvider (global state) | Client (Context) | ต้องใช้ `useEffect` อ่าน session ใน browser แล้วแชร์ชื่อผู้ใช้ผ่าน `useAuth()` ให้ทุกหน้าโดยไม่ prop-drilling |
| AppShell เมนูร่วม | Client | ต้องใช้ `usePathname` ไฮไลต์เมนู active + อ่านชื่อจาก `useAuth()` แบบทันที |
| ตัวบันทึก/ค้นข้อมูล (chat/ingest/quiz/documents) | Route Handler (`/api/*`) | โค้ดที่แตะ DB + เรียก ThaiLLM/Gemini (ใช้ secret key) ต้องอยู่ฝั่ง server เท่านั้น |

## 4. ข้อมูลมาจากไหน + จุดที่ต้องเขียนข้อมูลกลับ
- แหล่งข้อมูล: Supabase (ตาราง `documents`, `chunks` + vector search `match_chunks`, `quizzes`, `users`) — ไฟล์ PDF ถูก chunk + ฝัง embeddings (Gemini `gemini-embedding-001` 768-dim) แล้วตอบด้วย ThaiLLM แบบ RAG · ไม่บันทึกประวัติบทสนทนา (privacy) · หน้า `/documents` ใช้ SSR สดทุก request เพราะข้อมูล per-user ห้าม cache รวม
- mutation (Route Handler) ที่จุดไหน: `POST /api/ingest` (บันทึก documents + chunks), `POST /api/chat` (ไม่บันทึก — ตอบแล้วจบ), `POST /api/quiz` (บันทึก quizzes), `DELETE /api/documents?id=` (ลบเอกสาร+chunks ของตัวเอง)

## 5. แบ่งงานกันยังไง
- นัท (backend): ฝั่ง server — `/documents`, `/status`, Route Handlers (`chat/ingest/quiz/documents`), RAG + Supabase schema, deploy Vercel
- บอม (frontend): ฝั่ง client — `/login`+`/signup` (RHF+zod schema), `/chat`+`/quiz`+`/upload`, AuthProvider Context, responsive CSS
