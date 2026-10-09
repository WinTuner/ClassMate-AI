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
- Key อยู่ server env เท่านั้น (`THAILLM_API_KEY`) — ลบ `GEMINI_API_KEY`/`SUPABASE_SERVICE_ROLE_KEY` ออกแล้ว (ไม่ใช้ embeddings/DB ฝั่ง server)
- ตอบคำถามด้วย ThaiLLM (OpenAI-compatible, default `Typhoon-S-ThaiLLM-8B-Instruct` 128K) ผ่าน `lib/thaillm.ts` ฝั่ง server เท่านั้น
- Client ใช้ anon key ผ่าน cookie session เฉพาะ Auth, Context เก็บแค่ชื่อ/email
- server ไม่บันทึกไฟล์ ประวัติแชท หรือผลสอบ — มีแค่บัญชี Auth ไว้กันยิง API

## Privacy (local-first)
- PDF ถูกอ่าน (PDF.js) แตกข้อความ ตัดชิ้น (`lib/local-rag.ts`) และค้น TF-IDF (`searchLocal`) ใน browser ทั้งหมด
- คลังเอกสารเก็บใน IndexedDB ของเครื่อง (`lib/local-docs.ts`) — ไม่เคยส่งไฟล์ไป server
- server (`/api/chat|quiz|summarize`) รับแค่ชิ้นที่ค้นเจอ + คำถาม ไปถาม ThaiLLM แล้วทิ้งทันที ไม่ insert อะไรเลย
- Supabase ใช้แค่ Auth (กันคนนอกยิง API) — ไม่มีตารางข้อมูลแอปแล้ว
- ห้ามเรียก ThaiLLM จาก browser ให้เรียก `/api/*` เท่านั้น (key อยู่ server)

## เช็กลิสต์งาน (7 ข้อ) — อยู่ที่ไหน/ทำไมเป็นแบบนั้น

### 1. Next.js App Router ≥ 4 route
| Route | ไฟล์ | ชนิด |
|---|---|---|
| `/` | `app/page.tsx` | Server (static) |
| `/login` | `app/login/page.tsx` | Client (ฟอร์ม) |
| `/signup` | `app/signup/page.tsx` | Client (ฟอร์ม) |
| `/upload` | `app/upload/page.tsx` | Client (PDF.js ในเครื่อง) |
| `/chat` | `app/chat/page.tsx` | Client (แชท+ค้นในเครื่อง) |
| `/quiz` | `app/quiz/page.tsx` | Client (ทำข้อสอบ) |
| `/documents` | `app/documents/page.tsx` | Client (IndexedDB) |
| `/status` | `app/status/page.tsx` | Client (privacy) |
API (Route Handler): `POST /api/chat`, `POST /api/quiz`, `POST /api/summarize` (รับ context จากเครื่อง ไม่บันทึกอะไร)

### 2. Server vs Client — ทำไมแต่ละไฟล์เป็นแบบนั้น
- **Server (ไม่มี `"use client"`):** `app/page.tsx` (landing static → เร็ว+SEO), `app/layout.tsx` (ห่อ AuthProvider/AppShell ไม่มี interactive ของตัวเอง), Route Handlers ทั้งหมด (ถือ `THAILLM_API_KEY` ซึ่งห้ามหลุดไป browser)
- **Client (`"use client"`):** `app/login`, `app/signup` (ฟอร์ม RHF+zod + Supabase Auth ฝั่ง browser), `app/upload` (อ่าน `File` ด้วย PDF.js + เขียน IndexedDB), `app/documents` (อ่าน/ลบ IndexedDB), `app/chat` (เลือกเอกสาร + ค้น TF-IDF + state คำตอบ), `app/quiz` (state ช้อยส์/คะแนน), `app/status` (นับไฟล์ในเครื่อง), `components/AuthProvider.tsx` (`useEffect` อ่าน session), `components/AppShell.tsx` (`usePathname` ไฮไลต์เมนู)
- เหตุผลละเอียดอยู่ในคอมเมนต์หัวแต่ละไฟล์

### 3. Data fetching (SSG เจตนา — ไม่ใช่ default เฉยๆ)
- `app/page.tsx` ใส่ `export const dynamic = "force-static"` = **SSG เจตนา** — หน้า landing ไม่มีข้อมูลราย user/request เลยให้ prerender เป็น HTML ครั้งเดียวตอน build
- ทำไมไม่ SSR: ไม่มีอะไรต้องสด — ส่วนข้อมูลราย user (คลังเอกสาร) อยู่ใน IndexedDB ของเครื่อง อ่านฝั่ง client โดยตรง ไม่ผ่าน server เลยไม่ต้องมี SSR/ISR

