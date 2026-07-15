package auth_transport_http

import (
	"net/http"

	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type LoginRequest struct {
	Email    string `json:"email"    validate:"required,min=9,max=100,allowed_email" example:"alex@mail.ru"`
	Password string `json:"password" validate:"required,min=6,max=72"                example:"alexpswd"`
}

type LoginResponse AuthDTOResponse

// Login godoc
// @Summary      Войти в аккаунт
// @Description Проверить учётные данные и получить токен доступа
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body LoginRequest true "Login тело запроса"
// @Success      200 {object} LoginResponse "Успешная аутентификация"
// @Failure      400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure      401 {object} core_http_response.ErrorResponse "Unauthorized"
// @Failure      500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router       /auth/login [post]
func (h *AuthHTTPHandler) Login(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	var request LoginRequest
	if err := core_http_request.DecodeAndValidateRequest(r, &request); err != nil {
		responseHandler.ErrorResponse(err, "failed to decode and validate HTTP request")

		return
	}

	authentication, err := h.authService.Login(
		ctx,
		request.Email,
		request.Password,
	)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to login")

		return
	}

	h.setRefreshCookie(rw, authentication)
	response := LoginResponse(authDTOFromDomain(authentication))

	responseHandler.JSONResponse(response, http.StatusOK)
}
