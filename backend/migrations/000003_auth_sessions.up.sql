CREATE TABLE eventsapp.auth_sessions (
    id                  UUID                        PRIMARY KEY,
    user_id             BIGINT          NOT NULL    REFERENCES eventsapp.users(id) ON DELETE CASCADE,
    refresh_token_hash  BYTEA           NOT NULL    UNIQUE CHECK (octet_length(refresh_token_hash) = 32),
    expires_at          TIMESTAMPTZ     NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL    DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL    DEFAULT now(),
    revoked_at          TIMESTAMPTZ
);

CREATE INDEX auth_sessions_user_id_idx
ON eventsapp.auth_sessions (user_id);

CREATE INDEX auth_sessions_expires_at_idx
ON eventsapp.auth_sessions (expires_at);

CREATE INDEX auth_sessions_revoked_at_idx
ON eventsapp.auth_sessions (revoked_at)
WHERE revoked_at IS NOT NULL;
