package auth_postgres_repository

import (
	"context"
	"fmt"
)

func (r *AuthRepository) CleanupSessions(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	DELETE FROM eventsapp.auth_sessions
	WHERE expires_at < now() - interval '7 days'
		OR revoked_at < now() - interval '7 days';
	`

	if _, err := r.pool.Exec(ctx, query); err != nil {
		return fmt.Errorf("delete stale authentication sessions: %w", err)
	}

	return nil
}
