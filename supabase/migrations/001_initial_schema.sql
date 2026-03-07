-- =============================================================
-- Plaque App – Full Schema
-- =============================================================

-- 1. Plaques ──────────────────────────────────────────────────
create table if not exists plaques (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  latitude double precision not null,
  longitude double precision not null,
  address text,
  year_erected integer,
  image_url text,
  created_at timestamptz default now()
);

create index if not exists idx_plaques_location on plaques (latitude, longitude);

-- 2. User Profiles ────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  points integer not null default 0,
  badges text[] not null default '{}',
  created_at timestamptz default now()
);

-- 3. Check-ins ────────────────────────────────────────────────
create table if not exists check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plaque_id uuid not null references plaques(id) on delete cascade,
  photo_url text,
  created_at timestamptz default now(),
  unique (user_id, plaque_id)
);

create index if not exists idx_check_ins_user on check_ins (user_id);
create index if not exists idx_check_ins_plaque on check_ins (plaque_id);

-- 4. Quiz Questions ───────────────────────────────────────────
create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  plaque_id uuid not null references plaques(id) on delete cascade,
  question text not null,
  options jsonb not null default '[]',
  correct_index integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_quiz_plaque on quiz_questions (plaque_id);

-- 5. Quiz Attempts (prevent repeated answering) ───────────────
create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  quiz_question_id uuid not null references quiz_questions(id) on delete cascade,
  selected_index integer not null,
  correct boolean not null,
  created_at timestamptz default now(),
  unique (user_id, quiz_question_id)
);

create index if not exists idx_quiz_attempts_user on quiz_attempts (user_id);

-- =============================================================
-- Row-Level Security
-- =============================================================
alter table plaques enable row level security;
alter table profiles enable row level security;
alter table check_ins enable row level security;
alter table quiz_questions enable row level security;
alter table quiz_attempts enable row level security;

-- Plaques: public read
create policy "Plaques are viewable by everyone" on plaques
  for select using (true);

-- Profiles: public read, self update/insert
create policy "Profiles are viewable by everyone" on profiles
  for select using (true);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- Check-ins: public read, self insert
create policy "Check-ins are viewable by everyone" on check_ins
  for select using (true);
create policy "Users can insert own check-ins" on check_ins
  for insert with check (auth.uid() = user_id);

-- Quiz questions: public read
create policy "Quiz questions are viewable by everyone" on quiz_questions
  for select using (true);

-- Quiz attempts: read own, insert own
create policy "Users can view own quiz attempts" on quiz_attempts
  for select using (auth.uid() = user_id);
create policy "Users can insert own quiz attempts" on quiz_attempts
  for insert with check (auth.uid() = user_id);

-- =============================================================
-- RPC: atomically increment a user's points
-- =============================================================
create or replace function increment_points(user_id uuid, amount integer)
returns void
language sql
security definer
as $$
  update profiles set points = points + amount where id = user_id;
$$;

