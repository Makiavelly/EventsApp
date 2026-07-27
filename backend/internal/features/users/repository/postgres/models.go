package users_postgres_repository

import "github.com/Makiavelly/EventsApp/internal/core/domain"

type UserModel struct {
	ID    int
	Name  string
	Email string
}

type PublicUserModel struct {
	ID   int
	Name string
}

type UserAccountModel struct {
	UserModel
	PasswordHash string
}

func publicUserDomainsFromModels(users []PublicUserModel) []domain.PublicUser {
	userDomains := make([]domain.PublicUser, len(users))

	for i, user := range users {
		userDomains[i] = domain.NewPublicUser(
			user.ID,
			user.Name,
		)
	}

	return userDomains
}
