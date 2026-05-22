-- Allow OAuth users who have no local password
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
