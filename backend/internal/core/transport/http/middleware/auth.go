package core_http_middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type userIDContextKey struct{}

type TokenVerifier interface {
	Verify(token string) (domain.AuthenticatedUser, error)
}

type SessionVerifier interface {
	ValidateSession(ctx context.Context, sessionID string, userID int) error
}

func Authenticate(verifier TokenVerifier, sessions SessionVerifier) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			parts := strings.SplitN(header, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || strings.TrimSpace(parts[1]) == "" {
				unauthorized(w, r, fmt.Errorf("bearer token is required: %w", core_errors.ErrUnauthorized))
				return
			}

			identity, err := verifier.Verify(strings.TrimSpace(parts[1]))
			if err != nil {
				unauthorized(w, r, err)
				return
			}
			if err := sessions.ValidateSession(
				r.Context(),
				identity.SessionID,
				identity.UserID,
			); err != nil {
				unauthorized(w, r, err)
				return
			}

			ctx := context.WithValue(
				r.Context(),
				userIDContextKey{},
				identity.UserID,
			)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func UserID(ctx context.Context) (int, error) {
	userID, ok := ctx.Value(userIDContextKey{}).(int)
	if !ok || userID <= 0 {
		return 0, fmt.Errorf("authenticated user is missing: %w", core_errors.ErrUnauthorized)
	}
	return userID, nil
}

func unauthorized(w http.ResponseWriter, r *http.Request, err error) {
	handler := core_http_response.NewHTTPResponseHandler(core_logger.FromContext(r.Context()), w)
	handler.ErrorResponse(err, "authentication required")
}
