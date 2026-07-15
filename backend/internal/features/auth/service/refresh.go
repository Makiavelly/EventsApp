package auth_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (s *AuthService) Refresh(
	ctx context.Context,
	refreshTokenValue string,
) (domain.Authentication, error) {
	currentToken, err := s.refreshTokenManager.Parse(refreshTokenValue)
	if err != nil {
		return domain.Authentication{}, err
	}

	newToken, err := s.refreshTokenManager.Generate(currentToken.SessionID)
	if err != nil {
		return domain.Authentication{}, fmt.Errorf("generate rotated refresh token: %w", err)
	}

	userID, expiresAt, err := s.authRepository.RotateSession(
		ctx,
		currentToken.SessionID,
		currentToken.Hash,
		newToken.Hash,
	)
	if err != nil {
		return domain.Authentication{}, fmt.Errorf("rotate refresh session: %w", err)
	}

	user, err := s.usersService.GetUser(ctx, userID)
	if err != nil {
		return domain.Authentication{}, fmt.Errorf("get refresh session user: %w", err)
	}

	accessToken, err := s.accessTokenIssuer.Issue(user.ID)
	if err != nil {
		return domain.Authentication{}, fmt.Errorf("issue access token: %w", err)
	}

	return domain.Authentication{
		User:             user,
		AccessToken:      accessToken,
		RefreshToken:     newToken.Value,
		RefreshExpiresAt: expiresAt,
	}, nil
}
