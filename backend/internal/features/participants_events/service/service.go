package participants_service

import (
	"context"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

type ParticipantsService struct {
	participantsRepository ParticipantsRepository
}

func NewParticipantService(participantsRepository ParticipantsRepository) *ParticipantsService {
	return &ParticipantsService{participantsRepository: participantsRepository}
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

	PatchParticipant(
		ctx context.Context,
		eventID int,
		participantID int,
		participant domain.Participant,
	) (domain.Participant, error)
}
