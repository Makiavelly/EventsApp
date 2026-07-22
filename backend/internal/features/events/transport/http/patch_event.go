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

type PatchEventRequest struct {
	Title                  core_http_types.Nullable[string]                       `json:"title"        swaggertype:"string" example:"Meetup"`
	Description            core_http_types.Nullable[string]                       `json:"description"  swaggertype:"string" example:"Discuss Go backend development"`
	Location               core_http_types.Nullable[core_http_types.Location]     `json:"location"     swaggertype:"object"`
	DateMeeting            core_http_types.Nullable[time.Time]                    `json:"date_meeting" swaggertype:"string" format:"date-time" example:"2026-08-10T18:00:00Z"`
	AutoDeletePolicy       core_http_types.Nullable[domain.EventAutoDeletePolicy] `json:"auto_delete_policy" swaggertype:"string" example:"never"`
	AutoDeleteAfterSeconds core_http_types.Nullable[int]                          `json:"auto_delete_after_seconds" swaggertype:"integer" example:"7200"`
}

func (r *PatchEventRequest) Validate() error {
	patch := eventPatchFromRequest(*r)
	return patch.Validate()
}

type PatchEventResponse EventDTOResponse

// PatchEvent 	godoc
// @Summary 	Обновить событие
// @Description Частично обновить событие по ID
// @Description ###Логика обновления полей (Three-state logic):
// @Description 1. **Поле не передано**: поле игнорируется, значение в БД не меняется
// @Description 2. **Явно передано значение**: `"title":"Meetup"` - устанавливает новое значение в БД
// @Description 3. **Явно передан null**: nullable-поля очищаются в БД
// @Tags 		events
// @Security 	BearerAuth
// @Accept 		json
// @Produce 	json
// @Param 		id path int true "ID события"
// @Param 		request body PatchEventRequest true "Patch event тело запроса"
// @Success 	200 {object} PatchEventResponse "Успешно обновленное событие"
// @Failure 	400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure 	401 {object} core_http_response.ErrorResponse "Unauthorized"
// @Failure 	403 {object} core_http_response.ErrorResponse "Forbidden"
// @Failure 	404 {object} core_http_response.ErrorResponse "Event not found"
// @Failure 	413 {object} core_http_response.ErrorResponse "Payload too large"
// @Failure 	500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router 		/events/{id} [patch]
func (h *EventsHTTPHandler) PatchEvent(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	eventID, err := core_http_request.GetIntPathValue(r, "id")
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to get eventID path value")

		return
	}
	actorUserID, err := core_http_middleware.UserID(ctx)
	if err != nil {
		responseHandler.ErrorResponse(err, "authentication required")

		return
	}

	var request PatchEventRequest
	if err := core_http_request.DecodeAndValidateRequest(r, &request); err != nil {
		responseHandler.ErrorResponse(err, "failed to decode and validate HTTP request")

		return
	}

	eventPatch := eventPatchFromRequest(request)

	eventDomain, err := h.eventsService.PatchEvent(ctx, eventID, actorUserID, eventPatch)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to patch event")

		return
	}

	response := PatchEventResponse(eventDTOFromDomain(eventDomain))

	responseHandler.JSONResponse(response, http.StatusOK)
}

func eventPatchFromRequest(request PatchEventRequest) domain.EventPatch {
	return domain.NewEventPatchWithPolicy(
		request.Title.ToDomain(),
		request.Description.ToDomain(),
		core_http_types.MapNullable(
			request.Location,
			func(location core_http_types.Location) domain.EventLocation {
				return location.ToDomain()
			},
		),
		request.DateMeeting.ToDomain(),
		request.AutoDeletePolicy.ToDomain(),
		request.AutoDeleteAfterSeconds.ToDomain(),
	)
}
