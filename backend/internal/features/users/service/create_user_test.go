package users_service

import (
	"context"
	"errors"
	"testing"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	"golang.org/x/crypto/bcrypt"
)

type usersRepositoryStub struct {
	user         domain.User
	createdUser  domain.User
	passwordHash string
	getCalls     int
	patchCalls   int
	deleteCalls  int
	patchError   error
}

func (r *usersRepositoryStub) CreateUser(_ context.Context, user domain.User, passwordHash string) (domain.User, error) {
	r.createdUser = user
	r.passwordHash = passwordHash
	user.ID = 1
	return user, nil
}
func (*usersRepositoryStub) GetPublicUsers(context.Context, *int, *int) ([]domain.PublicUser, error) {
	return nil, nil
}
func (*usersRepositoryStub) GetPublicUser(context.Context, int) (domain.PublicUser, error) {
	return domain.PublicUser{}, nil
}
func (r *usersRepositoryStub) GetUser(context.Context, int) (domain.User, error) {
	r.getCalls++
	return r.user, nil
}
func (*usersRepositoryStub) GetUserByEmail(context.Context, string) (domain.UserAccount, error) {
	return domain.UserAccount{}, nil
}
func (r *usersRepositoryStub) DeleteUser(context.Context, int) error {
	r.deleteCalls++
	return nil
}
func (r *usersRepositoryStub) PatchUser(_ context.Context, _ int, user domain.User, passwordHash *string) (domain.User, error) {
	r.patchCalls++
	if r.patchError != nil {
		return domain.User{}, r.patchError
	}
	if passwordHash != nil {
		r.passwordHash = *passwordHash
	}
	r.user = user
	return user, nil
}

type sessionRevokerStub struct {
	calls int
	err   error
}

func (s *sessionRevokerStub) RevokeUserSessions(context.Context, int) error {
	s.calls++
	return s.err
}

type usersTransactionManagerStub struct {
	calls int
}

func (s *usersTransactionManagerStub) WithTransaction(
	ctx context.Context,
	operation func(context.Context) error,
) error {
	s.calls++
	return operation(ctx)
}

func TestCreateUserNormalizesEmailAndHashesPassword(t *testing.T) {
	t.Parallel()

	repository := &usersRepositoryStub{}
	service := NewUsersService(
		repository,
		&sessionRevokerStub{},
		&usersTransactionManagerStub{},
	)
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

func TestPatchUserRejectsDifferentActorBeforeRepository(t *testing.T) {
	t.Parallel()

	repository := &usersRepositoryStub{}
	revoker := &sessionRevokerStub{}
	transactions := &usersTransactionManagerStub{}
	service := NewUsersService(repository, revoker, transactions)

	_, err := service.PatchUser(
		context.Background(),
		2,
		1,
		domain.UserPatch{},
	)
	if !errors.Is(err, core_errors.ErrForbidden) {
		t.Fatalf("PatchUser() error = %v, want ErrForbidden", err)
	}
	if repository.getCalls != 0 || repository.patchCalls != 0 {
		t.Fatalf(
			"repository calls = get %d, patch %d; want zero",
			repository.getCalls,
			repository.patchCalls,
		)
	}
	if revoker.calls != 0 || transactions.calls != 0 {
		t.Fatalf(
			"side effect calls = revoke %d, transaction %d; want zero",
			revoker.calls,
			transactions.calls,
		)
	}
}

func TestDeleteUserRejectsDifferentActorBeforeRepository(t *testing.T) {
	t.Parallel()

	repository := &usersRepositoryStub{}
	service := NewUsersService(
		repository,
		&sessionRevokerStub{},
		&usersTransactionManagerStub{},
	)

	err := service.DeleteUser(context.Background(), 2, 1)
	if !errors.Is(err, core_errors.ErrForbidden) {
		t.Fatalf("DeleteUser() error = %v, want ErrForbidden", err)
	}
	if repository.deleteCalls != 0 {
		t.Fatalf("DeleteUser() repository calls = %d, want zero", repository.deleteCalls)
	}
}

func TestPatchUserNameOnlyKeepsSessions(t *testing.T) {
	t.Parallel()

	repository := &usersRepositoryStub{
		user: domain.NewUser(1, "Old name", "user@gmail.com"),
	}
	revoker := &sessionRevokerStub{}
	transactions := &usersTransactionManagerStub{}
	service := NewUsersService(repository, revoker, transactions)
	name := "New name"

	patched, err := service.PatchUser(
		context.Background(),
		1,
		1,
		domain.NewUserPatch(
			domain.Nullable[string]{Set: true, Value: &name},
			domain.Nullable[string]{},
		),
	)
	if err != nil {
		t.Fatalf("PatchUser() error = %v", err)
	}
	if patched.Name != name {
		t.Fatalf("PatchUser() name = %q, want %q", patched.Name, name)
	}
	if revoker.calls != 0 || transactions.calls != 0 {
		t.Fatalf(
			"name-only calls = revoke %d, transaction %d; want zero",
			revoker.calls,
			transactions.calls,
		)
	}
}

func TestPatchUserPasswordRevokesSessionsInTransaction(t *testing.T) {
	t.Parallel()

	repository := &usersRepositoryStub{
		user: domain.NewUser(1, "Alex", "user@gmail.com"),
	}
	revoker := &sessionRevokerStub{}
	transactions := &usersTransactionManagerStub{}
	service := NewUsersService(repository, revoker, transactions)
	password := "new-secret"

	_, err := service.PatchUser(
		context.Background(),
		1,
		1,
		domain.NewUserPatch(
			domain.Nullable[string]{},
			domain.Nullable[string]{Set: true, Value: &password},
		),
	)
	if err != nil {
		t.Fatalf("PatchUser() error = %v", err)
	}
	if transactions.calls != 1 || revoker.calls != 1 {
		t.Fatalf(
			"password calls = transaction %d, revoke %d; want 1, 1",
			transactions.calls,
			revoker.calls,
		)
	}
	if err := bcrypt.CompareHashAndPassword(
		[]byte(repository.passwordHash),
		[]byte(password),
	); err != nil {
		t.Fatalf("repository password is not the new bcrypt hash: %v", err)
	}
}

func TestPatchUserFailureDoesNotRevokeSessions(t *testing.T) {
	t.Parallel()

	patchError := errors.New("write failed")
	repository := &usersRepositoryStub{
		user:       domain.NewUser(1, "Alex", "user@gmail.com"),
		patchError: patchError,
	}
	revoker := &sessionRevokerStub{}
	service := NewUsersService(
		repository,
		revoker,
		&usersTransactionManagerStub{},
	)
	password := "new-secret"

	_, err := service.PatchUser(
		context.Background(),
		1,
		1,
		domain.NewUserPatch(
			domain.Nullable[string]{},
			domain.Nullable[string]{Set: true, Value: &password},
		),
	)
	if !errors.Is(err, patchError) {
		t.Fatalf("PatchUser() error = %v, want patch error", err)
	}
	if revoker.calls != 0 {
		t.Fatalf("PatchUser() revoke calls = %d, want zero", revoker.calls)
	}
}
