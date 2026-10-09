-- ClassMate AI — privacy cleanup: ลบตารางข้อมูลแอปทั้งหมด
-- (ย้ายเป็น local-first แล้ว: ไฟล์อยู่ IndexedDB ในเครื่อง, server ไม่บันทึกอะไร)
-- เหลือตารางเดียว: daily_usage (นับจำนวนครั้งใช้ AI รายวัน — ตัวเลขล้วน ไม่มีเนื้อหา)
-- Supabase อื่นๆ ใช้แค่ Auth (auth.users แตะไม่ได้/ไม่ต้องแตะ)
-- รันใน Supabase SQL editor ครั้งเดียว
drop table if exists messages;
drop table if exists conversations;
drop table if exists chunks;
drop table if exists documents;
drop table if exists quizzes;
drop table if exists users;
drop function if exists match_chunks(vector, uuid, int);

-- Rate limit รายคน: เก็บแค่ (user, วัน, จำนวนครั้ง)
create table if not exists daily_usage (
  user_id uuid references auth.users(id) on delete cascade not null,
  day date not null default CURRENT_DATE,
  count int not null default 0,
  primary key (user_id, day)
);
alter table daily_usage enable row level security;
drop policy if exists "own usage" on daily_usage;
create policy "own usage" on daily_usage for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- นับแบบ atomic กันยิงพร้อมกันแล้วหลุด (เรียกผ่าน anon key ได้, RLS ไม่เกี่ยวเพราะ definer)
create or replace function bump_usage()
returns int language plpgsql security definer as $$
declare c int;
begin
  insert into daily_usage(user_id, day, count)
  values (auth.uid(), CURRENT_DATE, 1)
  on conflict (user_id, day) do update set count = daily_usage.count + 1
  returning daily_usage.count into c;
  return c;
end $$;
