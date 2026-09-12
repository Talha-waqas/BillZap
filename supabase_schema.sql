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
  email text,
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
  insert into public.subscriptions (user_id, email, plan, status, provider)
  values (new.id, new.email, 'free', 'active', 'system');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
create or replace trigger tr_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- ADMIN POLICIES: Allow whitelisted admin emails to view/update records
-- =========================================================================
create policy "Admins can view all subscriptions"
  on public.subscriptions for select
  using ((auth.jwt() ->> 'email') in ('talhawaqasofficial@gmail.com', 'talha.dev@nayapay', 'admin@billzap.com'));

create policy "Admins can update all subscriptions"
  on public.subscriptions for update
  using ((auth.jwt() ->> 'email') in ('talhawaqasofficial@gmail.com', 'talha.dev@nayapay', 'admin@billzap.com'))
  with check ((auth.jwt() ->> 'email') in ('talhawaqasofficial@gmail.com', 'talha.dev@nayapay', 'admin@billzap.com'));

create policy "Admins can view all businesses"
  on public.businesses for select
  using ((auth.jwt() ->> 'email') in ('talhawaqasofficial@gmail.com', 'talha.dev@nayapay', 'admin@billzap.com'));

create policy "Admins can view all customers"
  on public.customers for select
  using ((auth.jwt() ->> 'email') in ('talhawaqasofficial@gmail.com', 'talha.dev@nayapay', 'admin@billzap.com'));

create policy "Admins can view all invoices"
  on public.invoices for select
  using ((auth.jwt() ->> 'email') in ('talhawaqasofficial@gmail.com', 'talha.dev@nayapay', 'admin@billzap.com'));

-- =========================================================================
-- REFERRAL & REWARDS SYSTEM SCHEMA
-- =========================================================================

-- 1. TABLE: user_referral_profiles
create table if not exists public.user_referral_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  referral_code text not null unique,
  referred_by_id uuid references auth.users(id) on delete set null,
  total_pro_qualified integer not null default 0,
  total_free_qualified integer not null default 0,
  total_rewards_earned integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint no_self_referred check (user_id != referred_by_id)
);

alter table public.user_referral_profiles enable row level security;

create policy "Users can view their own referral profile"
  on public.user_referral_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own referral profile"
  on public.user_referral_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own referral profile"
  on public.user_referral_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Public lookup of referral code for registration"
  on public.user_referral_profiles for select
  using (true);

create policy "Admins can manage all user_referral_profiles"
  on public.user_referral_profiles for all
  using ((auth.jwt() ->> 'email') in ('talhawaqasofficial@gmail.com', 'talha.dev@nayapay', 'admin@billzap.com'));

-- 2. TABLE: referral_rewards
create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  reward_type text not null default 'pro_90_days',
  days_granted integer not null default 90,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  pro_referrals_used integer not null default 3,
  free_referrals_used integer not null default 5,
  granted_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default timezone('utc'::text, now() + interval '90 days') not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.referral_rewards enable row level security;

create policy "Users can view their own referral rewards"
  on public.referral_rewards for select
  using (auth.uid() = user_id);

create policy "Admins can manage all referral rewards"
  on public.referral_rewards for all
  using ((auth.jwt() ->> 'email') in ('talhawaqasofficial@gmail.com', 'talha.dev@nayapay', 'admin@billzap.com'));

-- 3. TABLE: referrals
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references auth.users(id) on delete cascade not null,
  referred_user_id uuid references auth.users(id) on delete cascade not null unique,
  status text not null default 'signed_up' check (status in ('invited', 'signed_up', 'invoice_created', 'qualified_free', 'qualified_pro', 'reward_counted', 'revoked')),
  has_created_invoice boolean not null default false,
  plan_at_qualification text not null default 'free',
  counted_in_reward_id uuid references public.referral_rewards(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint no_self_referral check (referrer_id != referred_user_id)
);

alter table public.referrals enable row level security;

create policy "Referrers can view their referral list"
  on public.referrals for select
  using (auth.uid() = referrer_id);

