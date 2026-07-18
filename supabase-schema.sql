-- ============================================================
-- StartupOS Database Schema (Prototype Friendly)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. WORKSPACES (Startups)
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid,
  color text default '#3b82f6',
  created_at timestamptz default now()
);

-- 2. WORKSPACE MEMBERS
create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid,
  role text default 'member' check (role in ('admin', 'manager', 'member')),
  joined_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- 3. USER PROFILES
create table if not exists profiles (
  id uuid primary key,
  full_name text,
  avatar_url text,
  role_title text,
  skills text[],
  updated_at timestamptz default now()
);

-- 4. GOALS (Daily tasks)
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  workspace_id uuid references workspaces(id) on delete cascade,
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  goal_date date default current_date,
  due_date date,
  progress int default 0 check (progress >= 0 and progress <= 100),
  priority text default 'medium' check (priority in ('low', 'medium', 'high')),
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- 5. CALENDAR EVENTS
create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  workspace_id uuid references workspaces(id) on delete cascade,
  title text not null,
  description text,
  event_type text default 'task' check (event_type in ('task', 'meeting', 'deep_work', 'standup')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  color text default '#3b82f6',
  meet_link text,
  google_event_id text,
  created_at timestamptz default now()
);

-- 6. DAILY STANDUPS
create table if not exists standups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  workspace_id uuid references workspaces(id) on delete cascade,
  accomplished text,
  plan_for_tomorrow text,
  blockers text,
  morale_score int check (morale_score >= 1 and morale_score <= 5),
  standup_date date default current_date,
  created_at timestamptz default now(),
  unique(user_id, workspace_id, standup_date)
);

-- 7. OKRS
create table if not exists okrs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  objective text not null,
  progress int default 0 check (progress >= 0 and progress <= 100),
  quarter text,
  year int default extract(year from now())::int,
  created_at timestamptz default now()
);

-- 8. USER INTEGRATIONS (OAuth tokens for Google, etc.)
create table if not exists user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);
