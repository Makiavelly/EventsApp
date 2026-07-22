package health_transport_http

import (
	"context"
	"net/http"

	core_http_server "github.com/Makiavelly/EventsApp/internal/core/transport/http/server"
)

type HealthService interface {
	Ready(ctx context.Context) error
}

type Metrics interface {
	Prometheus() string
}

type HealthHTTPHandler struct {
	healthService HealthService
	metrics       Metrics
}

func NewHealthHTTPHandler(
	healthService HealthService,
	metrics Metrics,
) *HealthHTTPHandler {
	return &HealthHTTPHandler{
		healthService: healthService,
		metrics:       metrics,
	}
}

func (h *HealthHTTPHandler) Routes() []core_http_server.Route {
	return []core_http_server.Route{
		{
			Method:  http.MethodGet,
			Path:    "/health/live",
			Handler: h.Live,
		},
		{
			Method:  http.MethodGet,
			Path:    "/health/ready",
			Handler: h.Ready,
		},
		{
			Method:  http.MethodGet,
			Path:    "/metrics",
			Handler: h.GetMetrics,
		},
	}
}
