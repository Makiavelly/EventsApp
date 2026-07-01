package participants_transport_http

import (
	"net/http"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type PatchParticipantRequest struct {
	Status string `json:"status" validate:"required"`
}

type PatchParticipantResponse ParticipantDTOResponse

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
