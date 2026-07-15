package users_transport_http

import (
	"fmt"
	"net/http"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_middleware "github.com/Makiavelly/EventsApp/internal/core/transport/http/middleware"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
	core_http_types "github.com/Makiavelly/EventsApp/internal/core/transport/http/types"
)

type PatchUserRequest struct {
	Name     core_http_types.Nullable[string] `json:"name"     swaggertype:"string" example:"Alex"`
	Password core_http_types.Nullable[string] `json:"password" swaggertype:"string" example:"alexpswd"`
}

func (r *PatchUserRequest) Validate() error {
	if r.Name.Set {
		if r.Name.Value == nil {
			return fmt.Errorf("'Name' can't be NULL")
		}

		if err := domain.ValidateUserName(*r.Name.Value); err != nil {
			return err
		}
	}

	if r.Password.Set {
		if r.Password.Value == nil {
			return fmt.Errorf("'Password' can't be NULL")
		}

		if err := domain.ValidateUserPassword(*r.Password.Value); err != nil {
			return err
		}
	}

	return nil
}

type PatchUserResponse PrivateUserDTOResponse

// PatchUser 	godoc
// @Summary 	Обновить пользователя
// @Description Частично обновить пользователя по ID
// @Description ###Логика обновления полей (Three-state logic):
// @Description 1. **Поле не передано**: `name` игнорируется, значение в БД не меняется
// @Description 2. **Явно передано значение**: `"name":"Alex"` - устанавливает новое имя в БД
// @Tags 		users
// @Security 	BearerAuth
// @Accept 		json
// @Produce 	json
// @Param 		id path int true "ID пользователя"
// @Param 		request body PatchUserRequest true "Patch user тело запроса"
// @Success 	200 {object} PatchUserResponse "Успешно обновленный пользователь"
// @Failure 	400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure 	401 {object} core_http_response.ErrorResponse "Unauthorized"
// @Failure 	403 {object} core_http_response.ErrorResponse "Forbidden"
// @Failure 	404 {object} core_http_response.ErrorResponse "User not found"
// @Failure 	413 {object} core_http_response.ErrorResponse "Payload too large"
// @Failure 	500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router 		/users/{id} [patch]
func (h *UsersHTTPHandler) PatchUser(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	userID, err := core_http_request.GetIntPathValue(r, "id")
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to get userID path value")

		return
	}
	authenticatedUserID, err := core_http_middleware.UserID(ctx)
	if err != nil {
		responseHandler.ErrorResponse(err, "authentication required")
		return
	}
	if authenticatedUserID != userID {
		responseHandler.ErrorResponse(fmt.Errorf("cannot update another user: %w", core_errors.ErrForbidden), "access denied")
		return
	}

	var request PatchUserRequest
	if err := core_http_request.DecodeAndValidateRequest(r, &request); err != nil {
		responseHandler.ErrorResponse(err, "failed to decode and validate HTTP request")

		return
	}

	userPatch := userPatchFromRequest(request)

	userDomain, err := h.usersService.PatchUser(ctx, userID, userPatch)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to patch user")

		return
	}

	response := PatchUserResponse(privateUserDTOFromDomain(userDomain))

	responseHandler.JSONResponse(response, http.StatusOK)
}

func userPatchFromRequest(request PatchUserRequest) domain.UserPatch {
	return domain.NewUserPatch(
		request.Name.ToDomain(),
		request.Password.ToDomain(),
	)
}
