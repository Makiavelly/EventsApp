package auth_service

import (
	"context"
	"errors"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
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

	var (
		authentication domain.Authentication
		rotationError  error
	)

	err = s.transactionManager.WithTransaction(ctx, func(txCtx context.Context) error {
		userID, expiresAt, err := s.authRepository.RotateSession(
			txCtx,
			currentToken.SessionID,
			currentToken.Hash,
			newToken.Hash,
		)
		if err != nil {
			if errors.Is(err, core_errors.ErrUnauthorized) {
				rotationError = err
				return nil
			}

			return fmt.Errorf("rotate refresh session: %w", err)
		}

		user, err := s.usersService.GetUser(txCtx, userID)
		if err != nil {
			return fmt.Errorf("get refresh session user: %w", err)
		}

		accessToken, err := s.accessTokenIssuer.Issue(user.ID, currentToken.SessionID)
		if err != nil {
			return fmt.Errorf("issue access token: %w", err)
		}

		authentication = domain.Authentication{
			User:             user,
			AccessToken:      accessToken,
			RefreshToken:     newToken.Value,
			RefreshExpiresAt: expiresAt,
		}

		return nil
	})
	if err != nil {
		return domain.Authentication{}, fmt.Errorf("refresh transaction: %w", err)
	}
	if rotationError != nil {
		return domain.Authentication{}, fmt.Errorf(
			"rotate refresh session: %w",
			rotationError,
		)
	}

	return authentication, nil
}
