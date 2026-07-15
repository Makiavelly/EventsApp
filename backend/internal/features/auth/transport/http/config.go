package auth_transport_http

import (
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
)

const refreshCookiePath = "/api/v1/auth"

type CookieConfig struct {
	Name     string
	Domain   string
	Secure   bool
	SameSite http.SameSite
}

func NewCookieConfig() (CookieConfig, error) {
	name := os.Getenv("AUTH_REFRESH_COOKIE_NAME")
	if name == "" {
		name = "eventsapp_refresh"
	}
	if err := (&http.Cookie{Name: name, Value: "validation"}).Valid(); err != nil {
		return CookieConfig{}, fmt.Errorf("invalid AUTH_REFRESH_COOKIE_NAME: %w", err)
	}

	secure := false
	if value := os.Getenv("AUTH_REFRESH_COOKIE_SECURE"); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err != nil {
			return CookieConfig{}, fmt.Errorf("parse AUTH_REFRESH_COOKIE_SECURE: %w", err)
		}
		secure = parsed
	}

	sameSite, err := parseSameSite(os.Getenv("AUTH_REFRESH_COOKIE_SAME_SITE"))
	if err != nil {
		return CookieConfig{}, err
	}
	if sameSite == http.SameSiteNoneMode && !secure {
		return CookieConfig{}, fmt.Errorf("AUTH_REFRESH_COOKIE_SECURE must be true when SameSite=None")
	}
	if strings.HasPrefix(name, "__Secure-") && !secure {
		return CookieConfig{}, fmt.Errorf("AUTH_REFRESH_COOKIE_SECURE must be true for a __Secure- cookie")
	}
	if strings.HasPrefix(name, "__Host-") {
		return CookieConfig{}, fmt.Errorf("__Host- cookie names are incompatible with the restricted refresh cookie path")
	}

	return CookieConfig{
		Name:     name,
		Domain:   os.Getenv("AUTH_REFRESH_COOKIE_DOMAIN"),
		Secure:   secure,
		SameSite: sameSite,
	}, nil
}

func NewCookieConfigMust() CookieConfig {
	config, err := NewCookieConfig()
	if err != nil {
		panic(fmt.Errorf("get auth cookie config: %w", err))
	}

	return config
}

func parseSameSite(value string) (http.SameSite, error) {
	switch strings.ToLower(value) {
	case "", "strict":
		return http.SameSiteStrictMode, nil
	case "lax":
		return http.SameSiteLaxMode, nil
	case "none":
		return http.SameSiteNoneMode, nil
	default:
		return http.SameSiteDefaultMode, fmt.Errorf(
			"AUTH_REFRESH_COOKIE_SAME_SITE must be strict, lax, or none: %q",
			value,
		)
	}
}
