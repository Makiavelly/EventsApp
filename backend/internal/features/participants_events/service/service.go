package participants_service

import (
	"context"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

type ParticipantsService struct {
	participantsRepository ParticipantsRepository
	eventsReader           EventsReader
}

func NewParticipantService(
	participantsRepository ParticipantsRepository,
	eventsReader EventsReader,
) *ParticipantsService {
	return &ParticipantsService{
		participantsRepository: participantsRepository,
		eventsReader:           eventsReader,
	}
}

type EventsReader interface {
	GetEvent(ctx context.Context, id int) (domain.Event, error)
}

type ParticipantsRepository interface {
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
	) ([]domain.EventParticipant, error)
}
