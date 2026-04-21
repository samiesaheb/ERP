-- 0013  Drop fixed role CHECK constraint so custom roles can be stored
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
