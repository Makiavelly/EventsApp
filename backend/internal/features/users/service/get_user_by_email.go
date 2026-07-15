package users_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (s *UsersService) GetUserByEmail(
	ctx context.Context,
	email string,
) (domain.UserAccount, error) {
	account, err := s.usersRepository.GetUserByEmail(ctx, domain.NormalizeEmail(email))
	if err != nil {
		return domain.UserAccount{}, fmt.Errorf("get user by email: %w", err)
	}

	return account, nil
}
