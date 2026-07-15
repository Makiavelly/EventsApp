package auth_service

import (
	"context"
	"errors"
	"fmt"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func (s *AuthService) Logout(ctx context.Context, refreshTokenValue string) error {
	refreshToken, err := s.refreshTokenManager.Parse(refreshTokenValue)
	if err != nil {
		if errors.Is(err, core_errors.ErrUnauthorized) {
			return nil
		}

		return fmt.Errorf("parse refresh token: %w", err)
	}

	if err := s.authRepository.RevokeSession(
		ctx,
		refreshToken.SessionID,
		refreshToken.Hash,
	); err != nil {
		return fmt.Errorf("revoke refresh session: %w", err)
	}

	return nil
}
