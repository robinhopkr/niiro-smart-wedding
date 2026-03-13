create table if not exists public.billing_entitlements (
  id uuid primary key default uuid_generate_v4(),
  wedding_source text not null check (wedding_source in ('modern', 'legacy')),
  wedding_source_id text not null,
  status text not null default 'unpaid' check (status in ('paid', 'unpaid')),
  provider text not null default 'stripe' check (provider in ('stripe', 'google_play', 'legacy')),
  email text,
  paid_at timestamptz,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  google_play_purchase_token text,
  google_play_order_id text,
  google_play_product_id text,
  google_play_package_name text,
  google_play_acknowledged_at timestamptz,
  expires_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (wedding_source, wedding_source_id)
);

create unique index if not exists idx_billing_entitlements_google_play_purchase_token
  on public.billing_entitlements(google_play_purchase_token)
  where google_play_purchase_token is not null;

create index if not exists idx_billing_entitlements_wedding
  on public.billing_entitlements(wedding_source, wedding_source_id);

alter table public.billing_entitlements enable row level security;
