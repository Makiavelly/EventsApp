package participants_service

import (
	"context"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

type ParticipantsService struct {
	participantsRepository ParticipantsRepository
}

func NewParticipantService(participantsRepositury ParticipantsRepository) *ParticipantsService {
	return &ParticipantsService{participantsRepository: participantsRepositury}
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
	) ([]domain.EventParticipants, error)

	PatchParticipant(
		ctx context.Context,
		eventID int,
		participantID int,
		participant domain.Participant,
	) (domain.Participant, error)
}
