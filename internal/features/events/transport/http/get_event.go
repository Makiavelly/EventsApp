package events_transport_http

import (
	"net/http"

	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type GetEventResponse EventDTOResponse

// GetEvent 	godoc
// @Summary 	Получить событие
// @Description Получить событие по ID
// @Tags 		events
// @Produce 	json
// @Param 		id path int true "ID события"
// @Success 	200 {object} GetEventResponse "Успешно полученное событие"
// @Failure 	400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure 	404 {object} core_http_response.ErrorResponse "Event not found"
// @Failure 	500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router 		/events/{id} [get]
func (h *EventsHTTPHandler) GetEvent(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	eventID, err := core_http_request.GetIntPathValue(r, "id")
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to get eventID path value")

		return
	}

	eventDomain, err := h.eventsService.GetEvent(ctx, eventID)
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to get event")

		return
	}

	response := GetEventResponse(eventDTOFromDomain(eventDomain))

	responseHandler.JSONResponse(response, http.StatusOK)
}
