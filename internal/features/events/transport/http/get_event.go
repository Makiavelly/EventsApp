package events_transport_http

import (
	"net/http"

	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type GetEventResponse EventDTOResponse

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
