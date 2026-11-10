# Mute a correspondence: what the server needs (2026-11-10)

The iOS client is built and OFF behind the `threadmute` switch (commit 604d666 on ios-1.2.3: `src/lib/thread-mute-model.ts`, the ⋯ card of a conversation and of a kindred's page). Nothing is live until the table below exists, the push sender skips muted threads, and a row turns the switch on for a binary that carries the Swift.

(a) SQL migration (number it after your latest; assumes public.threads(id uuid), which is what the app reads):
```sql
create table if not exists public.thread_mutes (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  thread_id  uuid        not null references public.threads (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);
create index if not exists thread_mutes_thread_idx on public.thread_mutes (thread_id);

alter table public.thread_mutes enable row level security;

create policy "thread_mutes: read own" on public.thread_mutes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "thread_mutes: insert own" on public.thread_mutes
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "thread_mutes: delete own" on public.thread_mutes
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.thread_mutes from anon;
grant select, insert, delete on public.thread_mutes to authenticated;
```
There is deliberately no update policy: the client mutes with `on conflict do nothing` (upsert with ignoreDuplicates) and unmutes with a delete. Optional tightening: add `and exists (select 1 from public.threads t where t.id = thread_id and (select auth.uid()) in (t.a, t.b))` to the insert check so a user can only mute a thread they are in.

(b) Push sender. Every push that is about one thread (a reply or new letter, a kindred's chat line, names traded, a room about to close, a letter's first opening) is sent to a recipient U for a thread T. Where the sender picks U's rows from push_tokens, skip U when a mute exists:
```sql
... and not exists (
  select 1 from public.thread_mutes m
  where m.user_id = <recipient U> and m.thread_id = <thread T>
)
```
The sender runs as the service role, so RLS does not get in its way. Pushes that are not about a thread (her hunger, the 8 o'clock knock) should not check it. Whether a muted thread should still raise the app badge silently is yours to decide; the client changes nothing about unread counts.

Turning it on: `threadmute` is in NATIVE_DEFAULTS as false and read with useNativeSurface, so the UI Lab chip and `?set=threadmute:swift` work for testing. In production use a row for the binary version that carries this Swift, not '*': on 1.2.4–1.2.7 the Swift report card and header ignore the new props, so the row and the bell would simply not appear (nothing breaks).