### 4. Mutation ผ่าน Route Handler
- `POST /api/chat` `{question, context}` → `{answer}` (เรียก ThaiLLM สร้างคำตอบใหม่ทุกครั้ง ไม่ idempotent), `POST /api/quiz` `{topic, context}` → `{quiz}`, `POST /api/summarize` `{context, mode}` → `{summary}` — ทุกเส้นต้อง login (401 ถ้าไม่) แต่ไม่บันทึกอะไรลง DB
- การบันทึกถาวรอยู่ฝั่ง client: IndexedDB (`saveDoc`/`deleteDoc` ใน `lib/local-docs.ts`) + Supabase Auth (`signUp`/`signInWithPassword`)

### 5. Global state ฝั่ง client
- `components/AuthProvider.tsx` = React Context (`createContext` + `useAuth()`) ห่อทั้งแอปใน `app/layout.tsx` แชร์ `email/name/loading` ให้ `AppShell` + ทุกหน้าโดยไม่ prop-drilling เก็บแค่ display info ไม่ถือ key

### 6. ฟอร์ม validate จริง (react-hook-form + zod)
- `app/login/page.tsx` (`loginSchema`: email ต้องเป็นอีเมล + password ห้ามว่าง) และ `app/signup/page.tsx` (`signupSchema`: ชื่อห้ามว่าง/ยาว≤50 + email + password≥6 + confirm ต้องตรงกันด้วย `.refine`) ใช้ `useForm({ resolver: zodResolver(schema) })` + โชว์ error ใต้ช่องแบบเรียลไทม์
- แพ็กเกจ: `react-hook-form`, `zod`, `@hookform/resolvers`

### 7. Responsive + Deploy
- Responsive: `app/globals.css` มี `@media (max-width: 760px)` (grid 3→1 คอลัมน์, header wrap, nav scroll) + `prefers-reduced-motion`
- Deploy: Vercel — URL: https://classmate-e3vhrrl9m-wintuners-projects.vercel.app (alias https://classmate-ai-psi.vercel.app, `vercel --prod` ผ่าน ● Ready) (ตั้ง env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `THAILLM_API_KEY` ใน Vercel → Settings → Environment Variables)

## Frontend ที่ทำแล้ว
- สร้างหน้าหลัก ClassMate AI พร้อมทางลัดไปยังอัปโหลดเอกสาร แชทถาม AI และสร้างแบบทดสอบ
- เพิ่มแถบนำทางร่วมทุกหน้า แสดงชื่อผู้ใช้จาก `useAuth()` และรองรับหน้าจอมือถือ
- จัดรูปแบบหน้า `/login`, `/upload`, `/chat`, `/quiz`, `/documents` และ `/status` ให้ใช้รูปแบบ UI เดียวกัน
- หน้า `/login` เข้าสู่ระบบด้วย Supabase Auth พร้อมสถานะกำลังเข้าสู่ระบบและข้อความแจ้งข้อผิดพลาด
- หน้า `/upload` อ่าน PDF ด้วย PDF.js ในเครื่อง กันชื่อซ้ำ แล้วเก็บลง IndexedDB (ไฟล์ไม่ออกจากเครื่อง)
- หน้า `/chat` เลือกเอกสาร ค้น TF-IDF ในเครื่อง ส่งแค่ชิ้นที่เจอไป `POST /api/chat` แสดงคำตอบกับ citations แบบอ่านง่าย
- หน้า `/quiz` เลือกเอกสาร+หัวข้อ ค้นในเครื่อง ส่งไป `POST /api/quiz` ได้ปรนัย 5 ข้อพร้อมเฉลยเป็นข้อๆ
- หน้า `/documents` อ่าน/ลบคลังใน IndexedDB ของเครื่องนี้
- หน้า `/status` โหมด privacy — ยืนยันว่าไฟล์ไม่ออกนอกเครื่อง + นับไฟล์ในเครื่อง
- เพิ่มสไตล์ส่วนกลางใน `app/globals.css` โดยคำนึงถึงการใช้งานบนมือถือและการลด motion ตามการตั้งค่าของผู้ใช้