-- =============================================================
-- Seed: 20 Toronto historical plaques
-- =============================================================
insert into plaques (title, description, latitude, longitude, address, year_erected) values
  (
    'Fort York National Historic Site',
    'Established in 1793 by Lieutenant Governor John Graves Simcoe to defend the new town of York. The fort played a key role in the Battle of York on April 27, 1813, during the War of 1812. British regulars and Indigenous allies fought American forces here before the garrison was forced to retreat.',
    43.6389, -79.4058,
    '250 Fort York Blvd', 1793
  ),
  (
    'First Parliament Buildings',
    'The first Parliament of Upper Canada met near this site beginning in 1797. The wooden buildings were burned by American forces during the Battle of York in 1813. They were rebuilt and served as the seat of government until destroyed by fire again in 1824.',
    43.6508, -79.3641,
    'Parliament St & Front St E', 1797
  ),
  (
    'St. Lawrence Market',
    'Toronto''s principal market since 1803. The current South Market building was erected in 1845 and originally housed Toronto''s City Hall on its upper floor. The market has been in continuous operation for over two centuries and was named the world''s best food market by National Geographic in 2012.',
    43.6487, -79.3715,
    '93 Front St E', 1803
  ),
  (
    'Osgoode Hall',
    'Completed in 1832 as the headquarters of the Law Society of Upper Canada. The building is renowned for its wrought-iron fence, installed in 1866 reportedly to keep cattle from grazing on the lawn. It continues to serve as a courthouse and the seat of the Law Society of Ontario.',
    43.6520, -79.3862,
    '130 Queen St W', 1832
  ),
  (
    'The Grange',
    'Built in 1817 by D''Arcy Boulton Jr., this Georgian manor is one of Toronto''s oldest surviving brick houses. Harriett Boulton Dixon bequeathed it to the Art Museum of Toronto in 1911, and it became the original home of the Art Gallery of Ontario.',
    43.6535, -79.3925,
    '317 Dundas St W', 1817
  ),
  (
    'Upper Canada College',
    'Founded in 1829 by Lieutenant Governor Sir John Colborne as a boys'' preparatory school. It was modeled on English public schools and became one of Canada''s most influential educational institutions. The school originally stood on King Street before moving to its present Deer Park location in 1891.',
    43.6867, -79.4055,
    '200 Lonsdale Rd', 1829
  ),
  (
    'Mackenzie House',
    'The last home of William Lyon Mackenzie, Toronto''s first mayor and leader of the Upper Canada Rebellion of 1837. After years in exile following the failed rebellion, Mackenzie returned to Canada and lived in this row house from 1859 until his death in 1861.',
    43.6546, -79.3785,
    '82 Bond St', 1859
  ),
  (
    'St. James Cathedral',
    'The present cathedral was completed in 1853, replacing earlier churches on this site dating back to 1807. Its 93-metre spire was the tallest structure in Toronto for over a century. The cathedral''s clock, installed in 1875, still keeps time today.',
    43.6512, -79.3760,
    '65 Church St', 1853
  ),
  (
    'University of Toronto – University College',
    'Opened in 1859, University College is a masterpiece of Romanesque Revival architecture designed by Frederic Cumberland. The building was nearly destroyed by fire in 1890 but was faithfully restored. It has served as the main academic building of the University of Toronto for over 160 years.',
    43.6629, -79.3957,
    '15 King''s College Cir', 1859
  ),
  (
    'Casa Loma',
    'Built between 1911 and 1914 for financier Sir Henry Pellatt at a cost of $3.5 million. The 98-room Gothic Revival castle features 30 bathrooms, an 800-foot tunnel, secret passages, and stables. Pellatt lost his fortune and the city seized the castle for unpaid taxes in 1924.',
    43.6780, -79.4094,
    '1 Austin Terrace', 1914
  ),
  (
    'Distillery District',
    'Home of the Gooderham and Worts Distillery, once the largest distillery in the world. Founded in 1832 by James Worts and William Gooderham, the complex produced whisky and industrial alcohol for over 150 years. The Victorian industrial buildings were preserved and reopened as a cultural district in 2003.',
    43.6503, -79.3596,
    '55 Mill St', 1832
  ),
  (
    'Toronto Islands – Hanlan''s Point',
    'Named after Ned Hanlan, world champion sculler born on the island in 1855. The point was home to Toronto''s first airport (1939) and a popular amusement park. Babe Ruth hit his first professional home run at Hanlan''s Point Stadium on September 5, 1914.',
    43.6125, -79.3913,
    'Hanlan''s Point', 1855
  ),
  (
    'Old City Hall',
    'Designed by E.J. Lennox and completed in 1899 after a decade of construction. The Romanesque Revival building cost $2.5 million — a massive expenditure at the time. Lennox carved his name into the stone frieze after the city refused to credit him publicly. It now serves as a courthouse.',
    43.6524, -79.3816,
    '60 Queen St W', 1899
  ),
  (
    'The Ward – Historic Immigrant Neighbourhood',
    'Between the 1840s and 1950s, the area bounded by Queen, Yonge, College, and University was Toronto''s primary immigrant reception neighbourhood. Successive waves of Irish, Jewish, Italian, Chinese, and Black settlers made their first Canadian home here before the area was demolished for civic projects.',
    43.6553, -79.3843,
    'Near City Hall', 1840
  ),
  (
    'Spadina Museum – Austin Family Home',
    'Built in 1866 by James Austin, president of the Dominion Bank and the Consumers'' Gas Company. The house was expanded in the 1890s and 1912. Three generations of Austins lived here until 1982, when the family donated the property and its contents to the City of Toronto.',
    43.6786, -79.4078,
    '285 Spadina Rd', 1866
  ),
  (
    'Campbell House',
    'Built in 1822 for Sir William Campbell, Chief Justice of Upper Canada. The Georgian brick house originally stood on Adelaide Street. In 1972 it was moved six blocks west to its current location at Queen and University to save it from demolition — one of Toronto''s most dramatic heritage rescues.',
    43.6517, -79.3867,
    '160 Queen St W', 1822
  ),
  (
    'Hockey Hall of Fame',
    'Housed in a former Bank of Montreal building constructed in 1885. The Beaux-Arts building features ornate plasterwork and a stained glass dome. It became the Hockey Hall of Fame in 1993, celebrating Canada''s national winter sport and housing the original Stanley Cup.',
    43.6470, -79.3773,
    '30 Yonge St', 1885
  ),
  (
    'Union Station',
    'Opened by the Prince of Wales on August 6, 1927, after 14 years of construction. The Beaux-Arts building features a 76-metre-long Great Hall with a 27-metre vaulted ceiling made of Guastavino tile. Over 300,000 commuters pass through it daily, making it Canada''s busiest transportation hub.',
    43.6453, -79.3806,
    '65 Front St W', 1927
  ),
  (
    'Banting House – Discovery of Insulin',
    'Dr. Frederick Banting conceived the idea for insulin therapy to treat diabetes at his London, Ontario home, but conducted the critical experiments at the University of Toronto in 1921–1922 with Charles Best. Banting became the youngest Nobel laureate in Physiology or Medicine in 1923 at age 32.',
    43.6610, -79.3930,
    'University of Toronto, Medical Sciences Bldg', 1921
  ),
  (
    'Flatiron Building (Gooderham Building)',
    'Completed in 1892 for George Gooderham, owner of the Gooderham and Worts distillery empire. Designed by David Roberts Jr., the distinctive wedge-shaped building at the intersection of Wellington, Front, and Church streets is one of Toronto''s most photographed landmarks and an icon of the city''s Victorian commercial architecture.',
    43.6486, -79.3745,
    '49 Wellington St E', 1892
  );

