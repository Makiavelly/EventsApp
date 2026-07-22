package users_service

import (
	"context"
	"fmt"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	"golang.org/x/crypto/bcrypt"
)

func (s *UsersService) CreateUser(
	ctx context.Context,
	registration domain.UserRegistration,
) (domain.User, error) {
	if err := registration.NormalizeAndValidate(); err != nil {
		return domain.User{}, fmt.Errorf("validate user registration: %w", err)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(registration.Password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return domain.User{}, fmt.Errorf("hash password: %w", err)
	}

	user, err := s.usersRepository.CreateUser(
		ctx,
		registration.User,
		string(hashedPassword),
	)
	if err != nil {
		return domain.User{}, fmt.Errorf("create user: %w", err)
	}

	return user, nil
}
