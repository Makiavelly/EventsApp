package participants_postgres_repository

import "github.com/Makiavelly/EventsApp/internal/core/domain"

type ParticipantModel struct {
	EventID       int
	ParticipantID int
	Status        string
}

func participantDomainFromModel(model ParticipantModel) domain.Participant {
	return domain.NewParticipant(
		model.EventID,
		model.ParticipantID,
		model.Status,
	)
}

type EventParticipantModel struct {
	EventID       int
	ParticipantID int
	Name          string
	Status        string
}

func eventParticipantDomainFromModel(
	model EventParticipantModel,
) domain.EventParticipant {
	return domain.EventParticipant{
		EventID:       model.EventID,
		ParticipantID: model.ParticipantID,
		Name:          model.Name,
		Status:        model.Status,
	}
}
