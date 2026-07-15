package users_transport_http

import "github.com/Makiavelly/EventsApp/internal/core/domain"

type UserDTOResponse struct {
	ID    int    `json:"id"       example:"1"`
	Name  string `json:"name"     example:"Alex"`
	Email string `json:"email"    example:"alex@mail.ru"`
}

func userDTOFromDomain(user domain.User) UserDTOResponse {
	return UserDTOResponse{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
	}
}

func usersDTOFromDomains(users []domain.User) []UserDTOResponse {
	usersDTO := make([]UserDTOResponse, len(users))

	for i, user := range users {
		usersDTO[i] = userDTOFromDomain(user)
	}

	return usersDTO
}
