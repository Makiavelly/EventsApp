package auth_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (s *AuthService) Register(
	ctx context.Context,
	registration domain.UserRegistration,
) (domain.Authentication, error) {
	var authentication domain.Authentication
	err := s.transactionManager.WithTransaction(ctx, func(txCtx context.Context) error {
		user, err := s.usersService.CreateUser(txCtx, registration)
		if err != nil {
			return fmt.Errorf("register user: %w", err)
		}

		authentication, err = s.startSession(txCtx, user)
		if err != nil {
			return fmt.Errorf("start authentication session: %w", err)
		}

		return nil
	})
	if err != nil {
		return domain.Authentication{}, fmt.Errorf("register transaction: %w", err)
	}

	return authentication, nil
}
