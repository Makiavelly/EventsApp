package events_transport_http

import (
	"net/http"
	"time"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
	core_http_types "github.com/Makiavelly/EventsApp/internal/core/transport/http/types"
)

type CreateEventRequest struct {
	CreatorUserID int                       `json:"creator_user_id" validate:"required"            example:"1"`
	Title         string                    `json:"title" validate:"required,min=1,max=50"         example:"Sport"`
	Description   *string                   `json:"description" validate:"omitempty,min=1,max=300" example:"Go to footbal"`
	Location      *core_http_types.Location `json:"location" validate:"omitempty"`
	DateMeeting   *time.Time                `json:"date_meeting" validate:"omitempty"              example:"2026-08-10T18:00:00Z"`
}

type CreateEventResponse EventDTOResponse

// CreateEvent 	godoc
// @Summary 	Создать событие
// @Description Создать новое событие в системе
// @Tags 		events
// @Accept 		json
// @Produce 	json
// @Param 		request body CreateEventRequest true "Create event тело запроса"
// @Success 	201 {object} CreateEventResponse "Успешно созданное событие"
// @Failure 	400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure 	404 {object} core_http_response.ErrorResponse "User not found"
// @Failure 	500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router 		/events [post]
func (h *EventsHTTPHandler) CreateEvent(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	var request CreateEventRequest
	if err := core_http_request.DecodeAndValidateRequest(r, &request); err != nil {
		responseHandler.ErrorResponse(err, "failed to decode and validate HTTP request")

		return
	}

	eventDomain := domain.NewEventUninitialized(
		request.CreatorUserID,
		request.Title,
		request.Description,
		locationDomainFromDTO(request.Location),
		request.DateMeeting,
	)

	eventDomain, err := h.eventsService.CreateEvent(ctx, eventDomain)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to create event")

		return
	}

	response := CreateEventResponse(eventDTOFromDomain(eventDomain))

	responseHandler.JSONResponse(response, http.StatusCreated)
}
