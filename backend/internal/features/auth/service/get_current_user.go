package auth_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (s *AuthService) GetCurrentUser(
	ctx context.Context,
	userID int,
) (domain.User, error) {
	user, err := s.usersService.GetUser(ctx, userID)
	if err != nil {
		return domain.User{}, fmt.Errorf("get current user: %w", err)
	}

	return user, nil
}
