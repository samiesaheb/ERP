-- Add per-user access time window and day-of-week restrictions.
-- NULL in any column means "no restriction".
-- allowed_days: comma-separated short day names, e.g. 'Mon,Tue,Wed,Thu,Fri'
-- access_time_start / access_time_end: wall-clock UTC time range (inclusive)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS access_time_start TIME,
  ADD COLUMN IF NOT EXISTS access_time_end   TIME,
  ADD COLUMN IF NOT EXISTS allowed_days      TEXT;
