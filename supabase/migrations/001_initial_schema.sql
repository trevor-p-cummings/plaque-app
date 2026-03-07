-- Plaques table
create table if not exists plaques (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  latitude double precision not null,
  longitude double precision not null,
  image_url text,
  created_at timestamptz default now()
);

-- User profiles (extends Supabase auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  points integer not null default 0,
  badges text[] not null default '{}',
  created_at timestamptz default now()
);

-- Check-ins
create table if not exists check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plaque_id uuid not null references plaques(id) on delete cascade,
  photo_url text,
  created_at timestamptz default now()
);

-- Quiz questions
create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  plaque_id uuid not null references plaques(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]',
  correct_index integer not null default 0,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_plaques_location on plaques (latitude, longitude);
create index if not exists idx_check_ins_user on check_ins (user_id);
create index if not exists idx_check_ins_plaque on check_ins (plaque_id);
create index if not exists idx_quiz_plaque on quiz_questions (plaque_id);

-- Row Level Security
alter table plaques enable row level security;
alter table profiles enable row level security;
alter table check_ins enable row level security;
alter table quiz_questions enable row level security;

-- Plaques are readable by everyone
create policy "Plaques are viewable by everyone" on plaques
  for select using (true);

-- Profiles: users can read all, update own
create policy "Profiles are viewable by everyone" on profiles
  for select using (true);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Check-ins: users can read all, insert own
create policy "Check-ins are viewable by everyone" on check_ins
  for select using (true);

create policy "Users can insert own check-ins" on check_ins
  for insert with check (auth.uid() = user_id);

-- Quiz questions are readable by everyone
create policy "Quiz questions are viewable by everyone" on quiz_questions
  for select using (true);

-- Seed data: a few sample plaques
insert into plaques (title, description, latitude, longitude) values
  ('The Blue Plaque - John Lennon', 'John Lennon lived here from 1940 to 1945. This Georgian terrace house in Liverpool was his childhood home.', 53.4084, -2.9916),
  ('Charles Darwin''s Home', 'Down House, where Charles Darwin lived for 40 years and wrote On the Origin of Species.', 51.3318, 0.0530),
  ('221B Baker Street', 'The fictional home of Sherlock Holmes, now the Sherlock Holmes Museum.', 51.5238, -0.1585),
  ('The Beatles'' Cavern Club', 'The Cavern Club on Mathew Street where The Beatles performed 292 times.', 53.4063, -2.9908),
  ('Isaac Newton''s Apple Tree', 'Woolsthorpe Manor, birthplace of Sir Isaac Newton, where he observed the famous apple.', 52.8064, -0.6382);