create policy "Referred users can view their own referral link"
  on public.referrals for select
  using (auth.uid() = referred_user_id);

create policy "Users can insert referral records"
  on public.referrals for insert
  with check (auth.uid() = referred_user_id or auth.uid() = referrer_id);

create policy "Users can update their referral records"
  on public.referrals for update
  using (auth.uid() = referrer_id or auth.uid() = referred_user_id);

create policy "Admins can manage all referrals"
  on public.referrals for all
  using ((auth.jwt() ->> 'email') in ('talhawaqasofficial@gmail.com', 'talha.dev@nayapay', 'admin@billzap.com'));

-- Triggers for updated_at
create trigger tr_user_referral_profiles_updated_at
  before update on public.user_referral_profiles
  for each row execute procedure public.set_updated_at();

create trigger tr_referrals_updated_at
  before update on public.referrals
  for each row execute procedure public.set_updated_at();

-- Indices
create index if not exists idx_referrals_referrer_id on public.referrals(referrer_id);
create index if not exists idx_referrals_status on public.referrals(status);
create index if not exists idx_user_referral_profiles_code on public.user_referral_profiles(referral_code);

-- =========================================================================
-- FUNCTION: check_and_award_referral_reward
-- Checks if referrer has >= 3 qualified_pro and >= 5 qualified_free,
-- automatically marks them reward_counted and extends user's subscription by 90 days.
-- =========================================================================
create or replace function public.check_and_award_referral_reward(p_referrer_id uuid)
returns json as $$
declare
  v_pro_count integer;
  v_free_count integer;
  v_new_reward_id uuid;
  v_existing_sub record;
  v_new_period_end timestamp with time zone;
begin
  -- 1. Count uncounted qualified pro and free referrals
  select count(*) into v_pro_count
  from public.referrals
  where referrer_id = p_referrer_id
    and status = 'qualified_pro'
    and counted_in_reward_id is null;

  select count(*) into v_free_count
  from public.referrals
  where referrer_id = p_referrer_id
    and status = 'qualified_free'
    and counted_in_reward_id is null;

  -- 2. If requirement met (>=3 Pro AND >=5 Free), grant 90 Days Free Pro Reward
  if v_pro_count >= 3 and v_free_count >= 5 then
    -- Create reward record
    insert into public.referral_rewards (
      user_id,
      reward_type,
      days_granted,
      status,
      pro_referrals_used,
      free_referrals_used,
      granted_at,
      expires_at
    )
    values (
      p_referrer_id,
      'pro_90_days',
      90,
      'active',
      3,
      5,
      now(),
      now() + interval '90 days'
    )
    returning id into v_new_reward_id;

    -- Update exactly 3 qualified_pro referrals
    with pro_to_update as (
      select id from public.referrals
      where referrer_id = p_referrer_id
        and status = 'qualified_pro'
        and counted_in_reward_id is null
      order by created_at asc
      limit 3
    )
    update public.referrals
    set status = 'reward_counted',
        counted_in_reward_id = v_new_reward_id,
        updated_at = now()
    where id in (select id from pro_to_update);

    -- Update exactly 5 qualified_free referrals
    with free_to_update as (
      select id from public.referrals
      where referrer_id = p_referrer_id
        and status = 'qualified_free'
        and counted_in_reward_id is null
      order by created_at asc
      limit 5
    )
    update public.referrals
    set status = 'reward_counted',
        counted_in_reward_id = v_new_reward_id,
        updated_at = now()
    where id in (select id from free_to_update);

    -- Increment reward count on profile
    update public.user_referral_profiles
    set total_rewards_earned = total_rewards_earned + 1,
        updated_at = now()
    where user_id = p_referrer_id;

    -- Update subscription: grant 90 days Pro
    select * into v_existing_sub from public.subscriptions where user_id = p_referrer_id;
    if found then
      -- If already pro and active with future end date, append 90 days
      if v_existing_sub.plan = 'pro' and v_existing_sub.current_period_end > now() then
        v_new_period_end := v_existing_sub.current_period_end + interval '90 days';
      else
        v_new_period_end := now() + interval '90 days';
      end if;

      update public.subscriptions
      set plan = 'pro',
        status = 'active',
        current_period_end = v_new_period_end,
        updated_at = now()
      where user_id = p_referrer_id;
    else
      -- If subscription record missing, create one
      insert into public.subscriptions (user_id, plan, status, provider, current_period_start, current_period_end)
      values (p_referrer_id, 'pro', 'active', 'referral_reward', now(), now() + interval '90 days');
    end if;

    return json_build_object('success', true, 'reward_id', v_new_reward_id, 'days_granted', 90);
  end if;

  return json_build_object('success', false, 'pro_count', v_pro_count, 'free_count', v_free_count);
