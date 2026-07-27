package domain

import (
	"fmt"
	"regexp"
	"strings"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

const (
	UserNameMinLength     = 1
	UserNameMaxLength     = 100
	UserEmailMinLength    = 9
	UserEmailMaxLength    = 100
	UserPasswordMinLength = 6
	UserPasswordMaxLength = 72
)

var emailRegex = regexp.MustCompile(
	"(?i)^[^@\\s]+@(mail\\.ru|gmail\\.com)$",
)

type User struct {
	ID    int
	Name  string
	Email string
}

type PublicUser struct {
	ID   int
	Name string
}

type UserAccount struct {
	User         User
	PasswordHash string
}

type UserRegistration struct {
	User     User
	Password string
}

func NewUser(id int, name string, email string) User {
	return User{
		ID:    id,
		Name:  name,
		Email: email,
	}
}

func NewPublicUser(id int, name string) PublicUser {
	return PublicUser{
		ID:   id,
		Name: name,
	}
}

func NewUserUninitialized(name string, email string) User {
	return NewUser(UninitializedID, name, email)
}

func NewUserRegistration(name string, email string, password string) UserRegistration {
	return UserRegistration{
		User:     NewUserUninitialized(name, email),
		Password: password,
	}
}

func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func ValidateUserName(name string) error {
	nameLength := len([]rune(name))
	if nameLength < UserNameMinLength || nameLength > UserNameMaxLength {
		return fmt.Errorf(
			"invalid 'Name' length: %d: %w",
			nameLength,
			core_errors.ErrInvalidArgument,
		)
	}

	return nil
}

func ValidateUserEmail(email string) error {
	emailLength := len([]rune(email))
	if !emailRegex.MatchString(email) ||
		emailLength < UserEmailMinLength ||
		emailLength > UserEmailMaxLength {
		return fmt.Errorf(
			"invalid 'Email' format or length: %d: %w",
			emailLength,
			core_errors.ErrInvalidArgument,
		)
	}

	return nil
}

func ValidateUserPassword(password string) error {
	passwordLength := len([]rune(password))
	if passwordLength < UserPasswordMinLength || passwordLength > UserPasswordMaxLength {
		return fmt.Errorf(
			"invalid 'Password' length: %d: %w",
			passwordLength,
			core_errors.ErrInvalidArgument,
		)
	}

	return nil
}

func (u *User) Validate() error {
	if err := ValidateUserName(u.Name); err != nil {
		return err
	}

	if err := ValidateUserEmail(u.Email); err != nil {
		return err
	}

	return nil
}

func (r *UserRegistration) NormalizeAndValidate() error {
	r.User.Email = NormalizeEmail(r.User.Email)

	if err := r.User.Validate(); err != nil {
		return err
	}

	return ValidateUserPassword(r.Password)
}

type UserPatch struct {
	Name     Nullable[string]
	Password Nullable[string]
}

func NewUserPatch(name Nullable[string], password Nullable[string]) UserPatch {
	return UserPatch{
		Name:     name,
		Password: password,
	}
}

func (p *UserPatch) Validate() error {
	if p.Name.Set {
		if p.Name.Value == nil {
			return fmt.Errorf("'Name' can't be patched to NULL: %w", core_errors.ErrInvalidArgument)
		}

		if err := ValidateUserName(*p.Name.Value); err != nil {
			return err
		}
	}

	if p.Password.Set {
		if p.Password.Value == nil {
			return fmt.Errorf("'Password' can't be patched to NULL: %w", core_errors.ErrInvalidArgument)
		}

		if err := ValidateUserPassword(*p.Password.Value); err != nil {
			return err
		}
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

	if err := tmp.Validate(); err != nil {
		return fmt.Errorf("validate patched user: %w", err)
	}

	*u = tmp

	return nil
}
