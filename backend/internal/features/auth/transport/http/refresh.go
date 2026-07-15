package auth_transport_http

import (
	"fmt"
	"net/http"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type RefreshResponse AuthDTOResponse

// Refresh godoc
// @Summary      Обновить access token
// @Description Ротировать refresh token из HttpOnly cookie и выдать новый access JWT
// @Tags         auth
// @Produce      json
// @Success      200 {object} RefreshResponse "Токены обновлены"
// @Failure      401 {object} core_http_response.ErrorResponse "Unauthorized"
// @Failure      500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router       /auth/refresh [post]
func (h *AuthHTTPHandler) Refresh(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	cookie, err := r.Cookie(h.cookieConfig.Name)
	if err != nil {
		if err == http.ErrNoCookie {
			responseHandler.ErrorResponse(
				fmt.Errorf("refresh cookie is required: %w", core_errors.ErrUnauthorized),
				"authentication required",
			)

			return
		}

		responseHandler.ErrorResponse(err, "failed to read refresh cookie")

		return
	}

	authentication, err := h.authService.Refresh(ctx, cookie.Value)
	if err != nil {
		h.clearRefreshCookie(rw)
		responseHandler.ErrorResponse(err, "failed to refresh authentication")

		return
	}

	h.setRefreshCookie(rw, authentication)
	response := RefreshResponse(authDTOFromDomain(authentication))

	responseHandler.JSONResponse(response, http.StatusOK)
}
