package participants_transport_http

import (
	"fmt"
	"net/http"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_middleware "github.com/Makiavelly/EventsApp/internal/core/transport/http/middleware"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

// DeleteParticipant 	godoc
// @Summary 	Удалить участника события
// @Description Удалить пользователя из участников события
// @Tags 		participants_events
// @Param 		event_id query int true "ID события"
// @Security 	BearerAuth
// @Success 	204 "Участник события успешно удален"
// @Failure 	400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure 	404 {object} core_http_response.ErrorResponse "Participant not found"
// @Failure 	500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router 		/participants [delete]
func (h *ParticipantsHTTPHandler) DeleteParticipant(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	eventID, err := getEventIDParam(r)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to get 'event_id' query param")

		return
	}
	participantID, err := core_http_middleware.UserID(ctx)
	if err != nil {
		responseHandler.ErrorResponse(err, "authentication required")

		return
	}

	if err := h.participantsService.DeleteParticipant(ctx, eventID, participantID); err != nil {
		responseHandler.ErrorResponse(err, "failed to delete participant")

		return
	}

	responseHandler.NoContentResponse()
}

func getEventIDParam(r *http.Request) (int, error) {
	eventID, err := core_http_request.GetIntQueryParam(r, "event_id")
	if err != nil {
		return 0, fmt.Errorf("get 'event_id' query param: %w", err)
	}
	if eventID == nil {
		return 0, fmt.Errorf("'event_id' query param is required: %w", core_errors.ErrInvalidArgument)
	}

	return *eventID, nil
}
