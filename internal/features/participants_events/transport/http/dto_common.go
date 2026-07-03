package participants_transport_http

import "github.com/Makiavelly/EventsApp/internal/core/domain"

type ParticipantDTOResponse struct {
	EventID       int    `json:"event_id"       example:"1"`
	ParticipantID int    `json:"participant_id" example:"1"`
	Status        string `json:"status"         example:"planned"`
}

func participantDTOFromDomain(participant domain.Participant) ParticipantDTOResponse {
	return ParticipantDTOResponse{
		EventID:       participant.EventID,
		ParticipantID: participant.ParticipantID,
		Status:        participant.Status,
	}
}

// func participantsDTOsFromDomains(participantsDomains []domain.Participant) []ParticipantDTOResponse {
// 	participantsDTO := make([]ParticipantDTOResponse, len(participantsDomains))

// 	for i, participant := range participantsDomains {
// 		participantsDTO[i] = participantDTOFromDomain(participant)
// 	}

// 	return participantsDTO
// }

type UserDTOResponse struct {
	ID       int    `json:"id"       example:"1"`
	Name     string `json:"name"     example:"Alex"`
	Email    string `json:"email"    example:"alex@mail.ru"`
	Password string `json:"password" exapmle:"alexpswd"`
}

func userDTOFromDomain(user domain.User) UserDTOResponse {
	return UserDTOResponse{
		ID:       user.ID,
		Name:     user.Name,
		Email:    user.Email,
		Password: user.Password,
	}
}

func usersDTOsFromDomains(users []domain.User) []UserDTOResponse {
	usersDTO := make([]UserDTOResponse, len(users))

	for i, user := range users {
		usersDTO[i] = userDTOFromDomain(user)
	}

	return usersDTO
}

type EventParticipantsDTOResponse struct {
	EventID int               `json:"event_id" example:"1"`
	Users   []UserDTOResponse `json:"users"`
}

func eventParticipantsDTOFromDomain(
	eventParticipants domain.EventParticipants,
) EventParticipantsDTOResponse {
	return EventParticipantsDTOResponse{
		EventID: eventParticipants.EventID,
		Users:   usersDTOsFromDomains(eventParticipants.Users),
	}
}

func eventParticipantsDTOsFromDomains(
	eventParticipantsDomains []domain.EventParticipants,
) []EventParticipantsDTOResponse {
	eventParticipantsDTOs := make(
		[]EventParticipantsDTOResponse,
		len(eventParticipantsDomains),
	)

	for i, eventParticipants := range eventParticipantsDomains {
		eventParticipantsDTOs[i] = eventParticipantsDTOFromDomain(eventParticipants)
	}

	return eventParticipantsDTOs
}
