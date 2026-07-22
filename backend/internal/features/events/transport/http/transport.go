package events_transport_http

import (
	"context"
	"net/http"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_http_middleware "github.com/Makiavelly/EventsApp/internal/core/transport/http/middleware"
	core_http_server "github.com/Makiavelly/EventsApp/internal/core/transport/http/server"
)

type EventsHTTPHandler struct {
	eventsService EventsService
}

type EventsService interface {
	CreateEvent(
		ctx context.Context,
		event domain.Event,
	) (domain.Event, error)

	GetEvents(
		ctx context.Context,
		latitude *float64,
		longitude *float64,
		radius *int,
		bounds *domain.EventBounds,
		creatorID *int,
		participantID *int,
		withoutLocation bool,
		limit *int,
		offset *int,
	) ([]domain.Event, error)

	GetEvent(
		ctx context.Context,
		id int,
	) (domain.Event, error)

	DeleteEvent(
		ctx context.Context,
		id int,
		actorUserID int,
	) error

	PatchEvent(
		ctx context.Context,
		id int,
		actorUserID int,
		patch domain.EventPatch,
	) (domain.Event, error)
}

func NewEventsHTTPHandler(eventsService EventsService) *EventsHTTPHandler {
	return &EventsHTTPHandler{eventsService: eventsService}
}

func (h *EventsHTTPHandler) Routes(auth core_http_middleware.Middleware) []core_http_server.Route {
	return []core_http_server.Route{
		{
			Method:     http.MethodPost,
			Path:       "/events",
			Handler:    h.CreateEvent,
			Middleware: []core_http_middleware.Middleware{auth},
		},
		{
			Method:  http.MethodGet,
			Path:    "/events",
			Handler: h.GetEvents,
		},
		{
			Method:  http.MethodGet,
			Path:    "/events/{id}",
			Handler: h.GetEvent,
		},
		{
			Method:     http.MethodDelete,
			Path:       "/events/{id}",
			Handler:    h.DeleteEvent,
			Middleware: []core_http_middleware.Middleware{auth},
		},
		{
			Method:     http.MethodPatch,
			Path:       "/events/{id}",
			Handler:    h.PatchEvent,
			Middleware: []core_http_middleware.Middleware{auth},
		},
	}
}
