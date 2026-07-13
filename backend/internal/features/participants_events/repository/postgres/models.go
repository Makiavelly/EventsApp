package participants_postgres_repository

import "github.com/Makiavelly/EventsApp/internal/core/domain"

type ParticipantModel struct {
	EventID       int
	ParticipantID int
	Status        string
}

func participantDomainFromModel(
	participantModel ParticipantModel,
) domain.Participant {
	return domain.NewParticipant(
		participantModel.EventID,
		participantModel.ParticipantID,
		participantModel.Status,
	)
}

func participantsDomainsFromModels(
	participantsModels []ParticipantModel,
) []domain.Participant {
	participants := make([]domain.Participant, len(participantsModels))

	for i, participantModel := range participantsModels {
		participants[i] = participantDomainFromModel(participantModel)
	}

	return participants
}

type UserModel struct {
	ID       int
	Name     string
	Email    string
	Password string
}

type EventParticipantUserModel struct {
	EventID int
	User    UserModel
}

func userDomainFromModel(user UserModel) domain.User {
	return domain.NewUser(
		user.ID,
		user.Name,
		user.Email,
		user.Password,
	)
}

func userDomainsFromModels(users []UserModel) []domain.User {
	userDomains := make([]domain.User, len(users))

	for i, user := range users {
		userDomains[i] = userDomainFromModel(user)
	}

	return userDomains
}
