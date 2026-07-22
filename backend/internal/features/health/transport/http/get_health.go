package health_transport_http

import (
	"net/http"

	core_logger "github.com/Makiavelly/EventsApp/internal/core/logger"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

type healthResponse struct {
	Status string `json:"status"`
}

func (h *HealthHTTPHandler) Live(rw http.ResponseWriter, r *http.Request) {
	handler := core_http_response.NewHTTPResponseHandler(
		core_logger.FromContext(r.Context()),
		rw,
	)
	handler.JSONResponse(healthResponse{Status: "ok"}, http.StatusOK)
}

func (h *HealthHTTPHandler) Ready(rw http.ResponseWriter, r *http.Request) {
	handler := core_http_response.NewHTTPResponseHandler(
		core_logger.FromContext(r.Context()),
		rw,
	)

	if err := h.healthService.Ready(r.Context()); err != nil {
		handler.ErrorResponse(err, "service is not ready")
		return
	}

	handler.JSONResponse(healthResponse{Status: "ready"}, http.StatusOK)
}