end;
$$ language plpgsql security definer;

-- =========================================================================
-- TRIGGER: On Invoice Created -> Mark referral as having created an invoice
-- =========================================================================
create or replace function public.handle_referral_on_invoice_created()
returns trigger as $$
declare
  v_ref record;
  v_sub record;
  v_new_status text;
begin
  -- Check if creator was referred by someone
  select * into v_ref from public.referrals where referred_user_id = new.user_id;
  if found and v_ref.status in ('signed_up', 'invited') then
    -- Check referred user's current subscription plan
    select * into v_sub from public.subscriptions where user_id = new.user_id;
    if found and v_sub.plan = 'pro' and v_sub.status = 'active' then
      v_new_status := 'qualified_pro';
    else
      v_new_status := 'qualified_free';
    end if;

    update public.referrals
    set has_created_invoice = true,
        status = v_new_status,
        plan_at_qualification = coalesce(v_sub.plan, 'free'),
        updated_at = now()
    where id = v_ref.id;

    -- Update referrer profile stats
    if v_new_status = 'qualified_pro' then
      update public.user_referral_profiles
      set total_pro_qualified = total_pro_qualified + 1
      where user_id = v_ref.referrer_id;
    else
      update public.user_referral_profiles
      set total_free_qualified = total_free_qualified + 1
      where user_id = v_ref.referrer_id;
    end if;

    -- Check if referrer qualifies for 90 days reward
    perform public.check_and_award_referral_reward(v_ref.referrer_id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

create or replace trigger tr_referral_on_invoice_created
  after insert on public.invoices
  for each row execute procedure public.handle_referral_on_invoice_created();

-- =========================================================================
-- TRIGGER: On Subscription Updated -> If upgraded to Pro, update referral status
-- =========================================================================
create or replace function public.handle_referral_on_subscription_update()
returns trigger as $$
declare
  v_ref record;
begin
  if new.plan = 'pro' and (old.plan is distinct from 'pro' or old.status is distinct from 'active') and new.status = 'active' then
    select * into v_ref from public.referrals where referred_user_id = new.user_id;
    if found and v_ref.status in ('signed_up', 'invoice_created', 'qualified_free') then
      -- If they already created an invoice, they now qualify as pro!
      if v_ref.has_created_invoice then
        update public.referrals
        set status = 'qualified_pro',
            plan_at_qualification = 'pro',
            updated_at = now()
        where id = v_ref.id;

        -- Adjust referrer stats (decrease free, increase pro)
        if v_ref.status = 'qualified_free' then
          update public.user_referral_profiles
          set total_free_qualified = greatest(0, total_free_qualified - 1),
              total_pro_qualified = total_pro_qualified + 1
          where user_id = v_ref.referrer_id;
        else
          update public.user_referral_profiles
          set total_pro_qualified = total_pro_qualified + 1
          where user_id = v_ref.referrer_id;
        end if;

        -- Check if referrer qualifies for 90 days reward
        perform public.check_and_award_referral_reward(v_ref.referrer_id);
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create or replace trigger tr_referral_on_subscription_update
  after update on public.subscriptions
  for each row execute procedure public.handle_referral_on_subscription_update();
