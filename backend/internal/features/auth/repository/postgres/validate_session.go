package auth_postgres_repository

import (
	"context"
	"errors"
	"fmt"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
)

func (r *AuthRepository) ValidateSession(
	ctx context.Context,
	sessionID string,
	userID int,
) error {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	SELECT 1
	FROM eventsapp.auth_sessions
	WHERE id = $1
		AND user_id = $2
		AND revoked_at IS NULL
		AND expires_at > now();
	`

	var exists int
	if err := r.pool.QueryRow(ctx, query, sessionID, userID).Scan(&exists); err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			return fmt.Errorf("authentication session is not active: %w", core_errors.ErrUnauthorized)
		}

		return fmt.Errorf("check authentication session: %w", err)
	}

	return nil
}
