package users_postgres_repository

import "github.com/Makiavelly/EventsApp/internal/core/domain"

type UserModel struct {
	ID       int
	Name     string
	Email    string
	Password string
}

func userDomainsFromModels(users []UserModel) []domain.User {
	userDomains := make([]domain.User, len(users))

	for i, user := range users {
		userDomains[i] = domain.NewUser(
			user.ID,
			user.Name,
			user.Email,
			user.Password,
		)
	}

	return userDomains
}
