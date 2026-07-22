package auth_service

import (
	"context"
	"errors"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	"golang.org/x/crypto/bcrypt"
)

func (s *AuthService) Login(
	ctx context.Context,
	email string,
	password string,
) (domain.Authentication, error) {
	account, err := s.usersService.GetUserByEmail(ctx, email)
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
		[]byte(account.PasswordHash),
		[]byte(password),
	); err != nil {
		return domain.Authentication{}, fmt.Errorf(
			"incorrect email or password: %w",
			core_errors.ErrUnauthorized,
		)
	}

	authentication, err := s.startSession(ctx, account.User)
	if err != nil {
		return domain.Authentication{}, fmt.Errorf("start authentication session: %w", err)
	}

	return authentication, nil
}
