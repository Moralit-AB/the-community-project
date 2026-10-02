-- ============================================================================
-- Storage: a public "branding" bucket for the logo and the payment QR code.
-- Anyone can view the files by URL. Only admins can upload or delete them.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "branding: admins read" on storage.objects
  for select to authenticated using (bucket_id = 'branding' and (select public.is_admin()));
create policy "branding: admins upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'branding' and (select public.is_admin()));
create policy "branding: admins update" on storage.objects
  for update to authenticated using (bucket_id = 'branding' and (select public.is_admin()));
create policy "branding: admins delete" on storage.objects
  for delete to authenticated using (bucket_id = 'branding' and (select public.is_admin()));
