-- HIREHUB_AUDIT_CONTEXT.md: insufficient server-side validation around
-- uploads. All uploads go directly from the browser to Supabase Storage
-- (no API route/service-role layer exists, and adding one would be a
-- rewrite of the upload system, which is out of scope) — so the
-- enforceable server-side boundary here is Supabase Storage's own
-- bucket-level `file_size_limit` / `allowed_mime_types`, checked by the
-- Storage API itself before an object is ever written, independent of
-- whatever the browser app code does or doesn't validate client-side.
--
-- `avatars` and `portfolio-images` had NEITHER a size limit nor a MIME
-- allow-list at the bucket level — a user bypassing the app's own
-- (client-side only) 5MB/image-type checks could upload arbitrarily large
-- or arbitrarily typed files into these PUBLIC buckets. Ownership/path
-- scoping (auth.uid() prefix) was already correctly enforced by existing
-- storage.objects RLS policies and is left untouched.
--
-- `project-files` already has a correct `file_size_limit` (25 MB, matching
-- the app's own check) and intentionally has no MIME restriction, since
-- the product explicitly supports arbitrary document types (briefs,
-- images, PDFs, Word docs) for that private, RLS-gated bucket — left
-- unchanged.
update storage.buckets
set file_size_limit = 5242880, -- 5 MB, matches the app's own client-side check
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'avatars';

update storage.buckets
set file_size_limit = 5242880, -- 5 MB, matches the app's own client-side check
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'portfolio-images';
