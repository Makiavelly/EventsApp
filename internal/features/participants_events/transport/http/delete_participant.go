package participants_transport_http

import (
	"fmt"
	"net/http"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

// DeleteParticipant 	godoc
// @Summary 	Удалить участника события
// @Description Удалить пользователя из участников события
// @Tags 		participants_events
// @Param 		event_id query int true "ID события"
// @Param 		participant_id query int true "ID участника"
// @Success 	204 "Участник события успешно удален"
// @Failure 	400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure 	404 {object} core_http_response.ErrorResponse "Participant not found"
// @Failure 	500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router 		/participants [delete]
func (h *ParticipantsHTTPHandler) DeleteParticipant(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	eventID, participantID, err := getEventIDParticipantIDParams(r)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to get 'event_id'/'participant_id' query param")

		return
	}

	if err := h.participantsService.DeleteParticipant(ctx, eventID, participantID); err != nil {
		responseHandler.ErrorResponse(err, "failed to delete participant")

		return
	}

	responseHandler.NoContentResponse()
}

func getEventIDParticipantIDParams(r *http.Request) (int, int, error) {
	const (
		eventIDQueryParamKey       = "event_id"
		participantIDQueryParamKey = "participant_id"
	)

	eventID, err := core_http_request.GetIntQueryParam(r, eventIDQueryParamKey)
	if err != nil {
		return 0, 0, fmt.Errorf("get 'event_id' query param: %w", err)
	}
	if eventID == nil {
		return 0, 0, fmt.Errorf("'event_id' query param is required: %w", core_errors.ErrInvalidArgument)
	}

	participantID, err := core_http_request.GetIntQueryParam(r, participantIDQueryParamKey)
	if err != nil {
		return 0, 0, fmt.Errorf("get 'participant_id' query param: %w", err)
	}
	if participantID == nil {
		return 0, 0, fmt.Errorf("'participant_id' query param is required: %w", core_errors.ErrInvalidArgument)
	}

	return *eventID, *participantID, nil
}
