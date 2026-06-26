-- ============================================================
-- Supabase Schema for Spearhead Grand Conclave
-- Run this in the Supabase SQL Editor after creating your project
-- ============================================================

-- 1. Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text not null,
  fav_faction text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Rosters
create table rosters (
  id text primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  faction text not null,
  spearhead_id text not null,
  custom_name text not null,
  notes text default '',
  wins int default 0,
  losses int default 0,
  draws int default 0
);

-- 3. Leagues
create table leagues (
  id text primary key,
  name text not null,
  description text default '',
  invite_code text not null,
  created_by uuid references profiles(id) not null,
  created_by_name text not null,
  is_public boolean default true,
  created_at timestamptz default now()
);

-- 4. League members
create table league_members (
  league_id text references leagues(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  username text not null,
  role text not null check (role in ('admin', 'member')),
  joined_at timestamptz default now(),
  primary key (league_id, user_id)
);

-- 5. League join requests
create table league_join_requests (
  id uuid default gen_random_uuid() primary key,
  league_id text references leagues(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  username text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz default now(),
  unique (league_id, user_id)
);

-- 6. League players (standings roster)
create table league_players (
  id text primary key,
  league_id text references leagues(id) on delete cascade not null,
  name text not null,
  faction text not null,
  points int default 0,
  wins int default 0,
  losses int default 0,
  draws int default 0,
  vp_scored int default 0,
  casualties_slain int default 0,
  underdog_wins int default 0,
  linked_uid uuid references profiles(id)
);

-- 7. Matches
create table matches (
  id text primary key,
  league_id text references leagues(id) on delete cascade not null,
  date timestamptz not null,
  player_a_name text not null,
  player_a_faction text not null,
  player_a_score int not null,
  player_a_casualties int not null,
  player_a_spearhead_name text,
  player_a_enhancement_name text,
  player_a_regiment_ability_name text,
  player_b_name text not null,
  player_b_faction text not null,
  player_b_score int not null,
  player_b_casualties int not null,
  player_b_spearhead_name text,
  player_b_enhancement_name text,
  player_b_regiment_ability_name text,
  winner text not null check (winner in ('A', 'B', 'Draw')),
  underdog_played text check (underdog_played in ('A', 'B')),
  underdog_awarded boolean default false,
  verification_code text default ''
);

-- ============================================================
-- Indexes for performance
-- ============================================================
create index idx_leagues_is_public on leagues(is_public);
create index idx_leagues_created_by on leagues(created_by);
create index idx_league_members_user on league_members(user_id);
create index idx_league_members_league on league_members(league_id);
create index idx_league_join_requests_league on league_join_requests(league_id);
create index idx_league_players_league on league_players(league_id);
create index idx_matches_league on matches(league_id);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Profiles: users can read all profiles, write only their own
alter table profiles enable row level security;

create policy "Profiles are publicly readable"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Rosters: users manage their own
alter table rosters enable row level security;

create policy "Rosters are readable by all authenticated"
  on rosters for select using (auth.role() = 'authenticated');

create policy "Users can manage own rosters"
  on rosters for all using (auth.uid() = user_id);

-- Leagues: publicly readable, auth required for write
alter table leagues enable row level security;

create policy "Leagues are publicly readable"
  on leagues for select using (true);

create policy "Authenticated users can create leagues"
  on leagues for insert with check (auth.role() = 'authenticated');

create policy "Members can update leagues"
  on leagues for update using (
    exists (
      select 1 from league_members
      where league_members.league_id = id
      and league_members.user_id = auth.uid()
    )
  );

create policy "Creator can delete leagues"
  on leagues for delete using (created_by = auth.uid());

-- League members: readable by all, insert/update/delete by auth only
alter table league_members enable row level security;

create policy "Members are publicly readable"
  on league_members for select using (true);

create policy "Members can insert own membership"
  on league_members for insert with check (auth.uid() = user_id);

-- League players
alter table league_players enable row level security;

create policy "League players are publicly readable"
  on league_players for select using (true);

create policy "Players can be inserted by league members"
  on league_players for insert with check (
    exists (
      select 1 from league_members
      where league_members.league_id = league_players.league_id
      and league_members.user_id = auth.uid()
    )
  );

create policy "Players can be updated by league members"
  on league_players for update using (
    exists (
      select 1 from league_members
      where league_members.league_id = league_players.league_id
      and league_members.user_id = auth.uid()
    )
  );

-- Join requests
alter table league_join_requests enable row level security;

create policy "Join requests readable by league members"
  on league_join_requests for select using (
    exists (
      select 1 from league_members
      where league_members.league_id = league_join_requests.league_id
      and league_members.user_id = auth.uid()
    )
  );

create policy "Users can create their own join requests"
  on league_join_requests for insert with check (
    auth.uid() = user_id and status = 'pending'
  );

-- Matches
alter table matches enable row level security;

create policy "Matches are publicly readable"
  on matches for select using (true);

create policy "League members can insert matches"
  on matches for insert with check (
    exists (
      select 1 from league_members
      where league_members.league_id = matches.league_id
      and league_members.user_id = auth.uid()
    )
  );

-- ============================================================
-- Enable Realtime (required for live updates)
-- Run these in the Supabase Dashboard > Database > Replication
-- or uncomment and execute:
-- ============================================================
-- alter publication supabase_realtime add table leagues;
-- alter publication supabase_realtime add table league_members;
-- alter publication supabase_realtime add table league_join_requests;
-- alter publication supabase_realtime add table league_players;
-- alter publication supabase_realtime add table matches;
