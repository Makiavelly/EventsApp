package core_http_request

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
	"github.com/go-playground/validator/v10"
)

var (
	requestValidator = validator.New()
	emailRegex       = regexp.MustCompile(
		`(?i)^[^@\s]+@(mail\.ru|gmail\.com)$`,
	)
)

func init() {
	err := requestValidator.RegisterValidation(
		"allowed_email",
		func(fl validator.FieldLevel) bool {
			return emailRegex.MatchString(fl.Field().String())
		},
	)
	if err != nil {
		panic(err)
	}
}

type validatable interface {
	Validate() error
}

func DecodeAndValidateRequest(r *http.Request, dest any) error {
	if err := json.NewDecoder(r.Body).Decode(dest); err != nil {
		return fmt.Errorf("decode json: %v: %w", err, core_errors.ErrInvalidArgument)
	}

	var (
		err error
	)

	v, ok := dest.(validatable)
	if ok {
		err = v.Validate()
	} else {
		err = requestValidator.Struct(dest)
	}

	if err != nil {
		return fmt.Errorf("request validation: %v: %w", err, core_errors.ErrInvalidArgument)
	}

	return nil
}
