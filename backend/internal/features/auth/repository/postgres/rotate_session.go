package auth_postgres_repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_postgres_pool "github.com/Makiavelly/EventsApp/internal/core/repository/postgres/pool"
)

func (r *AuthRepository) RotateSession(
	ctx context.Context,
	sessionID string,
	currentTokenHash []byte,
	newTokenHash []byte,
) (int, time.Time, error) {
	ctx, cancel := context.WithTimeout(ctx, r.pool.OpTimeout())
	defer cancel()

	query := `
	UPDATE eventsapp.auth_sessions
	SET
		refresh_token_hash = $3,
		updated_at = now()
	WHERE id = $1
		AND refresh_token_hash = $2
		AND revoked_at IS NULL
		AND expires_at > now()
	RETURNING user_id, expires_at;
	`

	var userID int
	var expiresAt time.Time
	if err := r.pool.QueryRow(
		ctx,
		query,
		sessionID,
		currentTokenHash,
		newTokenHash,
	).Scan(&userID, &expiresAt); err != nil {
		if errors.Is(err, core_postgres_pool.ErrNoRows) {
			if revokeErr := r.revokeSessionByID(ctx, sessionID); revokeErr != nil {
				return 0, time.Time{}, fmt.Errorf("revoke refresh session after rejected rotation: %w", revokeErr)
			}

			return 0, time.Time{}, fmt.Errorf("refresh session is expired, revoked, or reused: %w", core_errors.ErrUnauthorized)
		}

		return 0, time.Time{}, fmt.Errorf("rotate refresh session: %w", err)
	}

	return userID, expiresAt, nil
}

func (r *AuthRepository) revokeSessionByID(ctx context.Context, sessionID string) error {
	query := `
	UPDATE eventsapp.auth_sessions
	SET revoked_at = COALESCE(revoked_at, now()), updated_at = now()
	WHERE id = $1;
	`

	if _, err := r.pool.Exec(ctx, query, sessionID); err != nil {
		return fmt.Errorf("revoke refresh session by ID: %w", err)
	}

	return nil
}
