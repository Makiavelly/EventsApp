package users_service

import (
	"context"
	"fmt"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func (s *UsersService) DeleteUser(
	ctx context.Context,
	actorUserID int,
	targetUserID int,
) error {
	if actorUserID != targetUserID {
		return fmt.Errorf(
			"cannot delete another user: %w",
			core_errors.ErrForbidden,
		)
	}

	if err := s.usersRepository.DeleteUser(ctx, targetUserID); err != nil {
		return fmt.Errorf("delete user: %w", err)
	}

	return nil
}
