package users_service

import (
	"context"
	"fmt"
	"strings"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	"golang.org/x/crypto/bcrypt"
)

func (s *UsersService) CreateUser(
	ctx context.Context,
	user domain.User,
) (domain.User, error) {
	if err := user.Validate(); err != nil {
		return domain.User{}, fmt.Errorf("validate user domain: %w", err)
	}

	user.Email = strings.ToLower(strings.TrimSpace(user.Email))
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return domain.User{}, fmt.Errorf("hash password: %w", err)
	}
	user.Password = string(hashedPassword)

	user, err = s.usersRepository.CreateUser(ctx, user)
	if err != nil {
		return domain.User{}, fmt.Errorf("create user: %w", err)
	}

	return user, nil
}
