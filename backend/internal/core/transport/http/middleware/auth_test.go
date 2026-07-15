package core_http_middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	"go.uber.org/zap"
)

type tokenVerifierStub struct{}

func (tokenVerifierStub) Verify(string) (domain.AuthenticatedUser, error) {
	return domain.AuthenticatedUser{UserID: 7, SessionID: "session"}, nil
}

type sessionVerifierStub struct {
	err error
}

func (s sessionVerifierStub) ValidateSession(context.Context, string, int) error {
	return s.err
}

func TestAuthenticateRejectsRevokedSession(t *testing.T) {
	t.Parallel()

	called := false
	handler := Authenticate(
		tokenVerifierStub{},
		sessionVerifierStub{err: core_errors.ErrUnauthorized},
	)(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		called = true
	}))

	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.Header.Set("Authorization", "Bearer token")
	request = request.WithContext(core_logger.ToContext(
		request.Context(),
		&core_logger.Logger{Logger: zap.NewNop()},
	))
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", recorder.Code)
	}
	if called {
		t.Fatal("protected handler was called for a revoked session")
	}
}

func TestUserIDRejectsMissingIdentity(t *testing.T) {
	t.Parallel()

	_, err := UserID(context.Background())
	if !errors.Is(err, core_errors.ErrUnauthorized) {
		t.Fatalf("UserID() error = %v, want ErrUnauthorized", err)
	}
}
