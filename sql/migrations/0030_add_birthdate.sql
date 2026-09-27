-- Derive age instead of storing it: muse_profiles gains a nullable birthdate so
-- the existing "Show age" privacy toggle has a real source. Age is computed on
-- read and exposed only when the owner's preferences.showAge allows it — the
-- raw date itself is never sent to another user.
ALTER TABLE public.muse_profiles
  ADD COLUMN IF NOT EXISTS birthdate date;
