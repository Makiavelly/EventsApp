package participants_transport_http

import (
	"net/http"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type CreateParticipantRequest struct {
	EventID       int `json:"event_id" validate:"required"`
	ParticipantID int `json:"participant_id" validate:"required"`
}

type CreateParticipantResponse ParticipantDTOResponse

func (h *ParticipantsHTTPHandler) CreateParticipant(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	var request CreateParticipantRequest
	if err := core_http_request.DecodeAndValidateRequest(r, &request); err != nil {
		responseHandler.ErrorResponse(err, "failed to decode and validate HTTP request")

		return
	}

	participantDomain := domain.NewParticipantUninitialized(
		request.EventID,
		request.ParticipantID,
	)

	participantDomain, err := h.participantsService.CreateParticipant(ctx, participantDomain)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to create participant")

		return
	}

	response := CreateParticipantResponse(participantDTOFromDomain(participantDomain))

	responseHandler.JSONResponse(response, http.StatusCreated)
}
