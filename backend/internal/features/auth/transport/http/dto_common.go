package auth_transport_http

import (
	"net/http"
	"time"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

type AuthUserDTOResponse struct {
	ID    int    `json:"id"    example:"1"`
	Name  string `json:"name"  example:"Alex"`
	Email string `json:"email" example:"alex@mail.ru"`
}

type AuthDTOResponse struct {
	Token string              `json:"token"`
	User  AuthUserDTOResponse `json:"user"`
}

func authUserDTOFromDomain(user domain.User) AuthUserDTOResponse {
	return AuthUserDTOResponse{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
	}
}

func authDTOFromDomain(authentication domain.Authentication) AuthDTOResponse {
	return AuthDTOResponse{
		Token: authentication.AccessToken,
		User:  authUserDTOFromDomain(authentication.User),
	}
}

func (h *AuthHTTPHandler) setRefreshCookie(
	rw http.ResponseWriter,
	authentication domain.Authentication,
) {
	preventAuthResponseCaching(rw)
	maxAge := int(time.Until(authentication.RefreshExpiresAt).Seconds())
	if maxAge < 1 {
		maxAge = 1
	}

	http.SetCookie(rw, &http.Cookie{
		Name:     h.cookieConfig.Name,
		Value:    authentication.RefreshToken,
		Path:     refreshCookiePath,
		Domain:   h.cookieConfig.Domain,
		Expires:  authentication.RefreshExpiresAt,
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   h.cookieConfig.Secure,
		SameSite: h.cookieConfig.SameSite,
	})
}

func (h *AuthHTTPHandler) clearRefreshCookie(rw http.ResponseWriter) {
	preventAuthResponseCaching(rw)
	http.SetCookie(rw, &http.Cookie{
		Name:     h.cookieConfig.Name,
		Path:     refreshCookiePath,
		Domain:   h.cookieConfig.Domain,
		Expires:  time.Unix(1, 0),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.cookieConfig.Secure,
		SameSite: h.cookieConfig.SameSite,
	})
}

func preventAuthResponseCaching(rw http.ResponseWriter) {
	rw.Header().Set("Cache-Control", "no-store")
	rw.Header().Set("Pragma", "no-cache")
}
