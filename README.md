# ClassMate AI

**Live:** https://classmate-e3vhrrl9m-wintuners-projects.vercel.app (alias: https://classmate-ai-psi.vercel.app)

## Setup (5 นาที)
1. `cp .env.example .env.local` ใส่ค่า Supabase + `THAILLM_API_KEY` (+ `GEMINI_API_KEY` สำหรับ embeddings) — server เท่านั้น ห้าม NEXT_PUBLIC ห้าม commit `.env.local`
2. Supabase SQL editor → รัน `supabase/schema.sql`
3. `npm install && npm run dev`

## API (ต้อง login ก่อนทุกเส้น ยกเว้นดูโค้ด)
- `POST /api/ingest` form-data `file:PDF` → validate mime/header/EOF/text → chunk+embed
  - ไฟล์เสียตอบ 400 พร้อม reason ไทย
- `POST /api/chat` `{question}` → RAG + guardrail threshold → `{answer, citations}`
  - ไม่เจอตอบ `ไม่พบในเอกสารที่อัปโหลด`
  - **ไม่บันทึกประวัติบทสนทนา** ถาม-ตอบจบใน request เดียว (privacy by design)
- `POST /api/summarize` `{doc_id, pages?, mode}` → `{summary}`
- `POST /api/quiz` `{topic, type, n}` → `{quiz_id, quiz}`
- `DELETE /api/documents?id=` → ลบเอกสารของตัวเอง (chunks ลบตาม)

