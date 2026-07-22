package participants_transport_http

import "github.com/Makiavelly/EventsApp/internal/core/domain"

type ParticipantDTOResponse struct {
	EventID       int `json:"event_id"       example:"1"`
	ParticipantID int `json:"participant_id" example:"1"`
}

func participantDTOFromDomain(participant domain.Participant) ParticipantDTOResponse {
	return ParticipantDTOResponse{
		EventID:       participant.EventID,
		ParticipantID: participant.ParticipantID,
	}
}

type EventParticipantDTOResponse struct {
	EventID       int    `json:"event_id"       example:"1"`
	ParticipantID int    `json:"participant_id" example:"2"`
	Name          string `json:"name"           example:"Alex"`
}

func eventParticipantDTOFromDomain(
	participant domain.EventParticipant,
) EventParticipantDTOResponse {
	return EventParticipantDTOResponse{
		EventID:       participant.EventID,
		ParticipantID: participant.ParticipantID,
		Name:          participant.Name,
	}
}

func eventParticipantDTOsFromDomains(
	participants []domain.EventParticipant,
) []EventParticipantDTOResponse {
	dtos := make([]EventParticipantDTOResponse, len(participants))
	for i, participant := range participants {
		dtos[i] = eventParticipantDTOFromDomain(participant)
	}

	return dtos
}
