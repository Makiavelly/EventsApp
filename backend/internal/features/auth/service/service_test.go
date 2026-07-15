package auth_service

import (
	"context"
	"errors"
	"testing"
	"time"

	core_auth "github.com/Makiavelly/EventsApp/internal/core/auth"
	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

const testSessionID = "d20cbd4b-4c66-471f-a858-cba5d417a15f"

type authUsersStub struct {
	account domain.UserAccount
}

func (*authUsersStub) CreateUser(_ context.Context, registration domain.UserRegistration) (domain.User, error) {
	registration.User.ID = 1
	return registration.User, nil
}
func (*authUsersStub) GetUser(context.Context, int) (domain.User, error) {
	return domain.User{}, nil
}
func (s *authUsersStub) GetUserByEmail(context.Context, string) (domain.UserAccount, error) {
	return s.account, nil
}

type authRepositoryStub struct {
	createSessionError error
	createCalls        int
}

func (s *authRepositoryStub) CreateSession(context.Context, domain.RefreshSession) error {
	s.createCalls++
	return s.createSessionError
}
func (*authRepositoryStub) RotateSession(context.Context, string, []byte, []byte) (int, time.Time, error) {
	return 0, time.Time{}, nil
}
func (*authRepositoryStub) RevokeSession(context.Context, string, []byte) error { return nil }
func (*authRepositoryStub) ValidateSession(context.Context, string, int) error  { return nil }
func (*authRepositoryStub) CleanupSessions(context.Context) error               { return nil }

type tokenIssuerStub struct {
	calls int
}

func (s *tokenIssuerStub) Issue(int, string) (string, error) {
	s.calls++
	return "access-token", nil
}

type refreshManagerStub struct{}

func (refreshManagerStub) Generate(string) (core_auth.RefreshToken, error) {
	return core_auth.RefreshToken{SessionID: testSessionID, Value: "refresh-token", Hash: []byte("hash")}, nil
}
func (refreshManagerStub) Parse(string) (core_auth.RefreshToken, error) {
	return core_auth.RefreshToken{}, nil
}

type transactionManagerStub struct {
	calls int
}

func (s *transactionManagerStub) WithTransaction(ctx context.Context, operation func(context.Context) error) error {
	s.calls++
	return operation(ctx)
}

func TestRegisterUsesTransactionBoundary(t *testing.T) {
	t.Parallel()

	sessionError := errors.New("database unavailable")
	repository := &authRepositoryStub{createSessionError: sessionError}
	transactions := &transactionManagerStub{}
	service := NewAuthService(
		&authUsersStub{},
		repository,
		&tokenIssuerStub{},
		refreshManagerStub{},
		time.Hour,
		transactions,
	)

	_, err := service.Register(
		context.Background(),
		domain.NewUserRegistration("Alex", "alex@gmail.com", "secret12"),
	)
	if !errors.Is(err, sessionError) {
		t.Fatalf("Register() error = %v, want session error", err)
	}
	if transactions.calls != 1 || repository.createCalls != 1 {
		t.Fatalf("Register() transaction calls = %d, session calls = %d", transactions.calls, repository.createCalls)
	}
}

func TestLoginRejectsLegacyPlaintextPassword(t *testing.T) {
	t.Parallel()

	issuer := &tokenIssuerStub{}
	service := NewAuthService(
		&authUsersStub{account: domain.UserAccount{
			User:         domain.NewUser(1, "Alex", "alex@gmail.com"),
			PasswordHash: "secret12",
		}},
		&authRepositoryStub{},
		issuer,
		refreshManagerStub{},
		time.Hour,
		&transactionManagerStub{},
	)

	_, err := service.Login(context.Background(), "alex@gmail.com", "secret12")
	if !errors.Is(err, core_errors.ErrUnauthorized) {
		t.Fatalf("Login() error = %v, want ErrUnauthorized", err)
	}
	if issuer.calls != 0 {
		t.Fatalf("Login() issued %d tokens", issuer.calls)
	}
}
