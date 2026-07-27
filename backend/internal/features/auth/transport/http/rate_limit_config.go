package auth_transport_http

import (
	"fmt"
	"net/netip"
	"os"
	"strconv"
	"strings"
	"time"
)

type RateLimitConfig struct {
	Requests       int
	Window         time.Duration
	TrustedProxies []netip.Prefix
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

	trustedProxies, err := parseTrustedProxies(
		os.Getenv("AUTH_RATE_LIMIT_TRUSTED_PROXIES"),
	)
	if err != nil {
		return RateLimitConfig{}, err
	}

	return RateLimitConfig{
		Requests:       requests,
		Window:         window,
		TrustedProxies: trustedProxies,
	}, nil
}

func parseTrustedProxies(value string) ([]netip.Prefix, error) {
	if strings.TrimSpace(value) == "" {
		return nil, nil
	}

	parts := strings.Split(value, ",")
	trustedProxies := make([]netip.Prefix, 0, len(parts))
	for _, part := range parts {
		candidate := strings.TrimSpace(part)
		if candidate == "" {
			return nil, fmt.Errorf(
				"AUTH_RATE_LIMIT_TRUSTED_PROXIES contains an empty entry",
			)
		}

		prefix, err := netip.ParsePrefix(candidate)
		if err != nil {
			address, addressErr := netip.ParseAddr(candidate)
			if addressErr != nil {
				return nil, fmt.Errorf(
					"AUTH_RATE_LIMIT_TRUSTED_PROXIES contains invalid IP or CIDR %q",
					candidate,
				)
			}
			prefix = netip.PrefixFrom(address, address.BitLen())
		}

		trustedProxies = append(trustedProxies, prefix.Masked())
	}

	return trustedProxies, nil
}

func NewRateLimitConfigMust() RateLimitConfig {
	config, err := NewRateLimitConfig()
	if err != nil {
		panic(fmt.Errorf("get auth rate limit config: %w", err))
	}

	return config
}
