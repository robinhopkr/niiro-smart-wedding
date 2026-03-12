create table if not exists public.gallery_media (
  id uuid primary key default uuid_generate_v4(),
  wedding_source text not null check (wedding_source in ('modern', 'legacy')),
  wedding_source_id text not null,
  visibility text not null check (visibility in ('public', 'private')),
  storage_provider text not null check (storage_provider in ('supabase', 'r2')),
  file_name text not null,
  original_key text not null unique,
  preview_key text,
  lightbox_key text,
  original_content_type text,
  preview_content_type text,
  lightbox_content_type text,
  width integer,
  height integer,
  original_bytes bigint,
  preview_bytes bigint,
  lightbox_bytes bigint,
  uploaded_by text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_gallery_media_wedding_visibility
  on public.gallery_media(wedding_source, wedding_source_id, visibility, created_at desc);

create index if not exists idx_gallery_media_wedding
  on public.gallery_media(wedding_source, wedding_source_id, created_at desc);

alter table public.gallery_media enable row level security;

drop policy if exists gallery_media_public_read on public.gallery_media;
create policy gallery_media_public_read on public.gallery_media
  for select using (true);

drop policy if exists gallery_media_admin_write on public.gallery_media;
create policy gallery_media_admin_write on public.gallery_media
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
