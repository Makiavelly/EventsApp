package core_http_request

import (
	"errors"
	"net/http/httptest"
	"strings"
	"testing"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

type decodeTestRequest struct {
	Name string `json:"name"`
}

func (r *decodeTestRequest) Validate() error {
	if r.Name == "invalid" {
		return errors.New("invalid name")
	}
	return nil
}

func TestDecodeAndValidateRequest(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		body      string
		wantError error
	}{
		{name: "valid", body: `{"name":"Alex"}`},
		{name: "unknown field", body: `{"name":"Alex","admin":true}`, wantError: core_errors.ErrInvalidArgument},
		{name: "trailing value", body: `{"name":"Alex"} {}`, wantError: core_errors.ErrInvalidArgument},
		{name: "validation", body: `{"name":"invalid"}`, wantError: core_errors.ErrInvalidArgument},
		{
			name:      "too large",
			body:      `{"name":"` + strings.Repeat("a", MaxRequestBodyBytes) + `"}`,
			wantError: core_errors.ErrPayloadTooLarge,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			request := httptest.NewRequest("POST", "/", strings.NewReader(test.body))
			var destination decodeTestRequest
			err := DecodeAndValidateRequest(request, &destination)
			if test.wantError == nil && err != nil {
				t.Fatalf("DecodeAndValidateRequest() error = %v", err)
			}
			if test.wantError != nil && !errors.Is(err, test.wantError) {
				t.Fatalf("DecodeAndValidateRequest() error = %v, want %v", err, test.wantError)
			}
		})
	}
}
