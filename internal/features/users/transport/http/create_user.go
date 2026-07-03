package users_transport_http

import (
	"net/http"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

// dto
type CreateUserRequest struct {
	Name     string `json:"name"     validate:"required,min=1,max=100"               example:"Alex"`
	Email    string `json:"email"    validate:"required,min=9,max=100,allowed_email" example:"alex@mail.ru"`
	Password string `json:"password" validate:"required,min=6,max=100"               example:"alexpswd"`
}

type CreateUserResponse UserDTOResponse

// CreateUser 	godoc
// @Summary 	Создать пользователя
// @Description Создать нового пользователя в системе
// @Tags 		users
// @Accept 		json
// @Produce 	json
// @Param 		request body CreateUserRequest true "Create user тело запроса"
// @Success 	201 {object} CreateUserResponse "Успешно созданный пользователь"
// @Failure 	400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure 	500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router 		/users [post]
func (h *UsersHTTPHandler) CreateUser(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHendler := core_http_response.NewHTTPResponseHandler(log, rw)

	var request CreateUserRequest
	if err := core_http_request.DecodeAndValidateRequest(r, &request); err != nil {
		responseHendler.ErrorResponse(err, "failed to decode and validate HTTP request")

		return
	}

	userDomain := domainFromDTO(request)

	userDomain, err := h.usersService.CreateUser(ctx, userDomain)
	if err != nil {
		responseHendler.ErrorResponse(err, "failed to create user")

		return
	}

	response := CreateUserResponse(userDTOFromDomain(userDomain))

	responseHendler.JSONResponse(response, http.StatusCreated)
}

func domainFromDTO(dto CreateUserRequest) domain.User {
	return domain.NewUserUninitialized(dto.Name, dto.Email, dto.Password)
}
