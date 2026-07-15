package users_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (s *UsersService) GetUsers(
	ctx context.Context,
	limit *int,
	offset *int,
) ([]domain.User, error) {
	resolvedLimit, resolvedOffset, err := domain.ResolvePagination(limit, offset)
	if err != nil {
		return nil, fmt.Errorf("validate pagination: %w", err)
	}

	users, err := s.usersRepository.GetUsers(ctx, &resolvedLimit, &resolvedOffset)
	if err != nil {
		return nil, fmt.Errorf("get users from repository: %w", err)
	}

	return users, nil
}
