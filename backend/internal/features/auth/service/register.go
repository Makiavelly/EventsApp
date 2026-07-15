package auth_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (s *AuthService) Register(
	ctx context.Context,
	user domain.User,
) (domain.Authentication, error) {
	user, err := s.usersService.CreateUser(ctx, user)
	if err != nil {
		return domain.Authentication{}, fmt.Errorf("register user: %w", err)
	}

	authentication, err := s.startSession(ctx, user)
	if err != nil {
		return domain.Authentication{}, fmt.Errorf("start authentication session: %w", err)
	}

	return authentication, nil
}
