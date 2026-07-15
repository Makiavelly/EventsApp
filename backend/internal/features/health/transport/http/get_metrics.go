package health_transport_http

import "net/http"

func (h *HealthHTTPHandler) GetMetrics(rw http.ResponseWriter, _ *http.Request) {
	rw.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	rw.WriteHeader(http.StatusOK)
	_, _ = rw.Write([]byte(h.metrics.Prometheus()))
}
