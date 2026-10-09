# Final Project Proposal — ClassMate AI
กลุ่ม: [ชื่อกลุ่ม] · สมาชิก: นัท [รหัส] , บอม [รหัส]

## 1. แอปนี้ทำอะไร ใครใช้
ผู้ช่วยเรียนจากเอกสารจริงสำหรับนักศึกษา — อัปโหลดสไลด์/PDF วิชาที่เรียน แล้วถาม AI
ให้ตอบจากเนื้อหาในเอกสารพร้อมแหล่งอ้างอิง (เลขหน้า) และสร้างแบบทดสอบปรนัยทบทวน
แก้ปัญหาอ่านสไลด์กองโตแล้วจับประเด็นไม่ได้ และ AI ทั่วไปตอบนอกเอกสารมั่ว
จุดขายด้าน privacy: ไฟล์ไม่เคยออกจากเครื่องนักศึกษาเลย

## 2. หน้าที่จะมี (อย่างน้อย 4 route)
| Route | หน้านี้ทำอะไร |
|---|---|
| / | หน้าแรก — แนะนำแอป + ทางลัดไปเพิ่มเอกสาร/ถาม AI/ทำแบบทดสอบ (SSG) |
| /upload | เลือกไฟล์ PDF → อ่านด้วย PDF.js ในเครื่อง → เก็บลง IndexedDB (ไม่มีอัปโหลดจริง) |
| /documents | คลังเอกสารในเครื่องนี้ + ลบทีละไฟล์ |
| /chat | เลือกเอกสาร → พิมพ์คำถาม → ค้น TF-IDF ในเครื่อง → ส่งแค่ชิ้นที่เจอไปถาม AI |
| /quiz | เลือกเอกสาร + หัวข้อ → ได้แบบทดสอบปรนัย 5 ข้อ กดตอบแล้วดูเฉลยเป็นข้อๆ |
| /status | หน้า privacy — ยืนยันว่าไฟล์ไม่ออกนอกเครื่อง + นับไฟล์ในเครื่อง |
| /login · /signup | เข้าสู่ระบบ / สมัครสมาชิก (Supabase Auth — มีไว้กันคนนอกยิง API เท่านั้น) |

## 3. Server หรือ Client — และทำไม
| ส่วนของแอป | Server / Client | เหตุผล |
|---|---|---|
| / หน้าแรก | Server (SSG `force-static`) | เนื้อหา static ไม่มีข้อมูลราย user — prerender ครั้งเดียวตอน build เร็วสุด |
| อ่าน PDF + ตัดชิ้น (`/upload`, `lib/local-rag.ts`) | Client | ต้องอ่าน `File` ใน browser + ไฟล์ห้ามออกจากเครื่อง เลย parse ฝั่ง client ด้วย PDF.js |
| คลังเอกสาร (`/documents`, `lib/local-docs.ts`) | Client (IndexedDB) | ข้อมูลอยู่แค่ใน browser นี้ — server ไม่มีตารางเก็บไฟล์แล้ว จึงต้องอ่าน/ลบฝั่ง client |
| ค้นเนื้อหา (`searchLocal` ใน `/chat`, `/quiz`) | Client (TF-IDF) | ค้นในเครื่องก่อนส่ง — ส่งแค่ชิ้นที่ตรงไปถาม AI ไม่ใช่ทั้งไฟล์; เลือก TF-IDF แทน embeddings เพื่อไม่ต้องโหลดโมเดล ~100MB และไม่เรียก API ภายนอก |
| ฟอร์ม /login · /signup | Client | react-hook-form + zod ต้องใช้ state/event ฝั่ง browser และเรียก Supabase Auth จาก browser |
| ตัวถาม AI (`/api/chat`, `/api/quiz`, `/api/summarize`) | Route Handler | โค้ดที่ถือ `THAILLM_API_KEY` ต้องอยู่ server เท่านั้น — รับแค่ question+context มาตอบแล้วทิ้ง ไม่ insert อะไรเลย |
| AuthProvider (global state) | Client (Context) | ต้องใช้ `useEffect` อ่าน session ใน browser แล้วแชร์ชื่อผู้ใช้ผ่าน `useAuth()` ให้ทุกหน้าโดยไม่ prop-drilling |
| AppShell เมนูร่วม | Client | ต้องใช้ `usePathname` ไฮไลต์เมนู active แบบทันที |
| layout | Server | ไม่มี interactive ใน layout เอง |

## 4. ข้อมูลมาจากไหน + จุดที่ต้องเขียนข้อมูลกลับ
- แหล่งข้อมูล: IndexedDB ในเครื่อง (`docs` store: filename, pages, chunks[{page, content}]) — server ไม่มี DB ข้อมูลแอป Supabase เหลือแค่ Auth · หน้า `/` ใช้ SSG (`force-static`) เพราะไม่มีข้อมูลราย user — ถ้ามีข้อมูลราย request ถึงจะใช้ SSR
- mutation: `POST /api/chat|quiz|summarize` เป็น Route Handler ที่สร้างผลลัพธ์ใหม่ทุกครั้ง (เรียก ThaiLLM ไม่ idempotent) + เขียนตัวเลขนับโควตาผ่าน RPC `bump_usage()` ลงตาราง `daily_usage` (user, วัน, จำนวนครั้ง — ไม่มีเนื้อหา, เกิน 30 ครั้ง/วันตอบ 429) + Auth `signUp`/`signInWithPassword` · การบันทึกไฟล์อยู่ฝั่ง client (`saveDoc`/`deleteDoc` ลง IndexedDB) · ระบบ user มีไว้กันยิง API เกินโควตา ไม่ได้เก็บข้อมูลเรียน

## 5. แบ่งงานกันยังไง
- นัท (backend): Route Handlers (`chat/quiz/summarize`) + ThaiLLM prompt/guardrail + Auth gate + deploy Vercel
- บอม (frontend): `/login`+`/signup` (RHF+zod schema), `/upload` (PDF.js)+`/documents` (IndexedDB), `/chat`+`/quiz` (TF-IDF+state), AuthProvider Context, responsive
