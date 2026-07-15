package auth_postgres_repository

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (r *AuthRepository) CreateSession(
	ctx context.Context,
	session domain.RefreshSession,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	cleanupQuery := `
	DELETE FROM eventsapp.auth_sessions
	WHERE expires_at < now() - interval '7 days'
		OR revoked_at < now() - interval '7 days';
	`
	if _, err := r.pool.Exec(ctx, cleanupQuery); err != nil {
		return fmt.Errorf("clean up expired refresh sessions: %w", err)
	}

	query := `
	INSERT INTO eventsapp.auth_sessions (
		id,
		user_id,
		refresh_token_hash,
		expires_at
	)
	VALUES ($1, $2, $3, $4);
	`

	if _, err := r.pool.Exec(
		ctx,
		query,
		session.ID,
		session.UserID,
		session.TokenHash,
		session.ExpiresAt,
	); err != nil {
		return fmt.Errorf("insert refresh session: %w", err)
	}

	return nil
}
