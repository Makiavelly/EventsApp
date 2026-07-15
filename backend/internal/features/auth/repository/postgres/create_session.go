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