-- =============================================================
-- Seed: quiz questions for each plaque
-- =============================================================
insert into quiz_questions (plaque_id, question, options, correct_index)
select p.id,
  q.question,
  q.options::jsonb,
  q.correct_index
from plaques p
join (values
  ('Fort York National Historic Site',
   'In what year was Fort York established?',
   '["1776", "1793", "1812", "1803"]', 1),
  ('First Parliament Buildings',
   'Who burned the first Parliament Buildings in 1813?',
   '["British forces", "French forces", "American forces", "Indigenous forces"]', 2),
  ('St. Lawrence Market',
   'What distinction did National Geographic give St. Lawrence Market in 2012?',
   '["Best architecture", "World''s best food market", "Oldest market in North America", "Most visited market"]', 1),
  ('Osgoode Hall',
   'Why was the wrought-iron fence installed at Osgoode Hall?',
   '["To keep out protesters", "For decoration", "To keep cattle off the lawn", "To mark the property line"]', 2),
  ('The Grange',
   'What institution did The Grange become the original home of?',
   '["Royal Ontario Museum", "Art Gallery of Ontario", "University of Toronto", "Toronto Public Library"]', 1),
  ('Upper Canada College',
   'Who founded Upper Canada College in 1829?',
   '["Sir John A. Macdonald", "William Lyon Mackenzie", "Sir John Colborne", "Lord Durham"]', 2),
  ('Mackenzie House',
   'William Lyon Mackenzie was Toronto''s first what?',
   '["Premier", "Governor", "Mayor", "Judge"]', 2),
  ('St. James Cathedral',
   'How tall is the spire of St. James Cathedral?',
   '["60 metres", "75 metres", "93 metres", "110 metres"]', 2),
  ('University of Toronto – University College',
   'What architectural style is University College?',
   '["Gothic Revival", "Romanesque Revival", "Neoclassical", "Art Deco"]', 1),
  ('Casa Loma',
   'How many rooms does Casa Loma have?',
   '["48", "72", "98", "120"]', 2),
  ('Distillery District',
   'Who founded the Gooderham and Worts Distillery?',
   '["John Molson", "James Worts and William Gooderham", "Samuel Bronfman", "Hiram Walker"]', 1),
  ('Toronto Islands – Hanlan''s Point',
   'Which baseball legend hit his first professional home run at Hanlan''s Point?',
   '["Ty Cobb", "Lou Gehrig", "Babe Ruth", "Honus Wagner"]', 2),
  ('Old City Hall',
   'Why did architect E.J. Lennox carve his name into Old City Hall?',
   '["It was tradition", "The city refused to credit him", "He was proud of the design", "It was required by law"]', 1),
  ('The Ward – Historic Immigrant Neighbourhood',
   'Which groups settled in The Ward?',
   '["Only British immigrants", "Irish, Jewish, Italian, Chinese, and Black settlers", "Only European immigrants", "French and Spanish settlers"]', 1),
  ('Spadina Museum – Austin Family Home',
   'How many generations of Austins lived in the Spadina house?',
   '["One", "Two", "Three", "Four"]', 2),
  ('Campbell House',
   'What happened to Campbell House in 1972?',
   '["It was demolished", "It was moved six blocks west", "It was converted to a museum", "It was rebuilt"]', 1),
  ('Hockey Hall of Fame',
   'What was the Hockey Hall of Fame building originally?',
   '["A courthouse", "A bank", "A train station", "A church"]', 1),
  ('Union Station',
   'How long did it take to construct Union Station?',
   '["5 years", "8 years", "14 years", "20 years"]', 2),
  ('Banting House – Discovery of Insulin',
   'How old was Frederick Banting when he won the Nobel Prize?',
   '["28", "32", "36", "40"]', 1),
  ('Flatiron Building (Gooderham Building)',
   'Who was the Flatiron Building built for?',
   '["Timothy Eaton", "George Gooderham", "Henry Pellatt", "David Roberts"]', 1)
) as q(plaque_title, question, options, correct_index)
on p.title = q.plaque_title;
