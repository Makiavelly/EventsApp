package users_transport_http

import (
	"fmt"
	"net/http"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_middleware "github.com/Makiavelly/EventsApp/internal/core/transport/http/middleware"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

// DeleteUser 	godoc
// @Summary 	Удалить пользователя
// @Description Удалить пользователя по ID
// @Tags 		users
// @Security 	BearerAuth
// @Param 		id path int true "ID пользователя"
// @Success 	204 "Пользователь успешно удален"
// @Failure 	400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure 	401 {object} core_http_response.ErrorResponse "Unauthorized"
// @Failure 	403 {object} core_http_response.ErrorResponse "Forbidden"
// @Failure 	404 {object} core_http_response.ErrorResponse "User not found"
// @Failure 	500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router 		/users/{id} [delete]
func (h *UsersHTTPHandler) DeleteUser(rw http.ResponseWriter, r *http.Request) {
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
		responseHandler.ErrorResponse(fmt.Errorf("cannot delete another user: %w", core_errors.ErrForbidden), "access denied")
		return
	}

	if err := h.usersService.DeleteUser(ctx, userID); err != nil {
		responseHandler.ErrorResponse(err, "failed to delete user")

		return
	}

	responseHandler.NoContentResponse()
}
