package participants_transport_http

import (
	"context"
	"net/http"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
	core_http_middleware "github.com/Makiavelly/EventsApp/internal/core/transport/http/middleware"
	core_http_server "github.com/Makiavelly/EventsApp/internal/core/transport/http/server"
)

type ParticipantsHTTPHandler struct {
	participantsService ParticipantsService
}

func NewParticipantsHTTPHandler(participantsService ParticipantsService) *ParticipantsHTTPHandler {
	return &ParticipantsHTTPHandler{
		participantsService: participantsService,
	}
}

type ParticipantsService interface {
	CreateParticipant(
		ctx context.Context,
		participant domain.Participant,
	) (domain.Participant, error)

	DeleteParticipant(
		ctx context.Context,
		eventID int,
		participantID int,
	) error

	GetParticipants(
		ctx context.Context,
		eventID *int,
		limit *int,
		offset *int,
	) ([]domain.EventParticipants, error)

	PatchParticipant(
		ctx context.Context,
		eventID int,
		participantID int,
		participant domain.Participant,
	) (domain.Participant, error)
}

func (h *ParticipantsHTTPHandler) Routes(auth core_http_middleware.Middleware) []core_http_server.Route {
	return []core_http_server.Route{
		{
			Method:     http.MethodPost,
			Path:       "/participants",
			Handler:    h.CreateParticipant,
			Middleware: []core_http_middleware.Middleware{auth},
		},
		{
			Method:  http.MethodGet,
			Path:    "/participants",
			Handler: h.GetParticipantsEvents,
		},
		{
			Method:     http.MethodDelete,
			Path:       "/participants",
			Handler:    h.DeleteParticipant,
			Middleware: []core_http_middleware.Middleware{auth},
		},
		{
			Method:     http.MethodPatch,
			Path:       "/participants",
			Handler:    h.PatchParticipant,
			Middleware: []core_http_middleware.Middleware{auth},
		},
	}
}
