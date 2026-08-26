-- BILLZAP SUPABASE SQL DATABASE SCHEMA
-- This file contains all table DDLs, indices, Row Level Security (RLS) policies, and triggers.
-- You can copy-paste and run this script in your Supabase SQL Editor.

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- =========================================================================
-- FUNCTION: Set Updated At Timestamp
-- =========================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- =========================================================================
-- TABLE: businesses
-- =========================================================================
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text not null,
  logo_url text,
  phone text,
  email text,
  address text,
  currency text not null default 'PKR',
  invoice_prefix text not null default 'INV-',
  last_invoice_number integer not null default 0 check (last_invoice_number >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.businesses enable row level security;

-- Policies
create policy "Users can view their own business record"
  on public.businesses for select
  using (auth.uid() = user_id);

create policy "Users can insert their own business record"
  on public.businesses for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own business record"
  on public.businesses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger
create trigger tr_businesses_updated_at
  before update on public.businesses
  for each row execute procedure public.set_updated_at();

-- =========================================================================
-- TABLE: customers
-- =========================================================================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phone text,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.customers enable row level security;

-- Policies
create policy "Users can view their own customers"
  on public.customers for select
  using (auth.uid() = user_id);

create policy "Users can insert their own customers"
  on public.customers for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own customers"
  on public.customers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own customers"
  on public.customers for delete
  using (auth.uid() = user_id);

-- Trigger
create trigger tr_customers_updated_at
  before update on public.customers
  for each row execute procedure public.set_updated_at();

-- Indices
create index idx_customers_user_id on public.customers(user_id);

-- =========================================================================
-- TABLE: invoices
-- =========================================================================
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete set null,
  invoice_number text not null,
  sequence_number integer not null check (sequence_number > 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0.00 check (discount >= 0),
  total numeric(12,2) not null check (total >= 0),
  status text not null default 'Unpaid' check (status in ('Paid', 'Unpaid')),
  notes text,
  customer_name text, -- Snapshotted customer name
  customer_phone text, -- Snapshotted customer phone
  customer_email text, -- Snapshotted customer email
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Prevent duplicate invoice numbers for the same user
  unique(user_id, invoice_number)
);

-- Enable RLS
alter table public.invoices enable row level security;

-- Policies
create policy "Users can view their own invoices"
  on public.invoices for select
  using (auth.uid() = user_id);

create policy "Users can insert their own invoices"
  on public.invoices for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own invoices"
  on public.invoices for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own invoices"
  on public.invoices for delete
  using (auth.uid() = user_id);

-- Trigger
create trigger tr_invoices_updated_at
  before update on public.invoices
  for each row execute procedure public.set_updated_at();

-- Indices
create index idx_invoices_user_id on public.invoices(user_id);
create index idx_invoices_customer_id on public.invoices(customer_id);

-- =========================================================================
-- TABLE: invoice_items
-- =========================================================================
create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  description text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  total numeric(12,2) not null check (total >= 0)
);

-- Enable RLS
alter table public.invoice_items enable row level security;

-- Policies
create policy "Users can view their own invoice items"
  on public.invoice_items for select
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

create policy "Users can insert their own invoice items"
  on public.invoice_items for insert
  with check (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

create policy "Users can update their own invoice items"
  on public.invoice_items for update
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

create policy "Users can delete their own invoice items"
  on public.invoice_items for delete
  using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

-- Indices
create index idx_invoice_items_invoice_id on public.invoice_items(invoice_id);

-- =========================================================================
-- TABLE: subscriptions
-- =========================================================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'active',
  provider text not null default 'system',
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamp with time zone default timezone('utc'::text, now()) not null,
  current_period_end timestamp with time zone default timezone('utc'::text, now() + interval '30 days') not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Policies
create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own subscription"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own subscription"
  on public.subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger
create trigger tr_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

-- =========================================================================
-- SIGNUP AUTOMATION: Create default subscription on signup
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Automatically insert a default active free plan subscription
  insert into public.subscriptions (user_id, plan, status, provider)
  values (new.id, 'free', 'active', 'system');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
create or replace trigger tr_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
