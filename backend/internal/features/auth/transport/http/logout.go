package auth_transport_http

import (
	"net/http"

	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

// Logout godoc
// @Summary      Выйти из аккаунта
// @Description Отозвать refresh-сессию и удалить HttpOnly cookie
// @Tags         auth
// @Success      204 "Успешный выход"
// @Failure      500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router       /auth/logout [post]
func (h *AuthHTTPHandler) Logout(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	cookie, err := r.Cookie(h.cookieConfig.Name)
	h.clearRefreshCookie(rw)
	if err != nil {
		if err == http.ErrNoCookie {
			responseHandler.NoContentResponse()

			return
		}

		responseHandler.ErrorResponse(err, "failed to read refresh cookie")

		return
	}

	if err := h.authService.Logout(ctx, cookie.Value); err != nil {
		responseHandler.ErrorResponse(err, "failed to revoke refresh session")

		return
	}

	responseHandler.NoContentResponse()
}
