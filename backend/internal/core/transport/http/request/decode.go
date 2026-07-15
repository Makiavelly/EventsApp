package core_http_request

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

const MaxRequestBodyBytes = 1 << 20

type validatable interface {
	Validate() error
}

func DecodeAndValidateRequest(r *http.Request, dest any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, MaxRequestBodyBytes)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(dest); err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			return fmt.Errorf(
				"request body exceeds %d bytes: %w",
				maxBytesError.Limit,
				core_errors.ErrPayloadTooLarge,
			)
		}

		return fmt.Errorf("decode json: %v: %w", err, core_errors.ErrInvalidArgument)
	}

	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return fmt.Errorf(
			"request body must contain exactly one JSON value: %w",
			core_errors.ErrInvalidArgument,
		)
	}

	if value, ok := dest.(validatable); ok {
		if err := value.Validate(); err != nil {
			return fmt.Errorf(
				"request validation: %v: %w",
				err,
				core_errors.ErrInvalidArgument,
			)
		}
	}

	return nil
}
