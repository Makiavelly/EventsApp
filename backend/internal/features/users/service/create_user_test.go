package users_service

import (
	"context"
	"testing"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	"golang.org/x/crypto/bcrypt"
)

type usersRepositoryStub struct {
	createdUser  domain.User
	passwordHash string
}

func (r *usersRepositoryStub) CreateUser(_ context.Context, user domain.User, passwordHash string) (domain.User, error) {
	r.createdUser = user
	r.passwordHash = passwordHash
	user.ID = 1
	return user, nil
}
func (*usersRepositoryStub) GetUsers(context.Context, *int, *int) ([]domain.User, error) {
	return nil, nil
}
func (*usersRepositoryStub) GetUser(context.Context, int) (domain.User, error) {
	return domain.User{}, nil
}
func (*usersRepositoryStub) GetUserByEmail(context.Context, string) (domain.UserAccount, error) {
	return domain.UserAccount{}, nil
}
func (*usersRepositoryStub) DeleteUser(context.Context, int) error { return nil }
func (*usersRepositoryStub) PatchUser(context.Context, int, domain.User, *string) (domain.User, error) {
	return domain.User{}, nil
}

func TestCreateUserNormalizesEmailAndHashesPassword(t *testing.T) {
	t.Parallel()

	repository := &usersRepositoryStub{}
	service := NewUsersService(repository)
	registration := domain.NewUserRegistration("Alex", "  ALEX@GMAIL.COM ", "secret12")

	user, err := service.CreateUser(context.Background(), registration)
	if err != nil {
		t.Fatalf("CreateUser() error = %v", err)
	}
	if user.Email != "alex@gmail.com" || repository.createdUser.Email != "alex@gmail.com" {
		t.Fatalf("CreateUser() email = %q, repository email = %q", user.Email, repository.createdUser.Email)
	}
	if repository.passwordHash == registration.Password {
		t.Fatal("repository received plaintext password")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(repository.passwordHash), []byte(registration.Password)); err != nil {
		t.Fatalf("stored password is not a bcrypt hash: %v", err)
	}
}
