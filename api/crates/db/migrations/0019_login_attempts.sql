CREATE TABLE IF NOT EXISTS login_attempts (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email          TEXT        NOT NULL,
    user_id        UUID        REFERENCES users(id) ON DELETE SET NULL,
    success        BOOLEAN     NOT NULL,
    failure_reason TEXT,       -- 'invalid_credentials' | 'access_day' | 'access_window'
    ip_address     TEXT,
    user_agent     TEXT,
    attempted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON login_attempts(email);
CREATE INDEX ON login_attempts(user_id);
CREATE INDEX ON login_attempts(attempted_at DESC);
CREATE INDEX ON login_attempts(success);
