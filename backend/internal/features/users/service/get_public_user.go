package users_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func (s *UsersService) GetPublicUser(
	ctx context.Context,
	id int,
) (domain.PublicUser, error) {
	user, err := s.usersRepository.GetPublicUser(ctx, id)
	if err != nil {
		return domain.PublicUser{}, fmt.Errorf("get public user from repository: %w", err)
	}

	return user, nil
}
