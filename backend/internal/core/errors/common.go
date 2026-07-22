package core_errors

import "errors"

var (
	ErrNotFound        = errors.New("not found")
	ErrInvalidArgument = errors.New("invalid argument")
	ErrConflict        = errors.New("conflict")
	ErrUnauthorized    = errors.New("unauthorized")
	ErrForbidden       = errors.New("forbidden")
	ErrPayloadTooLarge = errors.New("payload too large")
	ErrTooManyRequests = errors.New("too many requests")
	ErrUnavailable     = errors.New("service unavailable")
)
