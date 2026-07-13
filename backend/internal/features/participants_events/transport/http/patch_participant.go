package participants_transport_http

import (
	"net/http"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type PatchParticipantRequest struct {
	Status string `json:"status" validate:"required" example:"over"`
}

type PatchParticipantResponse ParticipantDTOResponse

// PatchParticipant 	godoc
// @Summary 	Обновить участника события
// @Description Обновить статус участника события
// @Tags 		participants_events
// @Accept 		json
// @Produce 	json
// @Param 		event_id query int true "ID события"
// @Param 		participant_id query int true "ID участника"
// @Param 		request body PatchParticipantRequest true "Patch participant тело запроса"
// @Success 	200 {object} PatchParticipantResponse "Успешно обновленный участник события"
// @Failure 	400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure 	404 {object} core_http_response.ErrorResponse "Participant not found"
// @Failure 	500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router 		/participants [patch]
func (h *ParticipantsHTTPHandler) PatchParticipant(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	eventID, participantID, err := getEventIDParticipantIDParams(r)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to get 'event_id'/'participant_id' query param")

		return
	}

	var request PatchParticipantRequest
	if err := core_http_request.DecodeAndValidateRequest(r, &request); err != nil {
		responseHandler.ErrorResponse(err, "failed to decode and validate HTTP request")

		return
	}

	participantDomain := domain.NewParticipant(eventID, participantID, request.Status)

	participantDomain, err = h.participantsService.PatchParticipant(
		ctx,
		eventID,
		participantID,
		participantDomain,
	)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to patch participant")

		return
	}

	response := PatchParticipantResponse(participantDTOFromDomain(participantDomain))

	responseHandler.JSONResponse(response, http.StatusOK)
}
