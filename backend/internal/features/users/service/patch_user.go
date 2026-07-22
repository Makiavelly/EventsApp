package users_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	"golang.org/x/crypto/bcrypt"
)

func (s *UsersService) PatchUser(
	ctx context.Context,
	id int,
	patch domain.UserPatch,
) (domain.User, error) {
	user, err := s.usersRepository.GetUser(ctx, id)
	if err != nil {
		return domain.User{}, fmt.Errorf("get user: %w", err)
	}

	if err := user.ApplyPatch(patch); err != nil {
		return domain.User{}, fmt.Errorf("apply user patch: %w", err)
	}

	var passwordHash *string
	if patch.Password.Set {
		hashedPassword, err := bcrypt.GenerateFromPassword(
			[]byte(*patch.Password.Value),
			bcrypt.DefaultCost,
		)
		if err != nil {
			return domain.User{}, fmt.Errorf("hash password: %w", err)
		}

		hash := string(hashedPassword)
		passwordHash = &hash
	}

	patchedUser, err := s.usersRepository.PatchUser(ctx, id, user, passwordHash)
	if err != nil {
		return domain.User{}, fmt.Errorf("patch user: %w", err)
	}

	return patchedUser, nil
}
