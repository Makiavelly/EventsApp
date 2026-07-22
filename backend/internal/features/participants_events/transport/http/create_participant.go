package participants_transport_http

import (
	"fmt"
	"net/http"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_middleware "github.com/Makiavelly/EventsApp/internal/core/transport/http/middleware"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type CreateParticipantRequest struct {
	EventID int `json:"event_id" example:"1"`
}

func (r *CreateParticipantRequest) Validate() error {
	if r.EventID <= 0 {
		return fmt.Errorf("'event_id' must be positive")
	}

	return nil
}

type CreateParticipantResponse ParticipantDTOResponse

// CreateParticipant 	godoc
// @Summary 			Добавить участника события
// @Description 		Добавить пользователя в участники события
// @Tags 				participants_events
// @Security 			BearerAuth
// @Accept 				json
// @Produce 			json
// @Param 				request body CreateParticipantRequest true "Create participant тело запроса"
// @Success 			201 {object} CreateParticipantResponse "Успешно созданный участник события"
// @Failure 			400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure 			401 {object} core_http_response.ErrorResponse "Unauthorized"
// @Failure 			404 {object} core_http_response.ErrorResponse "User not found"
// @Failure 			409 {object} core_http_response.ErrorResponse "Conflict"
// @Failure 			413 {object} core_http_response.ErrorResponse "Payload too large"
// @Failure 			500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router 				/participants [post]
func (h *ParticipantsHTTPHandler) CreateParticipant(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	var request CreateParticipantRequest
	if err := core_http_request.DecodeAndValidateRequest(r, &request); err != nil {
		responseHandler.ErrorResponse(err, "failed to decode and validate HTTP request")

		return
	}
	participantID, err := core_http_middleware.UserID(ctx)
	if err != nil {
		responseHandler.ErrorResponse(err, "authentication required")
		return
	}

	participantDomain := domain.NewParticipant(
		request.EventID,
		participantID,
	)

	participantDomain, err = h.participantsService.CreateParticipant(ctx, participantDomain)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to create participant")

		return
	}

	response := CreateParticipantResponse(participantDTOFromDomain(participantDomain))

	responseHandler.JSONResponse(response, http.StatusCreated)
}
