package domain

import (
	"fmt"
	"regexp"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

var emailRegex = regexp.MustCompile(
	`(?i)^[^@\s]+@(mail\.ru|gmail\.com)$`,
)

type User struct {
	ID       int
	Name     string
	Email    string
	Password string
}

func NewUser(id int, name string, email string, password string) User {
	return User{
		ID:       id,
		Name:     name,
		Email:    email,
		Password: password,
	}
}

func NewUserUninitialized(name string, email string, password string) User {
	return NewUser(UninitializedID, name, email, password)
}

func (u *User) Validate() error {
	nameLength := len([]rune(u.Name))
	if nameLength < 1 || nameLength > 100 {
		return fmt.Errorf("invalid 'Name' len: %d: %w", nameLength, core_errors.ErrInvalidArgument)
	}

	if !emailRegex.MatchString(u.Email) {
		return fmt.Errorf("invalid 'Email' format: %w", core_errors.ErrInvalidArgument)
	}

	emailLength := len([]rune(u.Email))
	if !emailRegex.MatchString(u.Email) || emailLength < 9 || emailLength > 100 {
		return fmt.Errorf("invalid 'Email' %d: %w", emailLength, core_errors.ErrInvalidArgument)
	}

	passwordLength := len([]rune(u.Password))
	if passwordLength < 6 || passwordLength > 100 {
		return fmt.Errorf("invalid 'Name' len: %d: %w", passwordLength, core_errors.ErrInvalidArgument)
	}

	return nil
}

type UserPatch struct {
	Name     Nullable[string]
	Password Nullable[string]
}

func (p *UserPatch) Validate() error {
	if p.Name.Set && p.Name.Value == nil {
		return fmt.Errorf("'Name' cant't be patched to NULL: %w", core_errors.ErrInvalidArgument)
	}

	if p.Password.Set && p.Password.Value == nil {
		return fmt.Errorf("'Name' cant't be patched to NULL: %w", core_errors.ErrInvalidArgument)
	}

	return nil
}

func (u *User) ApplyPatch(patch UserPatch) error {
	if err := patch.Validate(); err != nil {
		return fmt.Errorf("validate user patch: %w", err)
	}

	tmp := *u

	if patch.Name.Set {
		tmp.Name = *patch.Name.Value
	}

	if patch.Password.Set {
		tmp.Password = *patch.Password.Value
	}

	if err := u.Validate(); err != nil {
		return fmt.Errorf("validate patched user: %w", err)
	}

	*u = tmp

	return nil
}
