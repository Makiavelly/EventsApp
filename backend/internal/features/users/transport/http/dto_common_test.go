package users_transport_http

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/Makiavelly/EventsApp/internal/core/domain"
)

func TestPublicUserResponseDoesNotContainPrivateFields(t *testing.T) {
	t.Parallel()

	response := userDTOFromDomain(domain.NewPublicUser(1, "Alex"))
	encoded, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}

	body := string(encoded)
	if body != `{"id":1,"name":"Alex"}` {
		t.Fatalf("public response = %s", body)
	}
	if strings.Contains(body, "email") || strings.Contains(body, "password") {
		t.Fatalf("public response contains a private field: %s", body)
	}
}

func TestPrivateSelfResponseKeepsEmail(t *testing.T) {
	t.Parallel()

	response := privateUserDTOFromDomain(
		domain.NewUser(1, "Alex", "alex@gmail.com"),
	)
	encoded, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("json.Marshal() error = %v", err)
	}

	if got := string(encoded); got != `{"id":1,"name":"Alex","email":"alex@gmail.com"}` {
		t.Fatalf("private response = %s", got)
	}
}