## Security
- Key อยู่ server env เท่านั้น (`THAILLM_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- ตอบคำถามด้วย ThaiLLM (OpenAI-compatible, default `Typhoon-S-ThaiLLM-8B-Instruct` 128K) ผ่าน `lib/thaillm.ts` ฝั่ง server เท่านั้น
- Embeddings ใช้ Gemini `gemini-embedding-001` ขอ output 768-dim (Matryoshka ตรง schema) จนกว่า ThaiLLM จะมี embeddings endpoint
- Client ใช้ anon key ผ่าน cookie session, Context เก็บแค่ชื่อ/email
- RLS per `user_id`, vector search กรอง `match_user` เสมอ

## Frontend
- หน้าอยู่ที่ `app/` และใช้ layout/เมนูร่วมจาก `components/AppShell.tsx` กับสไตล์ `app/globals.css`
- ใช้ `useAuth()` จาก `components/AuthProvider.tsx` เพื่อแสดงชื่อผู้ใช้
- ห้ามเรียก ThaiLLM/Gemini จาก browser ให้เรียก `/api/*` เท่านั้น
- หน้า `/documents` และ `/status` อ่านข้อมูลจาก Supabase ฝั่ง server

## เช็กลิสต์งาน (7 ข้อ) — อยู่ที่ไหน/ทำไมเป็นแบบนั้น

### 1. Next.js App Router ≥ 4 route
| Route | ไฟล์ | ชนิด |
|---|---|---|
| `/` | `app/page.tsx` | Server (static) |
| `/login` | `app/login/page.tsx` | Client (ฟอร์ม) |
| `/signup` | `app/signup/page.tsx` | Client (ฟอร์ม) |
| `/upload` | `app/upload/page.tsx` | Client (File API) |
| `/chat` | `app/chat/page.tsx` | Client (แชท) |
| `/quiz` | `app/quiz/page.tsx` | Client (ทำข้อสอบ) |
| `/documents` | `app/documents/page.tsx` | Server (SSR) |
| `/status` | `app/status/page.tsx` | Server (SSR) |
API (Route Handler): `POST /api/ingest`, `POST /api/chat`, `POST /api/summarize`, `POST /api/quiz`, `DELETE /api/documents`

### 2. Server vs Client — ทำไมแต่ละไฟล์เป็นแบบนั้น
- **Server (ไม่มี `"use client"`):** `app/page.tsx` (landing static → เร็ว+SEO), `app/documents/page.tsx` (อ่าน Supabase ด้วย cookie+RLS ฝั่ง server ปลอดภัยกว่า), `app/status/page.tsx` (ใช้ `SERVICE_ROLE_KEY` ซึ่งห้ามหลุดไป browser)
- **Client (`"use client"`):** `app/login`, `app/signup` (ฟอร์ม validate + Supabase Auth ฝั่ง browser), `app/chat` (state บทสนทนา+loading), `app/quiz` (state ช้อยส์+คะแนน), `app/upload` (อ่าน `File` + `FormData`), `components/AuthProvider.tsx` (ต้องใช้ `useEffect` อ่าน session), `components/AppShell.tsx` (ต้องใช้ `usePathname` ไฮไลต์เมนู)
- เหตุผลละเอียดอยู่ในคอมเมนต์หัวแต่ละไฟล์

### 3. Data fetching (SSR เจตนา — ไม่ใช่ default เฉยๆ)
- `app/documents/page.tsx` + `app/status/page.tsx` ใส่ `export const dynamic = "force-dynamic"` + `export const revalidate = 0` = **SSR สดทุก request**
- ทำไมไม่ SSG/ISR: `/documents` เป็นข้อมูล per-user (cache รวมจะเห็นของคนอื่น/ข้อมูลเก่าหลังอัปโหลด), `/status` คือ health-check (cache จะบอก "พร้อม" ทั้งที่ DB ล่ม) — เลยต้องสดเท่านั้น

### 4. Mutation ผ่าน Route Handler
- `POST /api/chat` (ไม่บันทึกประวัติ — ตอบแล้วจบ), `POST /api/ingest` (insert documents + chunks, กันชื่อไฟล์ซ้ำด้วย 409), `POST /api/quiz` (insert quizzes), `DELETE /api/documents?id=` (ลบเอกสาร+chunks ของตัวเอง) — ฝั่ง client ยิงด้วย `fetch` จาก `app/chat`, `app/upload`, `app/quiz`, `app/documents` (ปุ่มลบมี confirm + `router.refresh()`)

### 5. Global state ฝั่ง client
- `components/AuthProvider.tsx` = React Context (`createContext` + `useAuth()`) ห่อทั้งแอปใน `app/layout.tsx` แชร์ `email/name/loading` ให้ `AppShell` + ทุกหน้าโดยไม่ prop-drilling เก็บแค่ display info ไม่ถือ key

### 6. ฟอร์ม validate จริง (react-hook-form + zod)
- `app/login/page.tsx` (`loginSchema`: email ต้องเป็นอีเมล + password ห้ามว่าง) และ `app/signup/page.tsx` (`signupSchema`: ชื่อห้ามว่าง/ยาว≤50 + email + password≥6 + confirm ต้องตรงกันด้วย `.refine`) ใช้ `useForm({ resolver: zodResolver(schema) })` + โชว์ error ใต้ช่องแบบเรียลไทม์
- แพ็กเกจ: `react-hook-form`, `zod`, `@hookform/resolvers`

### 7. Responsive + Deploy
- Responsive: `app/globals.css` มี `@media (max-width: 760px)` (grid 3→1 คอลัมน์, header wrap, nav scroll) + `prefers-reduced-motion`
- Deploy: Vercel — URL: https://classmate-e3vhrrl9m-wintuners-projects.vercel.app (alias https://classmate-ai-psi.vercel.app, `vercel --prod` ผ่าน ● Ready) (ตั้ง env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `THAILLM_API_KEY`, `GEMINI_API_KEY` ใน Vercel → Settings → Environment Variables)

## Frontend ที่ทำแล้ว
- สร้างหน้าหลัก ClassMate AI พร้อมทางลัดไปยังอัปโหลดเอกสาร แชทถาม AI และสร้างแบบทดสอบ
- เพิ่มแถบนำทางร่วมทุกหน้า แสดงชื่อผู้ใช้จาก `useAuth()` และรองรับหน้าจอมือถือ
- จัดรูปแบบหน้า `/login`, `/upload`, `/chat`, `/quiz`, `/documents` และ `/status` ให้ใช้รูปแบบ UI เดียวกัน
- หน้า `/login` เข้าสู่ระบบด้วย Supabase Auth พร้อมสถานะกำลังเข้าสู่ระบบและข้อความแจ้งข้อผิดพลาด
- หน้า `/upload` เลือกและส่งไฟล์ PDF ไปยัง `POST /api/ingest` พร้อมแสดงสถานะสำเร็จ/ผิดพลาด
- หน้า `/chat` ส่งคำถามไปยัง `POST /api/chat` (ไม่เก็บประวัติ ถาม-ตอบจบในครั้งเดียว) และแสดงคำตอบกับ citations
- หน้า `/quiz` สร้างแบบทดสอบปรนัย 5 ข้อผ่าน `POST /api/quiz` และแสดงผลลัพธ์จาก API
- หน้า `/documents` แสดงรายการเอกสารจาก Supabase ฝั่ง server พร้อมสถานะกรณียังไม่เข้าสู่ระบบหรือไม่มีเอกสาร
- หน้า `/status` แสดงสถานะ Supabase และจำนวนเอกสาร บทสนทนา และแบบทดสอบ
- เพิ่มสไตล์ส่วนกลางใน `app/globals.css` โดยคำนึงถึงการใช้งานบนมือถือและการลด motion ตามการตั้งค่าของผู้ใช้
