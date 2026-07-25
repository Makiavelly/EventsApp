package events_transport_http

import (
	"net/http"
	"time"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_middleware "github.com/Makiavelly/EventsApp/internal/core/transport/http/middleware"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
	core_http_types "github.com/Makiavelly/EventsApp/internal/core/transport/http/types"
)

type CreateEventRequest struct {
	Title                  string                       `json:"title"        example:"Sport"`
	Description            *string                      `json:"description"  example:"Go to football"`
	Location               *core_http_types.Location    `json:"location"`
	Marker                 *EventMarkerDTO              `json:"marker"`
	DateMeeting            *time.Time                   `json:"date_meeting" example:"2026-08-10T18:00:00Z"`
	AutoDeletePolicy       domain.EventAutoDeletePolicy `json:"auto_delete_policy" example:"never"`
	AutoDeleteAfterSeconds *int                         `json:"auto_delete_after_seconds" example:"7200"`
}

func (r *CreateEventRequest) Validate() error {
	if r.AutoDeletePolicy == "" {
		r.AutoDeletePolicy = domain.EventAutoDeleteNever
	}

	event := domain.NewEventUninitializedWithPolicy(
		1,
		r.Title,
		r.Description,
		locationDomainFromDTO(r.Location),
		r.DateMeeting,
		r.AutoDeletePolicy,
		r.AutoDeleteAfterSeconds,
	)
	event.Marker = markerDomainFromDTO(r.Marker)

	return event.Validate()
}

type CreateEventResponse EventDTOResponse

// CreateEvent 	godoc
// @Summary 	Создать событие
// @Description Создать новое событие в системе
// @Tags 		events
// @Security 	BearerAuth
// @Accept 		json
// @Produce 	json
// @Param 		request body CreateEventRequest true "Create event тело запроса"
// @Success 	201 {object} CreateEventResponse "Успешно созданное событие"
// @Failure 	400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure 	401 {object} core_http_response.ErrorResponse "Unauthorized"
// @Failure 	404 {object} core_http_response.ErrorResponse "User not found"
// @Failure 	413 {object} core_http_response.ErrorResponse "Payload too large"
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
	creatorID, err := core_http_middleware.UserID(ctx)
	if err != nil {
		responseHandler.ErrorResponse(err, "authentication required")
		return
	}

	eventDomain := domain.NewEventUninitializedWithPolicy(
		creatorID,
		request.Title,
		request.Description,
		locationDomainFromDTO(request.Location),
		request.DateMeeting,
		request.AutoDeletePolicy,
		request.AutoDeleteAfterSeconds,
	)
	eventDomain.Marker = markerDomainFromDTO(request.Marker)

	eventDomain, err = h.eventsService.CreateEvent(ctx, eventDomain)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to create event")

		return
	}

	response := CreateEventResponse(eventDTOFromDomain(eventDomain))

	responseHandler.JSONResponse(response, http.StatusCreated)
}
