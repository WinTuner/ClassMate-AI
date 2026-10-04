-- ClassMate AI schema — run in Supabase SQL editor
create extension if not exists vector;

create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  filename text not null,
  pages int default 0,
  status text default 'ready',
  created_at timestamptz default now()
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid references documents(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  page int not null,
  content text not null,
  embedding vector(768),
  created_at timestamptz default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conv_id uuid references conversations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  citations jsonb default '[]',
  created_at timestamptz default now()
);

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  topic text not null,
  payload jsonb not null,
  score int,
  created_at timestamptz default now()
);

-- RLS: user sees only own rows
alter table documents enable row level security;
alter table chunks enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table quizzes enable row level security;

create policy "own docs" on documents for all using (auth.uid() = user_id);
create policy "own chunks" on chunks for all using (auth.uid() = user_id);
create policy "own convs" on conversations for all using (auth.uid() = user_id);
create policy "own msgs" on messages for all using (auth.uid() = user_id);
create policy "own quiz" on quizzes for all using (auth.uid() = user_id);

-- Vector search (filter per user!)
create or replace function match_chunks(query_embedding vector(768), match_user uuid, match_count int)
returns table (content text, page int, filename text, similarity float)
language sql stable as $$
  select c.content, c.page, d.filename,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c join documents d on d.id = c.doc_id
  where c.user_id = match_user
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
