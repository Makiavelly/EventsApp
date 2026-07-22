package events_transport_http

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func TestGetEventsParamsBounds(t *testing.T) {
	request := httptest.NewRequest(
		http.MethodGet,
		"/events?west=37.1&south=55.5&east=38&north=56&limit=500&offset=0",
		nil,
	)

	_, _, _, bounds, _, _, _, limit, offset, err := getEventsParams(request)
	if err != nil {
		t.Fatalf("getEventsParams() unexpected error = %v", err)
	}
	if bounds == nil {
		t.Fatal("getEventsParams() bounds = nil")
	}
	if bounds.West != 37.1 || bounds.South != 55.5 || bounds.East != 38 || bounds.North != 56 {
		t.Fatalf("getEventsParams() bounds = %+v", bounds)
	}
	if limit == nil || *limit != 500 || offset == nil || *offset != 0 {
		t.Fatalf("getEventsParams() limit = %v, offset = %v", limit, offset)
	}
}

func TestGetEventsParamsRejectsPartialBounds(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/events?west=37.1&south=55.5", nil)

	_, _, _, _, _, _, _, _, _, err := getEventsParams(request)
	if !errors.Is(err, core_errors.ErrInvalidArgument) {
		t.Fatalf("getEventsParams() error = %v, want ErrInvalidArgument", err)
	}
}
