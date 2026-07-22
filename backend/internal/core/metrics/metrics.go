package core_metrics

import (
	"fmt"
	"sync/atomic"
	"time"
)

type Snapshot struct {
	RequestsTotal   uint64
	RequestsActive  int64
	ResponsesErrors uint64
	LatencySeconds  float64
}

type Metrics struct {
	requestsTotal   atomic.Uint64
	requestsActive  atomic.Int64
	responsesErrors atomic.Uint64
	latencyNanos    atomic.Uint64
}

func NewMetrics() *Metrics {
	return &Metrics{}
}

func (m *Metrics) StartRequest() {
	m.requestsTotal.Add(1)
	m.requestsActive.Add(1)
}

func (m *Metrics) FinishRequest(statusCode int, latency time.Duration) {
	m.requestsActive.Add(-1)
	m.latencyNanos.Add(uint64(latency))
	if statusCode >= 400 {
		m.responsesErrors.Add(1)
	}
}

func (m *Metrics) Snapshot() Snapshot {
	return Snapshot{
		RequestsTotal:   m.requestsTotal.Load(),
		RequestsActive:  m.requestsActive.Load(),
		ResponsesErrors: m.responsesErrors.Load(),
		LatencySeconds:  float64(m.latencyNanos.Load()) / float64(time.Second),
	}
}

func (m *Metrics) Prometheus() string {
	snapshot := m.Snapshot()

	return fmt.Sprintf(
		"# TYPE eventsapp_http_requests_total counter\n"+
			"eventsapp_http_requests_total %d\n"+
			"# TYPE eventsapp_http_requests_active gauge\n"+
			"eventsapp_http_requests_active %d\n"+
			"# TYPE eventsapp_http_responses_errors_total counter\n"+
			"eventsapp_http_responses_errors_total %d\n"+
			"# TYPE eventsapp_http_request_latency_seconds_total counter\n"+
			"eventsapp_http_request_latency_seconds_total %f\n",
		snapshot.RequestsTotal,
		snapshot.RequestsActive,
		snapshot.ResponsesErrors,
		snapshot.LatencySeconds,
	)
}
