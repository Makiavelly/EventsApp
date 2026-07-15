package auth_transport_http

import (
	"net/http"

	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_middleware "github.com/Makiavelly/EventsApp/internal/core/transport/http/middleware"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type GetCurrentUserResponse AuthUserDTOResponse

// GetCurrentUser godoc
// @Summary      Получить текущего пользователя
// @Description Получить профиль пользователя из токена доступа
// @Tags         auth
// @Security     BearerAuth
// @Produce      json
// @Success      200 {object} GetCurrentUserResponse "Текущий пользователь"
// @Failure      401 {object} core_http_response.ErrorResponse "Unauthorized"
// @Failure      404 {object} core_http_response.ErrorResponse "User not found"
// @Failure      500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router       /auth/me [get]
func (h *AuthHTTPHandler) GetCurrentUser(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	userID, err := core_http_middleware.UserID(ctx)
	if err != nil {
		responseHandler.ErrorResponse(err, "authentication required")

		return
	}

	userDomain, err := h.authService.GetCurrentUser(ctx, userID)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to get current user")

		return
	}

	response := GetCurrentUserResponse(authUserDTOFromDomain(userDomain))

	preventAuthResponseCaching(rw)
	responseHandler.JSONResponse(response, http.StatusOK)
}
