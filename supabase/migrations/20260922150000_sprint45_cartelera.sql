alter table public.community_posts add column if not exists image_url text;
alter table public.community_posts add column if not exists event_time time;
alter table public.community_posts add column if not exists location text;
alter table public.community_posts add column if not exists link_url text;
alter table public.community_posts add column if not exists updated_at timestamptz not null default now();

drop policy if exists "Authenticated users read published posts" on public.community_posts;
drop policy if exists "Public reads published community posts" on public.community_posts;
create policy "Public reads published community posts"
  on public.community_posts for select to anon, authenticated
  using (is_published = true);

create index if not exists community_posts_public_event_date_idx
  on public.community_posts (is_published, event_date);
