package events_transport_http

import (
	"net/http"

	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_middleware "github.com/Makiavelly/EventsApp/internal/core/transport/http/middleware"
	core_http_request "github.com/Makiavelly/EventsApp/internal/core/transport/http/request"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

// DeleteEvent 	godoc
// @Summary 	Удалить событие
// @Description Удалить событие по ID
// @Tags 		events
// @Security 	BearerAuth
// @Param 		id path int true "ID события"
// @Success 	204 "Событие успешно удалено"
// @Failure 	400 {object} core_http_response.ErrorResponse "Bad request"
// @Failure 	404 {object} core_http_response.ErrorResponse "Event not found"
// @Failure 	500 {object} core_http_response.ErrorResponse "Internal server error"
// @Router 		/events/{id} [delete]
func (h *EventsHTTPHandler) DeleteEvent(rw http.ResponseWriter, r *http.Request) {
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

	if err := h.eventsService.DeleteEvent(ctx, eventID, actorUserID); err != nil {
		responseHandler.ErrorResponse(err, "failed to delete event")

		return
	}

	responseHandler.NoContentResponse()
}
