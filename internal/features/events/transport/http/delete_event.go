package events_transport_http

import (
	"net/http"

	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

func (h *EventsHTTPHandler) DeleteEvent(rw http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := core_logger.FromContext(ctx)
	responseHandler := core_http_response.NewHTTPResponseHandler(log, rw)

	eventID, err := core_http_request.GetIntPathValue(r, "id")
	if err != nil {
		responseHandler.ErrorResponse(err, "failed to get eventID path value")

		return
	}

	if err := h.eventsService.DeleteEvent(ctx, eventID); err != nil {
		responseHandler.ErrorResponse(err, "failed to delete event")

		return
	}

	responseHandler.NoContentResponse()
}
