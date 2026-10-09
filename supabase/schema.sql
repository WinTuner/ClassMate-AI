-- ClassMate AI — privacy cleanup: ลบตารางข้อมูลแอปทั้งหมด
-- (ย้ายเป็น local-first แล้ว: ไฟล์อยู่ IndexedDB ในเครื่อง, server ไม่บันทึกอะไร)
-- Supabase เหลือแค่ Auth (auth.users แตะไม่ได้/ไม่ต้องแตะ)
-- รันใน Supabase SQL editor ครั้งเดียว
drop table if exists messages;
drop table if exists conversations;
drop table if exists chunks;
drop table if exists documents;
drop table if exists quizzes;
drop table if exists users;
drop function if exists match_chunks(vector, uuid, int);
