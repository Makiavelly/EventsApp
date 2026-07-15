package auth_postgres_repository

import (
	"context"
	"fmt"
)

func (r *AuthRepository) RevokeSession(
	ctx context.Context,
	sessionID string,
	tokenHash []byte,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	UPDATE eventsapp.auth_sessions
	SET revoked_at = COALESCE(revoked_at, now()), updated_at = now()
	WHERE id = $1 AND refresh_token_hash = $2;
	`

	if _, err := r.pool.Exec(ctx, query, sessionID, tokenHash); err != nil {
		return fmt.Errorf("revoke refresh session: %w", err)
	}

	return nil
}
