package auth_service

import (
	"context"
	"fmt"
	"time"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (s *AuthService) startSession(
	ctx context.Context,
	user domain.User,
) (domain.Authentication, error) {
	refreshToken, err := s.refreshTokenManager.Generate("")
	if err != nil {
		return domain.Authentication{}, fmt.Errorf("generate refresh token: %w", err)
	}

	accessToken, err := s.accessTokenIssuer.Issue(user.ID, refreshToken.SessionID)
	if err != nil {
		return domain.Authentication{}, fmt.Errorf("issue access token: %w", err)
	}

	expiresAt := time.Now().UTC().Add(s.refreshTokenTTL)
	session := domain.RefreshSession{
		ID:        refreshToken.SessionID,
		UserID:    user.ID,
		TokenHash: refreshToken.Hash,
		ExpiresAt: expiresAt,
	}
	if err := s.authRepository.CreateSession(ctx, session); err != nil {
		return domain.Authentication{}, fmt.Errorf("create refresh session: %w", err)
	}

	return domain.Authentication{
		User:             user,
		AccessToken:      accessToken,
		RefreshToken:     refreshToken.Value,
		RefreshExpiresAt: expiresAt,
	}, nil
}
