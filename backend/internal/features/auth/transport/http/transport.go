package auth_transport_http

import (
	"context"
	"net/http"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_http_middleware "github.com/Makiavelly/EventsApp/internal/core/transport/http/middleware"
	core_http_server "github.com/Makiavelly/EventsApp/internal/core/transport/http/server"
)

type AuthService interface {
	Register(
		ctx context.Context,
		registration domain.UserRegistration,
	) (domain.Authentication, error)

	Login(
		ctx context.Context,
		email string,
		password string,
	) (domain.Authentication, error)

	Refresh(
		ctx context.Context,
		refreshToken string,
	) (domain.Authentication, error)

	Logout(
		ctx context.Context,
		refreshToken string,
	) error

	GetCurrentUser(
		ctx context.Context,
		userID int,
	) (domain.User, error)
}

type AuthHTTPHandler struct {
	authService  AuthService
	cookieConfig CookieConfig
}

func NewAuthHTTPHandler(
	authService AuthService,
	cookieConfig CookieConfig,
) *AuthHTTPHandler {
	return &AuthHTTPHandler{
		authService:  authService,
		cookieConfig: cookieConfig,
	}
}

func (h *AuthHTTPHandler) Routes(
	auth core_http_middleware.Middleware,
	rateLimit core_http_middleware.Middleware,
) []core_http_server.Route {
	return []core_http_server.Route{
		{
			Method:     http.MethodPost,
			Path:       "/auth/register",
			Handler:    h.Register,
			Middleware: []core_http_middleware.Middleware{rateLimit},
		},
		{
			Method:     http.MethodPost,
			Path:       "/auth/login",
			Handler:    h.Login,
			Middleware: []core_http_middleware.Middleware{rateLimit},
		},
		{
			Method:     http.MethodPost,
			Path:       "/auth/refresh",
			Handler:    h.Refresh,
			Middleware: []core_http_middleware.Middleware{rateLimit},
		},
		{
			Method:     http.MethodGet,
			Path:       "/auth/me",
			Handler:    h.GetCurrentUser,
			Middleware: []core_http_middleware.Middleware{auth},
		},
		{
			Method:  http.MethodPost,
			Path:    "/auth/logout",
			Handler: h.Logout,
		},
	}
}
