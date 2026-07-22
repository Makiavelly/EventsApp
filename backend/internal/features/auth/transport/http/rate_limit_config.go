package auth_transport_http

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type RateLimitConfig struct {
	Requests   int
	Window     time.Duration
	TrustProxy bool
}

func NewRateLimitConfig() (RateLimitConfig, error) {
	requests := 10
	if value := os.Getenv("AUTH_RATE_LIMIT_REQUESTS"); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed <= 0 {
			return RateLimitConfig{}, fmt.Errorf(
				"AUTH_RATE_LIMIT_REQUESTS must be a positive integer: %q",
				value,
			)
		}
		requests = parsed
	}

	window := time.Minute
	if value := os.Getenv("AUTH_RATE_LIMIT_WINDOW"); value != "" {
		parsed, err := time.ParseDuration(value)
		if err != nil || parsed <= 0 {
			return RateLimitConfig{}, fmt.Errorf(
				"AUTH_RATE_LIMIT_WINDOW must be a positive Go duration: %q",
				value,
			)
		}
		window = parsed
	}

	trustProxy := false
	if value := os.Getenv("AUTH_RATE_LIMIT_TRUST_PROXY"); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err != nil {
			return RateLimitConfig{}, fmt.Errorf(
				"AUTH_RATE_LIMIT_TRUST_PROXY must be a boolean: %q",
				value,
			)
		}
		trustProxy = parsed
	}

	return RateLimitConfig{
		Requests:   requests,
		Window:     window,
		TrustProxy: trustProxy,
	}, nil
}

func NewRateLimitConfigMust() RateLimitConfig {
	config, err := NewRateLimitConfig()
	if err != nil {
		panic(fmt.Errorf("get auth rate limit config: %w", err))
	}

	return config
}
