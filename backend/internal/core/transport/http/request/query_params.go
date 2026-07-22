package core_http_request

import (
	"fmt"
	"net/http"
	"strconv"

	core_errors "github.com/Makiavelly/EventsApp/internal/core/errors"
)

func GetIntQueryParam(r *http.Request, key string) (*int, error) {
	param := r.URL.Query().Get(key)
	if param == "" {
		return nil, nil
	}

	val, err := strconv.Atoi(param)
	if err != nil {
		return nil, fmt.Errorf(
			"param='%s' by key='%s' not a valid integer: %v: %w",
			param,
			key,
			err,
			core_errors.ErrInvalidArgument,
		)
	}

	return &val, nil
}

func GetFloatQueryParam(r *http.Request, key string) (*float64, error) {
	param := r.URL.Query().Get(key)
	if param == "" {
		return nil, nil
	}

	val, err := strconv.ParseFloat(param, 64)
	if err != nil {
		return nil, fmt.Errorf(
			"param='%s' by key='%s' not a valid float: %v: %w",
			param,
			key,
			err,
			core_errors.ErrInvalidArgument,
		)
	}

	return &val, nil
}

func GetBoolQueryParam(r *http.Request, key string) (*bool, error) {
	param := r.URL.Query().Get(key)
	if param == "" {
		return nil, nil
	}

	value, err := strconv.ParseBool(param)
	if err != nil {
		return nil, fmt.Errorf(
			"param='%s' by key='%s' not a valid boolean: %v: %w",
			param,
			key,
			err,
			core_errors.ErrInvalidArgument,
		)
	}

	return &value, nil
}

func GetPositiveIntQueryParam(r *http.Request, key string) (*int, error) {
	value, err := GetIntQueryParam(r, key)
	if err != nil {
		return nil, err
	}
	if value != nil && *value <= 0 {
		return nil, fmt.Errorf(
			"param by key='%s' must be positive: %w",
			key,
			core_errors.ErrInvalidArgument,
		)
	}

	return value, nil
}
