-- =========================================================
-- Bit by Bit: first migration
-- tables, a sign-up trigger, row level security and file storage
-- I run this once in the Supabase SQL editor
-- =========================================================


-- ---------- 1. TABLES ----------

-- one row per user, linked to Supabase's own auth.users table
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  phone       text,
  role        text not null check (role in ('customer', 'owner')),
  created_at  timestamptz not null default now()
);

-- every shop owner gets a shop
create table public.shops (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  area        text,
  created_at  timestamptz not null default now()
);

-- a lay-by = one item a customer is paying off at one shop
create table public.laybys (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references public.shops (id) on delete cascade,
  customer_id     uuid not null references public.profiles (id) on delete cascade,
  item_name       text not null,
  item_photo_path text,
  price           numeric(12, 2) not null check (price > 0),
  deposit         numeric(12, 2) not null,
  term_months     int not null check (term_months between 1 and 6),
  status          text not null default 'active'
                  check (status in ('active', 'completed', 'collected', 'cancelled')),
  cancel_reason   text,
  created_at      timestamptz not null default now(),
  -- my lay-by rule: deposit must be at least 10% of the price and not more than the price
  constraint deposit_rule check (deposit >= price * 0.10 and deposit <= price)
);

-- the payment schedule (one row per month)
create table public.instalments (
  id        uuid primary key default gen_random_uuid(),
  layby_id  uuid not null references public.laybys (id) on delete cascade,
  seq       int not null,
  due_date  date not null,
  amount    numeric(12, 2) not null check (amount > 0),
  unique (layby_id, seq)
);

-- every payment, with its proof and status
create table public.payments (
  id             uuid primary key default gen_random_uuid(),
  layby_id       uuid not null references public.laybys (id) on delete cascade,
  amount         numeric(12, 2) not null check (amount > 0),
  method         text not null check (method in ('deposit', 'cash', 'eft')),
  status         text not null default 'pending'
                 check (status in ('pending', 'confirmed', 'rejected')),
  proof_path     text,
  reject_reason  text,
  created_by     uuid not null references public.profiles (id),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- indexes so the dashboard queries stay quick
create index on public.shops (owner_id);
create index on public.laybys (shop_id);
create index on public.laybys (customer_id);
create index on public.instalments (layby_id);
create index on public.payments (layby_id);


-- ---------- 2. SIGN-UP TRIGGER ----------
-- when someone signs up, I copy their details into profiles
-- and if they're a shop owner I create their shop too
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_role text := coalesce(new.raw_user_meta_data ->> 'role', 'customer');
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new_role
  );

  if new_role = 'owner' then
    insert into public.shops (owner_id, name, area)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'shop_name', 'My shop'),
      new.raw_user_meta_data ->> 'shop_area'
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------- 3. HELPER FUNCTIONS FOR PERMISSIONS ----------
-- I use "security definer" helpers so the policies don't loop into each other

-- is the logged-in user the owner of this shop?
create or replace function public.owns_shop(shop uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.shops s
    where s.id = shop and s.owner_id = auth.uid()
  );
$$;

-- can the logged-in user see this lay-by? (it's their own, or it's at their shop)
create or replace function public.can_see_layby(lay uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.laybys l
    join public.shops s on s.id = l.shop_id
    where l.id = lay
      and (l.customer_id = auth.uid() or s.owner_id = auth.uid())
  );
$$;

-- does the logged-in customer have a lay-by at this shop?
create or replace function public.has_layby_at_shop(shop uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.laybys l
    where l.shop_id = shop and l.customer_id = auth.uid()
  );
$$;

-- is the logged-in user the customer on this lay-by?
create or replace function public.is_layby_customer(lay uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.laybys l
    where l.id = lay and l.customer_id = auth.uid()
  );
$$;


-- ---------- 4. ROW LEVEL SECURITY ----------
-- RLS on every table: nobody sees anything unless a policy says they can
-- (my Express server uses the service role key, which skips RLS,
--  so these policies are the second line of defence)

alter table public.profiles    enable row level security;
alter table public.shops       enable row level security;
alter table public.laybys      enable row level security;
alter table public.instalments enable row level security;
alter table public.payments    enable row level security;

-- profiles: I can see and edit my own profile
create policy "read own profile" on public.profiles
  for select using (id = auth.uid());

create policy "update own profile" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- but users may only change their name and phone, never their role or email
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone) on public.profiles to authenticated;

-- profiles: a shop owner can see the customers who have lay-bys at their shop
create policy "owner reads own customers" on public.profiles
  for select using (
    exists (
      select 1 from public.laybys l
      where l.customer_id = profiles.id and public.owns_shop(l.shop_id)
    )
  );

-- shops: owners manage their own shop, customers can see shops they have a lay-by with
create policy "owner reads own shop" on public.shops
  for select using (owner_id = auth.uid());

create policy "owner updates own shop" on public.shops
  for update using (owner_id = auth.uid());

create policy "customer reads their shops" on public.shops
  for select using (public.has_layby_at_shop(id));

-- laybys: customers see their own, owners see and manage their shop's
create policy "customer reads own laybys" on public.laybys
  for select using (customer_id = auth.uid());

create policy "owner reads shop laybys" on public.laybys
  for select using (public.owns_shop(shop_id));

create policy "owner creates shop laybys" on public.laybys
  for insert with check (public.owns_shop(shop_id));

create policy "owner updates shop laybys" on public.laybys
  for update using (public.owns_shop(shop_id));

-- instalments: anyone who can see the lay-by can see its schedule
-- (only the server creates instalments)
create policy "read instalments of visible laybys" on public.instalments
  for select using (public.can_see_layby(layby_id));

-- payments: anyone who can see the lay-by can see its payments
create policy "read payments of visible laybys" on public.payments
  for select using (public.can_see_layby(layby_id));

-- customers can only add a PENDING EFT payment to their OWN lay-by
create policy "customer adds pending eft" on public.payments
  for insert with check (
    public.is_layby_customer(layby_id)
    and method = 'eft'
    and status = 'pending'
    and created_by = auth.uid()
  );

-- owners can record cash and confirm/reject payments at their shop
create policy "owner adds payments" on public.payments
  for insert with check (
    exists (select 1 from public.laybys l where l.id = layby_id and public.owns_shop(l.shop_id))
    and created_by = auth.uid()
  );

create policy "owner reviews payments" on public.payments
  for update using (
    exists (select 1 from public.laybys l where l.id = layby_id and public.owns_shop(l.shop_id))
  );


-- ---------- 5. FILE STORAGE FOR PROOF OF PAYMENT ----------
-- private bucket: files are saved as  <layby_id>/<file name>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proofs', 'proofs', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- the customer on the lay-by can upload proof into that lay-by's folder
create policy "customer uploads own proof" on storage.objects
  for insert with check (
    bucket_id = 'proofs'
    and public.is_layby_customer(((storage.foldername(name))[1])::uuid)
  );

-- the customer and the shop owner can view the proof
create policy "read proofs of visible laybys" on storage.objects
  for select using (
    bucket_id = 'proofs'
    and public.can_see_layby(((storage.foldername(name))[1])::uuid)
  );
