package domain

import (
	"errors"
	"strings"
	"testing"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func TestUserRegistrationNormalizesEmailBeforeValidation(t *testing.T) {
	t.Parallel()

	registration := NewUserRegistration("Alex", "  ALEX@GMAIL.COM  ", "secret12")
	if err := registration.NormalizeAndValidate(); err != nil {
		t.Fatalf("NormalizeAndValidate() error = %v", err)
	}
	if registration.User.Email != "alex@gmail.com" {
		t.Fatalf("normalized email = %q", registration.User.Email)
	}
}

func TestValidatePaginationRejectsOversizedLimit(t *testing.T) {
	t.Parallel()

	limit := MaxPageLimit + 1
	if err := ValidatePagination(&limit, nil); !errors.Is(err, core_errors.ErrInvalidArgument) {
		t.Fatalf("ValidatePagination() error = %v, want ErrInvalidArgument", err)
	}
}

func TestResolvePaginationUsesBoundedDefaults(t *testing.T) {
	t.Parallel()

	limit, offset, err := ResolvePagination(nil, nil)
	if err != nil {
		t.Fatalf("ResolvePagination() error = %v", err)
	}
	if limit != DefaultPageLimit || offset != 0 {
		t.Fatalf("ResolvePagination() = (%d, %d)", limit, offset)
	}
}

func TestUserPatchPasswordErrorNamesPassword(t *testing.T) {
	t.Parallel()

	password := "x"
	patch := NewUserPatch(Nullable[string]{}, Nullable[string]{Set: true, Value: &password})
	err := patch.Validate()
	if !errors.Is(err, core_errors.ErrInvalidArgument) || !strings.Contains(err.Error(), "Password") {
		t.Fatalf("Validate() error = %v", err)
	}
}
