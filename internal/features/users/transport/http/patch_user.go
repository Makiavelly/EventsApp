package users_transport_http

import (
	"fmt"
	"net/http"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
	core_http_types "github.com/Makiavelly/EventsApp/internal/core/transport/http/types"
)

type PatchUserRequest struct {
	Name     core_http_types.Nullable[string] `json:"name"`
	Password core_http_types.Nullable[string] `json:"password"`
}

func (r *PatchUserRequest) Validate() error {
	if r.Name.Set {
		if r.Name.Value == nil {
			return fmt.Errorf("'Name' can't be NULL")
		}

		nameLen := len([]rune(*r.Name.Value))
		if nameLen < 1 || nameLen > 100 {
			return fmt.Errorf("'Name' must be between 1 and 100 symbols")
		}
	}

	if r.Password.Set {
		if r.Password.Value == nil {
			return fmt.Errorf("'Password' can't be NULL")
		}

		passwordLen := len([]rune(*r.Password.Value))
		if passwordLen < 6 || passwordLen > 100 {
			return fmt.Errorf("'Password' must be between 6 and 100 symbols")
		}
	}

	return nil
}

type PatchUserResponse UserDTOResponse

func (h *UsersHTTPHandler) PatchUser(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	userID, err := core_http_request.GetIntPathValue(r, "id")
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to get userID path value")

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

	response := PatchUserResponse(userDTOFromDomain(userDomain))

	responseHandler.JSONResponse(response, http.StatusOK)
}

func userPatchFromRequest(request PatchUserRequest) domain.UserPatch {
	return domain.NewUserPatch(
		request.Name.ToDomain(),
		request.Password.ToDomain(),
	)
}
