create table if not exists public.rsvp_household_details (
  id uuid primary key default uuid_generate_v4(),
  wedding_source text not null check (wedding_source in ('modern', 'legacy')),
  wedding_source_id text not null,
  rsvp_record_id text not null,
  small_children_count integer not null default 0 check (small_children_count >= 0),
  high_chair_count integer not null default 0 check (high_chair_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (wedding_source, wedding_source_id, rsvp_record_id),
  check (high_chair_count <= small_children_count)
);

create index if not exists idx_rsvp_household_details_wedding
  on public.rsvp_household_details(wedding_source, wedding_source_id);

create index if not exists idx_rsvp_household_details_rsvp
  on public.rsvp_household_details(rsvp_record_id);

alter table public.rsvp_household_details enable row level security;
