package auth_postgres_repository

import (
	"context"
	"fmt"
)

func (r *AuthRepository) RevokeUserSessions(
	ctx context.Context,
	userID int,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	const query = `
	UPDATE eventsapp.auth_sessions
	SET revoked_at = COALESCE(revoked_at, now()), updated_at = now()
	WHERE user_id = $1;
	`

	if _, err := r.pool.Exec(ctx, query, userID); err != nil {
		return fmt.Errorf("revoke all refresh sessions for user: %w", err)
	}

	return nil
}
