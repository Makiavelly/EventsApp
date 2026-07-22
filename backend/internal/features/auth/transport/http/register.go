package auth_transport_http

import (
	"net/http"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type RegisterRequest struct {
	Name     string `json:"name"     example:"Alex"`
	Email    string `json:"email"    example:"alex@mail.ru"`
	Password string `json:"password" example:"alexpswd"`
}

func (r *RegisterRequest) Validate() error {
	registration := domain.NewUserRegistration(r.Name, r.Email, r.Password)
	return registration.NormalizeAndValidate()
}

type RegisterResponse AuthDTOResponse

// Register godoc
// @Summary      Зарегистрировать пользователя
// @Description Создать аккаунт и получить токен доступа
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        request body RegisterRequest true "Register тело запроса"
// @Success      201 {object} RegisterResponse "Пользователь зарегистрирован"
// @Failure      400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure      409 {object} core_http_response.ErrorResponse "Email already registered"
// @Failure      413 {object} core_http_response.ErrorResponse "Payload too large"
// @Failure      429 {object} core_http_response.ErrorResponse "Too many requests"
// @Failure      500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router       /auth/register [post]
func (h *AuthHTTPHandler) Register(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	var request RegisterRequest
	if err := core_http_request.DecodeAndValidateRequest(r, &request); err != nil {
		responseHandler.ErrorResponse(err, "failed to decode and validate HTTP request")

		return
	}

	registration := domain.NewUserRegistration(
		request.Name,
		request.Email,
		request.Password,
	)

	authentication, err := h.authService.Register(ctx, registration)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to register user")

		return
	}

	h.setRefreshCookie(rw, authentication)
	response := RegisterResponse(authDTOFromDomain(authentication))

	responseHandler.JSONResponse(response, http.StatusCreated)
}
