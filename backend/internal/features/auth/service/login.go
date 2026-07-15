package auth_service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	"golang.org/x/crypto/bcrypt"
)

func (s *AuthService) Login(
	ctx context.Context,
	email string,
	password string,
) (domain.Authentication, error) {
	user, err := s.usersService.GetUserByEmail(
		ctx,
		strings.ToLower(strings.TrimSpace(email)),
	)
	if err != nil {
		if errors.Is(err, core_errors.ErrNotFound) {
			return domain.Authentication{}, fmt.Errorf(
				"incorrect email or password: %w",
				core_errors.ErrUnauthorized,
			)
		}

		return domain.Authentication{}, fmt.Errorf("get user: %w", err)
	}

	if err := bcrypt.CompareHashAndPassword(
		[]byte(user.Password),
		[]byte(password),
	); err != nil {
		user, err = s.upgradeLegacyPassword(ctx, user, password)
		if err != nil {
			return domain.Authentication{}, err
		}
	}

	authentication, err := s.startSession(ctx, user)
	if err != nil {
		return domain.Authentication{}, fmt.Errorf("start authentication session: %w", err)
	}

	return authentication, nil
}

func (s *AuthService) upgradeLegacyPassword(
	ctx context.Context,
	user domain.User,
	password string,
) (domain.User, error) {
	if user.Password != password {
		return domain.User{}, fmt.Errorf(
			"incorrect email or password: %w",
			core_errors.ErrUnauthorized,
		)
	}

	passwordValue := password
	patch := domain.NewUserPatch(
		domain.Nullable[string]{},
		domain.Nullable[string]{Value: &passwordValue, Set: true},
	)

	user, err := s.usersService.PatchUser(ctx, user.ID, patch)
	if err != nil {
		return domain.User{}, fmt.Errorf("upgrade password hash: %w", err)
	}

	return user, nil
}
