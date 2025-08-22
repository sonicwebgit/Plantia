-- Users and sessions (for future login features)
create table if not exists users (
  id text primary key,
  email text unique,
  name text,
  image text,
  created_at timestamptz default now()
);

create table if not exists sessions (
  id text primary key,
  user_id text references users(id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists user_keys (
  id text primary key,
  user_id text references users(id) on delete cascade,
  hashed_password text,
  provider_id text not null,
  provider_user_id text not null,
  unique(provider_id, provider_user_id)
);

-- App data (owned by a user)
create table if not exists categories (
  id text primary key,
  user_id text references users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists plants (
  id text primary key,
  user_id text references users(id) on delete cascade,
  species text not null,
  common_name text,
  confidence numeric,
  nickname text,
  location text,
  category_id text references categories(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists care_profiles (
  id text primary key,
  user_id text references users(id) on delete cascade,
  plant_id text references plants(id) on delete cascade,
  species text not null,
  sunlight text not null,
  watering text not null,
  soil text not null,
  fertilizer text not null,
  temp_range text not null,
  humidity text not null,
  tips text
);

create table if not exists photos (
  id text primary key,
  user_id text references users(id) on delete cascade,
  plant_id text references plants(id) on delete cascade,
  url text not null,
  taken_at timestamptz not null,
  notes text
);

create table if not exists tasks (
  id text primary key,
  user_id text references users(id) on delete cascade,
  plant_id text references plants(id) on delete cascade,
  type text not null,
  title text not null,
  notes text,
  next_run_at timestamptz not null,
  completed_at timestamptz
);

create table if not exists ai_history (
  id text primary key,
  user_id text references users(id) on delete cascade,
  plant_id text references plants(id) on delete cascade,
  question text not null,
  answer text not null,
  photo_url text,
  created_at timestamptz default now()
);
