package core_http_middleware

import (
	"net/http"
	"time"

	core_metrics "github.com/Makiavelly/EventsApp/internal/core/metrics"
	core_http_response "github.com/Makiavelly/EventsApp/internal/core/transport/http/response"
)

func Metrics(metrics *core_metrics.Metrics) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
			responseWriter := core_http_response.NewResponseWriter(rw)
			startedAt := time.Now()
			metrics.StartRequest()

			defer func() {
				metrics.FinishRequest(
					responseWriter.GetStatusCode(),
					time.Since(startedAt),
				)
			}()

			next.ServeHTTP(responseWriter, r)
		})
	}
}
