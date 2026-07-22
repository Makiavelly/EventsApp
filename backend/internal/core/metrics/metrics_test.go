package core_metrics

import (
	"strings"
	"testing"
	"time"
)

func TestMetricsSnapshotAndPrometheus(t *testing.T) {
	t.Parallel()

	metrics := NewMetrics()
	metrics.StartRequest()
	metrics.FinishRequest(503, 250*time.Millisecond)

	snapshot := metrics.Snapshot()
	if snapshot.RequestsTotal != 1 || snapshot.RequestsActive != 0 || snapshot.ResponsesErrors != 1 {
		t.Fatalf("Snapshot() = %+v", snapshot)
	}
	if snapshot.LatencySeconds != 0.25 {
		t.Fatalf("latency = %f", snapshot.LatencySeconds)
	}
	if output := metrics.Prometheus(); !strings.Contains(output, "eventsapp_http_requests_total 1") {
		t.Fatalf("Prometheus() = %q", output)
	}
}
